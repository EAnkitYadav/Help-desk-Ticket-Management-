import { createContext, useContext, useCallback, type ReactNode } from "react";
import { authClient } from "../lib/auth-client";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const user: AuthUser | null = session?.user ?? null;

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || "Login failed");
    }
    // Better Auth's useSession hook will auto-rerender with the new session
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
    // Better Auth's useSession hook will auto-rerender, clearing the session
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading: isPending, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
