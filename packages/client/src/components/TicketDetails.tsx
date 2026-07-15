import { ticketsApi, type Ticket, type User } from "../lib/api";
import { ReplyThread } from "./ReplyThread";

export interface TicketDetailsProps {
  ticket: Ticket;
  agents: User[];
  onTicketUpdate: (updatedTicket: Ticket) => void;
  onBack?: () => void;
}

export function TicketDetails({
  ticket,
  agents,
  onTicketUpdate,
  onBack,
}: TicketDetailsProps) {
  const handleStatusChange = async (status: string) => {
    try {
      const data = await ticketsApi.update(ticket.id, { status } as any);
      onTicketUpdate(data.ticket);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAssign = async (assignedToId: string) => {
    try {
      const data = await ticketsApi.update(ticket.id, {
        assignedToId: assignedToId || null,
      } as any);
      onTicketUpdate(data.ticket);
    } catch (err) {
      console.error("Failed to assign ticket:", err);
    }
  };

  const handleCategoryChange = async (category: string) => {
    try {
      const data = await ticketsApi.update(ticket.id, {
        category: category || null,
      } as any);
      onTicketUpdate(data.ticket);
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      const data = await ticketsApi.update(ticket.id, {
        priority: priority || null,
      } as any);
      onTicketUpdate(data.ticket);
    } catch (err) {
      console.error("Failed to update priority:", err);
    }
  };

  const handleReplySubmit = async (body: string) => {
    await ticketsApi.addMessage(ticket.id, body);
    const data = await ticketsApi.get(ticket.id);
    onTicketUpdate(data.ticket);
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
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-4">
          {onBack && (
            <button
              className="px-3 py-1.5 rounded-xl bg-card hover:bg-accent border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer mt-1 shrink-0"
              onClick={onBack}
            >
              ← Back
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-snug">
              {ticket.subject}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>
                From{" "}
                <strong className="text-foreground font-semibold">
                  {ticket.senderName || ticket.senderEmail}
                </strong>
              </span>
              <span>·</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Conversation Thread */}
        <div className="lg:col-span-2 flex flex-col">
          <ReplyThread ticket={ticket} onReplySubmit={handleReplySubmit} />
        </div>

        {/* Sidebar — Ticket Metadata */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
              Ticket Status
            </h3>
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  ticket.status === "NEW"
                    ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    : ticket.status === "PROCESSING"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse"
                    : ticket.status === "OPEN"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : ticket.status === "RESOLVED"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                }`}
              >
                {ticket.status}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(ticket.status === "OPEN" || ticket.status === "NEW" || ticket.status === "PROCESSING") && (
                  <button
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                    onClick={() => handleStatusChange("RESOLVED")}
                  >
                    ✅ Resolve
                  </button>
                )}
                {ticket.status === "RESOLVED" && (
                  <>
                    <button
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                      onClick={() => handleStatusChange("OPEN")}
                    >
                      🔄 Reopen
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-xl bg-slate-500/15 hover:bg-slate-500/25 text-muted-foreground border border-slate-500/30 text-xs font-semibold transition-all cursor-pointer"
                      onClick={() => handleStatusChange("CLOSED")}
                    >
                      🔒 Close
                    </button>
                  </>
                )}
                {ticket.status === "CLOSED" && (
                  <button
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                    onClick={() => handleStatusChange("OPEN")}
                  >
                    🔄 Reopen
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
              Classification
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Category
              </label>
              <select
                aria-label="Category"
                value={ticket.category || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2 text-xs text-foreground outline-none cursor-pointer"
              >
                <option value="">Uncategorized</option>
                <option value="GENERAL_QUESTION">General Question</option>
                <option value="TECHNICAL_QUESTION">Technical Question</option>
                <option value="REFUND_REQUEST">Refund Request</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Priority
              </label>
              <select
                aria-label="Priority"
                value={ticket.priority || ""}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2 text-xs text-foreground outline-none cursor-pointer"
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
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
                Assignment
              </h3>
              <select
                aria-label="Assignment"
                value={ticket.assignedToId || ""}
                onChange={(e) => handleAssign(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2 text-xs text-foreground outline-none cursor-pointer"
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

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/60">
              Customer Info
            </h3>
            <p className="text-sm font-semibold text-foreground">
              {ticket.senderName || "Unknown Name"}
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {ticket.senderEmail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
