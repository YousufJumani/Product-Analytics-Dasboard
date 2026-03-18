"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Why did our churn spike recently?",
  "How is our MRR growth trend?",
  "What should I focus on to improve retention?",
  "Compare our new MRR vs churned MRR",
  "Is our trial conversion rate healthy?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm your Analytics Copilot. I have access to your live metrics — MRR, user growth, churn, and development velocity.\n\nAsk me anything: \"Why did churn spike?\" or \"What's driving our growth?\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || streaming) return;

    setInput("");
    const userMsg: Message = { role: "user", content: messageText };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0);

    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Error: ${err.error ?? "Failed to get response"}` },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: accumulated },
                  ]);
                }
              } catch {
                // Partial JSON chunk — skip
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `Connection error: ${String(err)}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="gradient-text">AI Copilot</span>
            <span className="badge badge-info text-[10px]">GPT-4o-mini</span>
          </h1>
          <p className="text-secondary-color text-sm mt-1">
            Ask questions about your metrics — grounded in live data
          </p>
        </div>
        <button onClick={() => setMessages([{ role: "assistant", content: "Chat cleared. What would you like to analyze?" }])}
          className="btn-ghost text-xs">
          Clear chat
        </button>
      </div>

      {/* How it works banner */}
      <div className="glass-panel px-4 py-3 mb-4 flex-shrink-0 text-xs text-secondary-color">
        <span className="text-brand font-medium">How it works: </span>
        Your live MRR, churn, and user stats are injected into every request as context.
        GPT-4o-mini reasons over your actual numbers, not generic examples.
        Responses stream in real-time via Server-Sent Events.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
                </svg>
              </div>
            )}
            <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}>
              {msg.content || (streaming && i === messages.length - 1 ? (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "...")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && !streaming && (
        <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--brand-light)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 flex gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your metrics... (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="input-glass flex-1 resize-none"
          disabled={streaming}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || streaming}
          className="btn-primary flex-shrink-0 self-end px-4 py-3">
          {streaming ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
