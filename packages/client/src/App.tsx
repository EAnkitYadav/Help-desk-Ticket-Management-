import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./lib/theme";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketsPage } from "./pages/TicketsPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";
import { UsersPage } from "./pages/UsersPage";
import "./index.css";

function ErrorFallback() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      gap: "1rem",
      fontFamily: "system-ui, sans-serif",
      color: "#64748b",
    }}>
      <h1 style={{ fontSize: "1.5rem", color: "#1e293b" }}>Something went wrong</h1>
      <p>An unexpected error occurred. Our team has been notified.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "0.5rem 1.5rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "hsl(262, 83%, 58%)",
          color: "white",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/tickets/new" element={<CreateTicketPage />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <UsersPage />
                    </AdminRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
