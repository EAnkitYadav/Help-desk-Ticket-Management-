import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", adminOnly: false },
    { name: "Tickets", path: "/tickets", adminOnly: false },
    { name: "Users", path: "/users", adminOnly: true },
  ].filter((link) => !link.adminOnly || user?.role === "ADMIN");

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-200" id="top-navbar">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              H
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent">
              Helpdesk
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white">
              {(user?.name || "A")[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-700">{user?.name || "Admin"}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 ml-1">
              {user?.role || "Agent"}
            </span>
          </div>

          <button
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 bg-transparent hover:bg-red-50 hover:border-red-200 border border-slate-200 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            onClick={handleLogout}
            id="top-navbar-signout-btn"
          >
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
