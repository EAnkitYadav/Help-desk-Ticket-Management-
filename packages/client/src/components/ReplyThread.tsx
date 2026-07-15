import { useState, useEffect, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { aiApi, type Ticket } from "../lib/api";

export interface ReplyThreadProps {
  ticket: Ticket;
  onReplySubmit: (replyText: string) => Promise<void>;
}

export function ReplyThread({ ticket, onReplySubmit }: ReplyThreadProps) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [summary, setSummary] = useState<string | null>(ticket.aiSummary || null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    setSummary(ticket.aiSummary || null);
  }, [ticket.id, ticket.aiSummary]);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const data = await aiApi.summarize(ticket.id);
      if (data && data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setSummarizing(false);
    }
  };

  const handlePolish = async () => {
    if (!reply.trim()) return;
    setPolishing(true);
    try {
      const data = await aiApi.polishReply(reply, ticket.id);
      if (data && data.polishedText) {
        setReply(data.polishedText);
      }
    } catch (err) {
      console.error("Failed to polish reply:", err);
    } finally {
      setPolishing(false);
    }
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    try {
      await onReplySubmit(reply);
      setReply("");
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto divide-y divide-border/40">
        {/* Original ticket description */}
        <div className="pt-4 first:pt-0 flex flex-col gap-2.5 border-l-4 border-blue-500 pl-4 bg-blue-500/5 rounded-r-xl py-3 pr-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {ticket.senderName || ticket.senderEmail}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400">
                CUSTOMER
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {formatDate(ticket.createdAt)}
            </span>
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
            {ticket.description}
          </div>

          <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-3">
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleSummarize}
                disabled={summarizing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                {summarizing ? "Generating Summary..." : "Summarize Ticket & History"}
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </button>
            </div>

            {summary && (
              <div className="relative overflow-hidden bg-primary/5 border border-primary/20 rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Summary</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed font-sans whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Agent comments */}
        {ticket.comments?.map((comment) => (
          <div
            key={comment.id}
            className={`pt-4 first:pt-0 flex flex-col gap-2.5 ${
              comment.isAiGenerated
                ? "border-l-4 border-emerald-500 pl-4 bg-emerald-500/5 rounded-r-xl py-3 pr-3"
                : "border-l-4 border-primary pl-4 bg-primary/5 rounded-r-xl py-3 pr-3"
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {comment.isAiGenerated
                    ? "Agent"
                    : comment.author?.name || "Agent"}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    comment.isAiGenerated
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {comment.isAiGenerated ? "AI" : "AGENT"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {comment.body}
            </div>
          </div>
        ))}

        {(!ticket.comments || ticket.comments.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-xs text-muted-foreground">
              No replies yet. Be the first to respond.
            </p>
          </div>
        )}
      </div>

      {/* Reply Form */}
      {ticket.status !== "CLOSED" && (
        <form
          onSubmit={handleReply}
          className="p-6 bg-muted/50 border-t border-border flex flex-col gap-4"
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply to the customer..."
            rows={4}
            className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 resize-y"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handlePolish}
              disabled={polishing || !reply.trim() || sending}
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
            >
              {polishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                  <span>Polishing...</span>
                </>
              ) : (
                "✨ Polish"
              )}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
              disabled={sending || !reply.trim()}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                "Send Reply"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
