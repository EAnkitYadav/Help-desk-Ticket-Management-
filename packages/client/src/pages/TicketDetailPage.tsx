import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ticketsApi, usersApi, type Ticket, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadAgents();
    }
  }, [id]);

  const loadTicket = async () => {
    try {
      const data = await ticketsApi.get(id!);
      setTicket(data.ticket);
    } catch {
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await usersApi.list();
      setAgents(data.users.filter((u) => u.isActive));
    } catch {
      // Non-admin won't have access — that's OK
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    const data = await ticketsApi.update(ticket.id, { status } as any);
    setTicket(data.ticket);
  };

  const handleAssign = async (assignedToId: string) => {
    if (!ticket) return;
    const data = await ticketsApi.update(ticket.id, { assignedToId: assignedToId || null } as any);
    setTicket(data.ticket);
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !ticket) return;

    setSending(true);
    try {
      await ticketsApi.addMessage(ticket.id, reply);
      setReply("");
      loadTicket(); // Refresh to show new message
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#9499a8]">
        <div className="w-8 h-8 border-3 border-[#2e3140] border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm">Loading ticket details...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
        Ticket not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2e3140]">
        <div className="flex items-start gap-4">
          <button
            className="px-3 py-1.5 rounded-xl bg-[#1a1d27] hover:bg-[#22262f] border border-[#2e3140] text-xs font-semibold text-[#9499a8] hover:text-white transition-colors duration-150 cursor-pointer mt-1 shrink-0"
            onClick={() => navigate("/tickets")}
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">{ticket.subject}</h1>
            <p className="text-sm text-[#9499a8] mt-1 flex items-center gap-2 flex-wrap">
              <span>From <strong className="text-[#e4e6ec] font-semibold">{ticket.senderName || ticket.senderEmail}</strong></span>
              <span>·</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Conversation Thread */}
        <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2e3140] rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto divide-y divide-[#2e3140]/40">
            {/* Original ticket description */}
            <div className="pt-4 first:pt-0 flex flex-col gap-2.5 border-l-4 border-blue-500 pl-4 bg-[#0f1117]/40 rounded-r-xl py-3 pr-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">
                    {ticket.senderName || ticket.senderEmail}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400">
                    CUSTOMER
                  </span>
                </div>
                <span className="text-xs text-[#6b7080] font-medium">{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="text-sm text-[#e4e6ec] leading-relaxed whitespace-pre-wrap font-sans">
                {ticket.description}
              </div>
            </div>
            {/* Agent comments */}
            {ticket.comments?.map((comment) => (
              <div
                key={comment.id}
                className={`pt-4 first:pt-0 flex flex-col gap-2.5 ${
                  comment.isAiGenerated
                    ? "border-l-4 border-emerald-500 pl-4 bg-emerald-500/5 rounded-r-xl py-3 pr-3"
                    : "border-l-4 border-indigo-500 pl-4 bg-indigo-500/5 rounded-r-xl py-3 pr-3"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">
                      {comment.isAiGenerated ? "AI Assistant" : (comment.author?.name || "Agent")}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        comment.isAiGenerated
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-indigo-500/15 text-indigo-400"
                      }`}
                    >
                      {comment.isAiGenerated ? "AI" : "AGENT"}
                    </span>
                  </div>
                  <span className="text-xs text-[#6b7080] font-medium">{formatDate(comment.createdAt)}</span>
                </div>
                <div className="text-sm text-[#e4e6ec] leading-relaxed whitespace-pre-wrap font-sans">
                  {comment.body}
                </div>
              </div>
            ))}
            {(!ticket.comments || ticket.comments.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-3xl mb-2">💬</span>
                <p className="text-xs text-[#6b7080]">No replies yet. Be the first to respond.</p>
              </div>
            )}
          </div>

          {/* Reply Form */}
          {ticket.status !== "CLOSED" && (
            <form onSubmit={handleReply} className="p-6 bg-[#22262f]/50 border-t border-[#2e3140] flex flex-col gap-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your reply to the customer..."
                rows={4}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-4 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200 resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={sending || !reply.trim()}
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

        {/* Sidebar — Ticket Metadata */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9499a8] pb-2 border-b border-[#2e3140]/60">
              Ticket Status
            </h3>
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  ticket.status === "OPEN"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : ticket.status === "RESOLVED"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                }`}
              >
                {ticket.status}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ticket.status === "OPEN" && (
                  <button
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                    onClick={() => handleStatusChange("RESOLVED")}
                  >
                    ✅ Resolve
                  </button>
                )}
                {ticket.status === "RESOLVED" && (
                  <>
                    <button
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                      onClick={() => handleStatusChange("OPEN")}
                    >
                      🔄 Reopen
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-xl bg-slate-500/15 hover:bg-slate-500/25 text-slate-300 border border-slate-500/30 text-xs font-semibold transition-all cursor-pointer"
                      onClick={() => handleStatusChange("CLOSED")}
                    >
                      🔒 Close
                    </button>
                  </>
                )}
                {ticket.status === "CLOSED" && (
                  <button
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                    onClick={() => handleStatusChange("OPEN")}
                  >
                    🔄 Reopen
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9499a8] pb-2 border-b border-[#2e3140]/60">
              Classification
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7080] font-medium">Category</label>
              <select
                value={ticket.category || ""}
                onChange={(e) => ticketsApi.update(ticket.id, { category: e.target.value || null } as any).then((d) => setTicket(d.ticket))}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-[#e4e6ec] outline-none cursor-pointer"
              >
                <option value="">Uncategorized</option>
                <option value="GENERAL_QUESTION">General Question</option>
                <option value="TECHNICAL_QUESTION">Technical Question</option>
                <option value="REFUND_REQUEST">Refund Request</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7080] font-medium">Priority</label>
              <select
                value={ticket.priority || ""}
                onChange={(e) => ticketsApi.update(ticket.id, { priority: e.target.value || null } as any).then((d) => setTicket(d.ticket))}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-[#e4e6ec] outline-none cursor-pointer"
              >
                <option value="">Unset Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {agents.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9499a8] pb-2 border-b border-[#2e3140]/60">
                Assignment
              </h3>
              <select
                value={ticket.assignedToId || ""}
                onChange={(e) => handleAssign(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-[#e4e6ec] outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-5 shadow-xl flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9499a8] pb-2 border-b border-[#2e3140]/60">
              Customer Info
            </h3>
            <p className="text-sm font-semibold text-white">{ticket.senderName || "Unknown Name"}</p>
            <p className="text-xs text-[#9499a8] font-mono break-all">{ticket.senderEmail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
