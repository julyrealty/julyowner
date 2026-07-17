"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useHub } from "@/lib/store";
import { relTime } from "@/lib/calc";
import { Card, Avatar } from "@/components/ui";

export default function MessagesPage() {
  const { hub, messages, pro, profile, demo, sendMessage } = useHub();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function submit() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try { await sendMessage(draft); setDraft(""); } finally { setSending(false); }
  }

  if (!hub) return null;
  const proName = `${(pro as { first_name?: string | null })?.first_name ?? "Your"} ${(pro as { last_name?: string | null })?.last_name ?? "advisor"}`.trim();

  return (
    <div className="container-x flex min-h-[70dvh] max-w-3xl flex-col py-6 sm:py-8">
      <div className="flex items-center gap-3">
        <Avatar name={proName} size={40} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{proName}</h1>
          <p className="text-xs text-gray-500">{(pro as { org_name?: string | null })?.org_name || "JULY Realty"} · usually replies within a day</p>
        </div>
      </div>

      <Card className="mt-4 flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" style={{ maxHeight: "56dvh" }}>
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">
              No messages yet. Ask anything about your home, the market, or your plans — this goes straight to {proName.split(" ")[0]}.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_role === "homeowner";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-teal-soft text-ink"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] font-semibold ${mine ? "text-white/50" : "text-teal-deep/60"}`}>
                    {mine ? "You" : m.sender_name ?? "Advisor"} · {relTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="flex items-end gap-2 border-t border-line p-3">
          <textarea
            className="input min-h-11 flex-1 resize-none py-2.5 text-sm"
            rows={1}
            placeholder={`Message ${proName.split(" ")[0]}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          />
          <button className="btn btn-primary btn-md shrink-0" disabled={!draft.trim() || sending} onClick={submit} aria-label="Send message">
            <Send size={16} />
          </button>
        </div>
      </Card>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        {demo ? "Demo thread — messages stay in this browser." : `Messages are private to your hub — only you and ${proName.split(" ")[0]} can see them.`}
      </p>
    </div>
  );
}
