import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../lib/theme";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, adminOnly: false },
    { name: "Tickets", path: "/tickets", icon: Ticket, adminOnly: false },
    { name: "Users", path: "/users", icon: Users, adminOnly: true },
  ].filter((link) => !link.adminOnly || user?.role === "ADMIN");

  const navLinkClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
      isActive
        ? "text-primary-foreground bg-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 mr-5 group"
          >
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                H
              </span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight group-hover:text-foreground transition-colors">
              Helpdesk
            </span>
          </Link>
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={navLinkClass(isActive)}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.name}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <div className="h-5 w-px bg-border mx-2" />
          <span className="text-[13px] text-muted-foreground mr-1">
            {user?.name || "Admin"}
          </span>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 cursor-pointer"
            onClick={handleLogout}
            id="top-navbar-signout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>
      <main className="flex-1 px-8 py-8 max-w-[1200px] w-full mx-auto animate-in-page">
        <Outlet />
      </main>
    </div>
  );
}
