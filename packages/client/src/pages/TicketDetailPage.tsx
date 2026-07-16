import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ticketsApi, usersApi, type Ticket, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { TicketDetails } from "../components/TicketDetails";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
      const data = await usersApi.list({ limit: "100" });
      setAgents(data.users.filter((u) => u.isActive));
    } catch {
      // Non-admin won't have access — that's OK
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin" />
        <span className="text-sm">Loading ticket details...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
        Ticket not found
      </div>
    );
  }

  return (
    <TicketDetails
      ticket={ticket}
      agents={agents}
      onTicketUpdate={setTicket}
      onBack={() => navigate("/tickets")}
    />
  );
}
