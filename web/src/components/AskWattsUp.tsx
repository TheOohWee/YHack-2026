"use client";

import { Send, X, Zap, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

function AssistantBubbleText({ content }: { content: string }) {
  const blocks = content
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocks.length <= 1) {
    return <span className="block whitespace-pre-line">{content}</span>;
  }
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <p key={i} className="m-0 whitespace-pre-line leading-relaxed">
          {block}
        </p>
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "Should I run my dishwasher now or wait?",
  "When is the cheapest time to do laundry today?",
  "How clean is the grid right now?",
  "How much carbon have I saved?",
];

export function AskWattsUp({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = { role: "user", content: trimmed };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, userId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setMessages([
            ...newMessages,
            { role: "assistant", content: `Sorry, something went wrong: ${err.error || res.statusText}` },
          ]);
          return;
        }

        const data = await res.json();
        setMessages([...newMessages, data.message]);
      } catch {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, userId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ask-wattsup-fab"
        aria-label="Ask WattsUp AI"
      >
        <Zap className="h-6 w-6" />
        <span className="ask-wattsup-fab-label">Ask WattsUp</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ask-wattsup-panel">
          {/* Header */}
          <div className="ask-wattsup-header">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-semibold text-base">Ask WattsUp</span>
              <span className="ask-wattsup-badge">Fast chat</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ask-wattsup-close"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="ask-wattsup-messages">
            {messages.length === 0 && !loading && (
              <div className="ask-wattsup-welcome">
                <div className="ask-wattsup-welcome-icon">
                  <Zap className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <p className="text-base font-medium text-[var(--text)]">
                  Hi! I&apos;m WattsUp AI.
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  I reason over your live grid data to help you save money and cut carbon. Try asking:
                </p>
                <div className="ask-wattsup-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="ask-wattsup-suggestion"
                      onClick={() => void send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ask-wattsup-msg-user"
                    : "ask-wattsup-msg-assistant"
                }
              >
                {m.role === "assistant" && (
                  <div className="ask-wattsup-msg-avatar">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "ask-wattsup-bubble-user"
                      : "ask-wattsup-bubble-assistant"
                  }
                >
                  {m.role === "assistant" ? (
                    <AssistantBubbleText content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ask-wattsup-msg-assistant">
                <div className="ask-wattsup-msg-avatar">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div className="ask-wattsup-bubble-assistant">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)] ml-2">
                    Checking live grid data...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="ask-wattsup-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your energy..."
              className="ask-wattsup-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="ask-wattsup-send"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
