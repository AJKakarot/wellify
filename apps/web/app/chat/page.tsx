"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type { ChatDebug } from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { PageLoader } from "../components/Skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
  debug?: ChatDebug;
  timestamp: Date;
}

const SUGGESTIONS = [
  "How's my protein intake this week?",
  "What patterns do you see in my diet?",
  "Am I drinking enough water?",
  "Suggest improvements for my nutrition",
];

export default function ChatPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const client = createApiClient(window.location.origin, { credentials: "include" });
        const session = await client.getSession();
        if (!session) { router.replace("/"); return; }
        setUser(session.user);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setInput("");
    setSending(true);

    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const res = await client.createChat(text);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, debug: res.debug, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm sorry, I couldn't process that right now. Please try again.", timestamp: new Date() }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface flex flex-col">
      <Header
        user={user}
        trailing={
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">AI Coach</span>
          </div>
        }
      />

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-48">
        <div className="max-w-4xl mx-auto px-6">
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="pt-16 pb-8">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-[1.5rem] bg-primary-gradient mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2">Your Wellness Companion</p>
                <h2 className="text-4xl font-extrabold tracking-tight text-primary mb-3">Ask Me Anything.</h2>
                <p className="text-stone-400 max-w-md mx-auto leading-relaxed">
                  I have context from your health logs, meals, and patterns. Ask me about your nutrition, habits, or get personalized advice.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="text-left bg-white/80 rounded-2xl p-4 hover:bg-white transition-all group">
                    <p className="text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">{s}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6 py-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${msg.role === "user" ? "" : "flex gap-3"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className={`rounded-[1.25rem] px-5 py-3.5 ${msg.role === "user" ? "bg-primary-gradient text-white" : "bg-white/80"}`}>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "assistant" ? "text-on-surface" : ""}`}>{msg.content}</p>
                    </div>
                    {msg.debug && (
                      <div className="flex gap-3 mt-2 ml-1">
                        <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">{msg.debug.factsUsed} facts</span>
                        <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">{msg.debug.logsUsed} logs</span>
                        {msg.debug.hasSummary && <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">+ summary</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="bg-white/80 rounded-[1.25rem] px-5 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-24 left-0 w-full z-40 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_-4px_30px_rgb(0,0,0,0.06)] p-3 flex items-end gap-3">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none resize-none max-h-32 leading-relaxed"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your health data..."
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center text-white flex-shrink-0 disabled:opacity-30 hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="chat" />
    </div>
  );
}
