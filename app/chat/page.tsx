"use client"

import { useState, useRef, useEffect } from "react"
import type { Message } from "@/lib/types"
import { getLogs } from "@/lib/workout-data"
import {
  IcoBot,
  IcoDatabase,
  IcoSend,
  IcoSparkle,
  IcoTrash,
  IcoUser,
  IcoWarning,
} from "@/components/AppIcons"

const MAX_CHARS    = 1000
const MAX_MESSAGES = 20
const WARN_AT      = 16
const MAX_CLIENT_LOGS = 60
const MAX_CLIENT_LOG_EXERCISES = 30
const MAX_CLIENT_LOG_SETS = 12

const SUGGESTIONS = [
  "What did I train today?",
  "Should I increase my weight this week?",
  "What should I eat after today's workout?",
  "My legs are sore — can I still train?",
  "How do I know if my squat form is good?",
  "I missed 3 days — how do I get back on track?",
]

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--text-muted)", display: "inline-block",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: isUser ? "var(--bg-elevated)" : "var(--accent-dim)",
        border: `0.5px solid ${isUser ? "var(--border-default)" : "var(--accent-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: isUser ? "var(--text-secondary)" : "var(--accent)", marginTop: 2,
      }}>
        {isUser ? <IcoUser /> : <IcoBot />}
      </div>
      <div style={{
        maxWidth: "min(82%, 560px)",
        background: isUser ? "var(--accent)" : "var(--bg-surface)",
        border: isUser ? "none" : `0.5px solid ${message.error ? "rgba(220,60,60,0.3)" : "var(--border-subtle)"}`,
        borderRadius: isUser
          ? "var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)"
          : "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)",
        padding: "10px 14px",
        color: isUser ? "#fff" : message.error ? "#f87171" : "var(--text-primary)",
        fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {message.content}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState("")
  const [isLoading, setIsLoading]         = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading || trimmed.length > MAX_CHARS) return
    if (messages.filter(m => m.role === "user").length >= MAX_MESSAGES) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setShowSuggestions(false)
    setIsLoading(true)

    if (inputRef.current) inputRef.current.style.height = "auto"

    try {
      const clientLogs = getLogs()
        .slice(-MAX_CLIENT_LOGS)
        .map((log) => ({
          id: log.id,
          date: log.date,
          completedAt: log.completedAt,
          dayKey: log.dayKey,
          dayOverride: log.dayOverride,
          exercises: (log.exercises ?? []).slice(0, MAX_CLIENT_LOG_EXERCISES).map((exercise) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            sets: (exercise.sets ?? []).slice(0, MAX_CLIENT_LOG_SETS).map((set) => ({
              weightKg: set.weightKg,
              reps: set.reps,
              durationSeconds: set.durationSeconds,
            })),
          })),
        }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          clientLogs,
        }),
      })

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong. Please try again.",
          error: !res.ok && !data.reply,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Network error. Check your connection and try again.", error: true },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  function clearChat() { setMessages([]); setShowSuggestions(true) }

  const charCount       = input.length
  const isOverLimit     = charCount > MAX_CHARS
  const msgCount        = messages.filter(m => m.role === "user").length
  const isNearMsgLimit  = msgCount >= WARN_AT
  const isAtMsgLimit    = msgCount >= MAX_MESSAGES
  const isEmpty         = messages.length === 0
  const canSend         = input.trim().length > 0 && !isLoading && !isOverLimit && !isAtMsgLimit
  const hasServerContext = true

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - var(--nav-height))", paddingTop: 0 }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 0 14px", borderBottom: "0.5px solid var(--border-subtle)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <IcoBot />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>GainLog AI</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf7d", display: "inline-block" }} />
              <span style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, color: hasServerContext ? "var(--success)" : "var(--text-muted)",
                background: hasServerContext ? "var(--success-dim)" : "var(--bg-elevated)",
                border: `0.5px solid ${hasServerContext ? "rgba(76,175,125,0.3)" : "var(--border-subtle)"}`,
                borderRadius: 20, padding: "1px 7px",
              }}>
                <IcoDatabase />
                {hasServerContext ? "Profile + logs live" : "No context"}
              </span>
            </div>
          </div>
        </div>

        {!isEmpty && (
          <button onClick={clearChat} title="Clear chat"
            style={{ background: "none", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "inherit" }}>
            <IcoTrash /> Clear
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 16, scrollbarWidth: "none" }}>

        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", padding: "0 16px", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <IcoBot />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Your personal gym assistant</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300 }}>
                {hasServerContext
                  ? "I can see your live profile and logged workouts. Ask me anything."
                  : "I know your full program. Log a workout first and I can give personalized feedback."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 14px", maxWidth: 320, textAlign: "left" }}>
              <div style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}><IcoWarning /></div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Fitness and nutrition only. For injuries or medical concerns, please consult a doctor.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

        {isLoading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
              <IcoBot />
            </div>
            <div style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)", borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)", padding: "10px 14px" }}>
              <TypingDots />
            </div>
          </div>
        )}

        {isNearMsgLimit && !isAtMsgLimit && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", background: "rgba(232,87,42,0.08)", border: "0.5px solid var(--accent-border)", borderRadius: "var(--radius-md)" }}>
            <div style={{ color: "var(--accent)" }}><IcoWarning /></div>
            <p style={{ fontSize: 12, color: "var(--accent)" }}>{MAX_MESSAGES - msgCount} messages left in this session</p>
          </div>
        )}

        {isAtMsgLimit && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px", background: "rgba(232,87,42,0.08)", border: "0.5px solid var(--accent-border)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
            <div style={{ color: "var(--accent)" }}><IcoWarning /></div>
            <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>Session limit reached</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Clear the chat to start a new conversation.</p>
            <button onClick={clearChat} style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontSize: 12, fontWeight: 500, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}>
              Clear and start over
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestions ── */}
      {showSuggestions && isEmpty && (
        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <IcoSparkle />
            <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Try asking</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => sendMessage(s)}
                style={{ background: "var(--bg-surface)", border: "0.5px solid var(--border-default)", borderRadius: 20, color: "var(--text-secondary)", fontSize: 12, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", lineHeight: 1.4 }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      {!isAtMsgLimit && (
        <div style={{ flexShrink: 0, borderTop: "0.5px solid var(--border-subtle)", paddingTop: 12, paddingBottom: 8 }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            background: "var(--bg-surface)",
            border: `0.5px solid ${isOverLimit ? "rgba(220,60,60,0.5)" : input.trim() ? "var(--accent-border)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-lg)", padding: "10px 10px 10px 14px",
            transition: "border-color 0.15s",
          }}>
            <textarea ref={inputRef} value={input}
              onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder="Ask your gym assistant…"
              rows={1} disabled={isLoading}
              style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
            <button onClick={() => sendMessage(input)} disabled={!canSend} aria-label="Send"
              style={{ width: 38, height: 38, borderRadius: "50%", background: canSend ? "var(--accent)" : "var(--bg-elevated)", border: "none", cursor: canSend ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", color: canSend ? "#fff" : "var(--text-muted)", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}>
              <IcoSend />
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>Enter to send · Shift+Enter for new line</p>
            {charCount > 0 && (
              <p style={{ fontSize: 10, color: isOverLimit ? "#f87171" : "var(--text-muted)", fontWeight: isOverLimit ? 500 : 400 }}>
                {charCount}/{MAX_CHARS}
              </p>
            )}
          </div>
          {isOverLimit && <p style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>Message too long. Please shorten it.</p>}
        </div>
      )}
    </div>
  )
}