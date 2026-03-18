/**
 * Stripe Integration Library
 *
 * CONCEPT — Stripe as a SaaS metrics source:
 *  Stripe is the single source of truth for revenue data. Instead of building
 *  a manual MRR tracking system, we pull events directly from Stripe:
 *
 *  - customer.subscription.created → new MRR
 *  - customer.subscription.deleted → churned MRR
 *  - customer.subscription.updated → expansion/contraction MRR
 *
 * WHY WEBHOOKS + SYNC instead of just polling:
 *  - Webhooks give real-time updates (sub-second latency)
 *  - Polling is a backup for missed webhooks or initial data load
 *  - Together they ensure zero missed events
 *
 * SECURITY: Stripe signatures are verified with HMAC-SHA256 using the
 * webhook secret. Never skip this check — it prevents anyone from POSTing
 * fake revenue data to your webhook endpoint.
 */
import Stripe from "stripe";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export interface StripeMrrData {
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  expansionMrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
}

/**
 * Calculate current MRR from active Stripe subscriptions.
 * In production, this is called during a STRIPE_SYNC job.
 */
export async function calculateCurrentMrr(): Promise<StripeMrrData> {
  const stripe = getStripeClient();
  let mrr = 0;
  let activeSubscriptions = 0;
  let trialSubscriptions = 0;

  // Paginate all active subscriptions
  for await (const subscription of stripe.subscriptions.list({
    status: "active",
    expand: ["data.items.data.price"],
    limit: 100,
  })) {
    activeSubscriptions++;
    for (const item of subscription.items.data) {
      const price = item.price;
      if (!price.unit_amount) continue;

      // Normalize to monthly: annual plans divide by 12
      const monthly =
        price.recurring?.interval === "year"
          ? (price.unit_amount * item.quantity!) / 12
          : price.unit_amount * item.quantity!;

      mrr += monthly / 100; // Stripe amounts in cents
    }
  }

  // Count trials
  for await (const sub of stripe.subscriptions.list({ status: "trialing", limit: 100 })) {
    trialSubscriptions++;
    void sub; // just counting
  }

  return {
    mrr: Math.round(mrr * 100) / 100,
    newMrr: 0, // Computed from event log over time period
    churnedMrr: 0,
    expansionMrr: 0,
    activeSubscriptions,
    trialSubscriptions,
  };
}

/**
 * Verify Stripe webhook signature.
 * Returns parsed event or throws on invalid signature.
 */
export function constructStripeEvent(
  body: string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(body, signature, secret);
}
