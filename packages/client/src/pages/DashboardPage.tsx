import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, usersApi, ticketsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface DashboardStats {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  unassigned: number;
}

interface UserStats {
  total: number;
  active: number;
  admins: number;
  agents: number;
}

interface RecentTicket {
  id: string;
  subject: string;
  senderEmail: string;
  status: string;
  priority: string | null;
  createdAt: string;
}

function StatSkeleton() {
  return (
    <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#1a1d27] border border-[#2e3140] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-[#2e3140] rounded" />
        <div className="w-10 h-10 rounded-xl bg-[#2e3140]" />
      </div>
      <div className="mt-4 h-8 w-16 bg-[#2e3140] rounded" />
    </div>
  );
}

const statusColors: Record<string, string> = {
  OPEN: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

const priorityColors: Record<string, string> = {
  URGENT: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-amber-400",
  LOW: "text-slate-400",
};

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [ticketStats, setTicketStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const data = await dashboardApi.getStats();
        setTicketStats(data.stats);

        // Fetch recent tickets
        const { tickets } = await ticketsApi.list({ limit: "5", sortBy: "createdAt", sortOrder: "desc" });
        setRecentTickets(tickets.slice(0, 5) as RecentTicket[]);
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUserStats = async () => {
      setLoadingUsers(true);
      try {
        const data = await usersApi.getStats();
        setUserStats(data.stats);
      } catch (err) {
        console.error("Failed to load user stats:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUserStats();
  }, [isAdmin]);

  const ticketStatCards = [
    {
      label: "Total Tickets",
      value: ticketStats?.total ?? 0,
      icon: "🎫",
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    },
    {
      label: "Open Tickets",
      value: ticketStats?.open ?? 0,
      icon: "🔥",
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
    {
      label: "Resolved",
      value: ticketStats?.resolved ?? 0,
      icon: "✅",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      label: "Unassigned",
      value: ticketStats?.unassigned ?? 0,
      icon: "⚡",
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    },
  ];

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1a1d27] to-[#22262f] p-6 rounded-2xl border border-[#2e3140] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm text-[#9499a8] mt-1">
            Welcome back, <span className="text-indigo-300 font-semibold">{user?.name}</span>! Here's your support center at a glance.
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 shrink-0"
        >
          <span>✨ Create Ticket</span>
        </Link>
      </div>

      {/* Ticket Stats Cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9499a8] mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Ticket Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loadingStats
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : ticketStatCards.map((stat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between p-6 rounded-2xl bg-[#1a1d27] border border-[#2e3140] hover:border-[#3a3d4a] transition-all duration-200 shadow-lg hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9499a8]">
                      {stat.label}
                    </span>
                    <span className="text-2xl p-2 rounded-xl bg-[#22262f] border border-[#2e3140]">
                      {stat.icon}
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Admin Users Panel */}
      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9499a8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Team Overview
            </h2>
            <Link
              to="/users"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              Manage Users →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {loadingUsers
              ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
              : [
                  { label: "Total Members", value: userStats?.total ?? 0, icon: "👥", color: "from-indigo-500/20 to-violet-500/20 text-indigo-400 border-indigo-500/30" },
                  { label: "Active Accounts", value: userStats?.active ?? 0, icon: "✅", color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30" },
                  { label: "Administrators", value: userStats?.admins ?? 0, icon: "🔐", color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30" },
                  { label: "Support Agents", value: userStats?.agents ?? 0, icon: "🎧", color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30" },
                ].map((stat, idx) => (
                  <Link
                    key={idx}
                    to="/users"
                    className="flex flex-col justify-between p-6 rounded-2xl bg-[#1a1d27] border border-[#2e3140] hover:border-[#3a3d4a] transition-all duration-200 shadow-lg hover:-translate-y-1 group relative overflow-hidden no-underline"
                  >
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#9499a8]">
                        {stat.label}
                      </span>
                      <span className="text-2xl p-2 rounded-xl bg-[#22262f] border border-[#2e3140]">
                        {stat.icon}
                      </span>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      )}

      {/* Bottom Grid — Recent Tickets + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Recent Tickets
            </h3>
            <Link to="/tickets" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View All →
            </Link>
          </div>

          {loadingStats ? (
            <div className="flex-1 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-[#22262f] rounded-xl animate-pulse border border-[#2e3140]" />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-[#2e3140] rounded-xl bg-[#0f1117]/50 text-center">
              <span className="text-4xl mb-3 animate-bounce">📬</span>
              <p className="text-sm font-medium text-[#e4e6ec]">No tickets yet!</p>
              <p className="text-xs text-[#6b7080] mt-1">Create your first ticket to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#2e3140]">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex items-center justify-between py-3.5 group hover:bg-[#22262f]/60 -mx-2 px-2 rounded-xl transition-all duration-150 no-underline"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-[#e4e6ec] group-hover:text-indigo-300 transition-colors truncate max-w-xs">
                      {ticket.subject}
                    </span>
                    <span className="text-xs text-[#6b7080] mt-0.5 truncate">{ticket.senderEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {ticket.priority && (
                      <span className={`text-[10px] font-bold uppercase ${priorityColors[ticket.priority] || "text-slate-400"}`}>
                        {ticket.priority}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColors[ticket.status] || "text-slate-400"}`}>
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions / Side Panel */}
        <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          <div>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Quick Actions
            </h3>
            <div className="flex flex-col gap-3">
              <Link
                to="/tickets/new"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-sm font-medium transition-all duration-150 no-underline group"
              >
                <span className="text-lg">✨</span>
                <span>Create New Ticket</span>
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
              <Link
                to="/tickets"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-300 text-sm font-medium transition-all duration-150 no-underline group"
              >
                <span className="text-lg">🔥</span>
                <span>View Open Tickets</span>
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/users"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 text-sm font-medium transition-all duration-150 no-underline group"
                >
                  <span className="text-lg">👥</span>
                  <span>Manage Users</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </Link>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="pt-4 border-t border-[#2e3140]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b7080] mb-3">Status Breakdown</h4>
            <div className="flex flex-col gap-2">
              {[
                { label: "Open", value: ticketStats?.open ?? 0, total: ticketStats?.total ?? 1, color: "from-amber-500 to-orange-500" },
                { label: "Resolved", value: ticketStats?.resolved ?? 0, total: ticketStats?.total ?? 1, color: "from-emerald-500 to-teal-500" },
                { label: "Closed", value: ticketStats?.closed ?? 0, total: ticketStats?.total ?? 1, color: "from-slate-500 to-slate-600" },
              ].map((s) => {
                const pct = s.total > 0 ? Math.round((s.value / s.total) * 100) : 0;
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#9499a8]">{s.label}</span>
                      <span className="text-white">{loadingStats ? "—" : `${s.value} (${pct}%)`}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-700`}
                        style={{ width: loadingStats ? "0%" : `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
