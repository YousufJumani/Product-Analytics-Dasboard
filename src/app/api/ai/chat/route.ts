/**
 * AI Copilot — POST /api/ai/chat
 *
 * CONCEPT — Retrieval-Augmented Generation (simplified):
 *  The AI is given a "system prompt" that includes the org's current metrics
 *  context (MRR, churn, growth). This is the "retrieval" part — we fetch
 *  live data from our DB and inject it into the prompt so GPT can reason
 *  about the founder's actual numbers, not hallucinated examples.
 *
 * STREAMING: We use OpenAI's streaming mode and Next.js ReadableStream to
 * stream tokens to the client as they're generated. This gives the UX feeling
 * of watching the AI "think" — much better than a 3-second blank response.
 *
 * HOW STREAMING WORKS:
 *  openai.chat.completions.create({ stream: true }) → returns an async iterator
 *  We feed each chunk into a ReadableStream, encode as SSE (Server-Sent Events)
 *  The client reads chunks via fetch() with a ReadableStreamDefaultReader.
 *
 * RBAC: Only ANALYST and ORG_ADMIN can use the copilot.
 *
 * CONTEXT INJECTION: The system prompt contains the last 30-day summary.
 * This is a simplified RAG — production would use vector search over tickets,
 * support logs, and experiment results.
 */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseCopilot } from "@/lib/rbac";
import { withCache } from "@/lib/cache";
import { log } from "@/lib/logger";
import { subDays, startOfDay } from "date-fns";
import { z } from "zod";

export const dynamic = "force-dynamic";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({ apiKey });
}

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

async function getMetricContext(orgId: string): Promise<string> {
  return withCache(`ai-context:${orgId}`, async () => {
    const since = startOfDay(subDays(new Date(), 30));
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { orgId, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (snapshots.length === 0) return "No metric data available yet.";

    const latest = snapshots[snapshots.length - 1];
    const earliest = snapshots[0];
    const totalChurn = snapshots.reduce((s, r) => s + r.churnedMrr, 0);
    const totalNew = snapshots.reduce((s, r) => s + r.newMrr, 0);
    const avgChurnRate =
      earliest.mrr > 0 ? ((totalChurn / 30 / earliest.mrr) * 100 * 30).toFixed(1) : "0";

    return `
CURRENT METRICS (last 30 days):
- MRR: $${latest.mrr.toFixed(0)} (was $${earliest.mrr.toFixed(0)} 30 days ago, ${
      latest.mrr >= earliest.mrr ? "+" : ""
    }${(((latest.mrr - earliest.mrr) / earliest.mrr) * 100).toFixed(1)}% growth)
- ARR: $${latest.arr.toFixed(0)}
- Active Users: ${latest.activeUsers} (Trial: ${latest.trialUsers})
- New MRR this period: $${totalNew.toFixed(0)}
- Churned MRR this period: $${totalChurn.toFixed(0)}
- Estimated Monthly Churn Rate: ${avgChurnRate}%
- Net New MRR: $${(totalNew - totalChurn).toFixed(0)}
- GitHub Commits (latest day): ${latest.commits}
- Open PRs (latest): ${latest.openPRs}
`.trim();
  }, 120); // 2-minute cache for AI context
}

export async function POST(req: NextRequest) {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    const body = await req.json().catch(() => ({ message: "" }));
    const userMessage = typeof body?.message === "string" ? body.message : "";
    const demoText = `Based on demo metrics, MRR is trending up with healthy net new MRR. Focus on reducing churn for trial users and double down on acquisition channels that drove the last 30-day growth. You asked: "${userMessage}"`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const words = demoText.split(" ");
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `${word} ` })}\n\n`));
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const session = await auth();
  if (!session?.user?.activeOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseCopilot(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden: VIEWER role cannot use AI copilot" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, history = [] } = parsed.data;
  const orgId = session.user.activeOrgId;

  const metricsContext = await getMetricContext(orgId);

  const systemPrompt = `You are an expert SaaS growth advisor and analytics copilot embedded in a founder dashboard.
You have access to the following LIVE metrics for this organization:

${metricsContext}

Your job is to:
1. Answer questions about the metrics above clearly and specifically
2. Identify trends, risks, and opportunities
3. Suggest concrete, actionable next steps
4. Be direct — founders are busy. No filler phrases.

If asked about data you don't have, say so honestly rather than fabricating numbers.
Always ground your insights in the data provided above.`;

  // Persist user message
  await prisma.chatMessage.create({
    data: { orgId, userId: session.user.id, role: "USER", content: message },
  });

  log.info("AI copilot request", { orgId, userId: session.user.id, messageLen: message.length });

  // Build messages array for OpenAI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        const client = getOpenAIClient();
        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages,
          stream: true,
          max_tokens: 800,
          temperature: 0.4,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullResponse += text;
            // Server-Sent Events format: "data: {json}\n\n"
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Persist assistant response
        await prisma.chatMessage.create({
          data: { orgId, role: "ASSISTANT", content: fullResponse },
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        log.error("OpenAI streaming error", { error: String(err) });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
