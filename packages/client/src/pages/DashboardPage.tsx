import { Link } from "react-router-dom";

export function DashboardPage() {
  const stats = [
    { label: "Total Tickets", value: "128", icon: "🎫", change: "+12% this week", color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30" },
    { label: "Open Tickets", value: "34", icon: "🔥", change: "4 urgent", color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30" },
    { label: "Resolved Today", value: "18", icon: "✅", change: "+5 from yesterday", color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30" },
    { label: "AI Suggestions Used", value: "85%", icon: "🤖", change: "High accuracy", color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30" },
  ];

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1a1d27] to-[#22262f] p-6 rounded-2xl border border-[#2e3140] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm text-[#9499a8] mt-1">
            Welcome back! Here is what is happening with your support tickets today.
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 shrink-0"
        >
          <span>✨ Create Ticket</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-between p-6 rounded-2xl bg-[#1a1d27] border border-[#2e3140] hover:border-[#3a3d4a] transition-all duration-200 shadow-lg hover:-translate-y-1 group relative overflow-hidden`}
          >
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9499a8]">{stat.label}</span>
              <span className="text-2xl p-2 rounded-xl bg-[#22262f] border border-[#2e3140]">{stat.icon}</span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
              <p className="text-xs text-[#9499a8] mt-1.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                {stat.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Recent Ticket Activity
            </h3>
            <Link to="/tickets" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View All →
            </Link>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-[#2e3140] rounded-xl bg-[#0f1117]/50 text-center">
            <span className="text-4xl mb-3 animate-bounce">📬</span>
            <p className="text-sm font-medium text-[#e4e6ec]">All caught up!</p>
            <p className="text-xs text-[#6b7080] mt-1">No pending high-priority tickets require immediate action.</p>
          </div>
        </div>

        <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              AI Assistant Performance
            </h3>
            <p className="text-xs text-[#9499a8] leading-relaxed">
              Antigravity AI is continuously learning from your team's resolved tickets to suggest faster responses.
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#9499a8]">Classification Accuracy</span>
                  <span className="text-indigo-400">94%</span>
                </div>
                <div className="w-full h-2 bg-[#0f1117] rounded-full overflow-hidden">
                  <div className="w-[94%] h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#9499a8]">Auto-Reply Adoption</span>
                  <span className="text-emerald-400">82%</span>
                </div>
                <div className="w-full h-2 bg-[#0f1117] rounded-full overflow-hidden">
                  <div className="w-[82%] h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#2e3140]/60 flex items-center justify-between text-xs text-[#6b7080]">
            <span>Model: Gemini 3.1 Pro</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">● Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
