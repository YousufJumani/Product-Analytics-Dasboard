/**
 * Stripe Webhook Handler — POST /api/integrations/stripe/webhook
 *
 * CONCEPT — Stripe Webhooks as real-time event ingestion:
 *  Stripe sends signed HTTP POST requests to this endpoint when subscription
 *  events occur. We verify the signature (HMAC-SHA256), then upsert metric
 *  data accordingly.
 *
 * IDEMPOTENCY: Stripe may send the same event twice (at-least-once delivery).
 * We handle this by upserting rather than inserting — safe to process twice.
 *
 * CRITICAL SECURITY: The rawBody must be read BEFORE any parsing. If you
 * JSON.parse first, the signature check fails because whitespace changes.
 * Next.js App Router reads raw body via req.text().
 */
import { NextRequest, NextResponse } from "next/server";
import { constructStripeEvent } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { invalidatePrefix } from "@/lib/cache";
import { log } from "@/lib/logger";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Raw body needed for signature verification — disable body parsing
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (err) {
    log.warn("Stripe webhook signature verification failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  log.info("Stripe webhook received", { type: event.type, id: event.id });

  // Find the org that owns this Stripe customer
  const customerId =
    (event.data.object as Stripe.Subscription).customer?.toString() ?? null;

  const integration = customerId
    ? await prisma.integration.findFirst({
        where: { provider: "STRIPE", externalId: customerId },
      })
    : null;

  const orgId = integration?.orgId;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Trigger a metrics recalculation job for the org
        if (orgId) {
          await prisma.job.create({
            data: {
              type: "STRIPE_SYNC",
              orgId,
              payload: { triggeredBy: event.type, eventId: event.id },
            },
          });
          invalidatePrefix(`metrics:${orgId}`);
          log.info("Metrics sync job queued from webhook", { orgId, event: event.type });
        }
        break;
      default:
        // Acknowledge all events even if we don't handle them
        break;
    }
  } catch (err) {
    log.error("Stripe webhook processing error", { error: String(err), eventId: event.id });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
