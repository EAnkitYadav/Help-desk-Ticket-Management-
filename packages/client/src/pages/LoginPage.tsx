import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loginSchema, type LoginFormData } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <Loader2 className="animate-spin mr-2 h-5 w-5" />
        Loading...
      </div>
    );
  }

  // If already logged in, redirect to dashboard
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    try {
      await login(data.email, data.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-[400px] px-4 animate-in-page">
        <div className="flex flex-col items-center mb-10">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-5">
            <span className="text-primary-foreground font-bold text-xl">H</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Sign in to your helpdesk account
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate id="login-form">
              {serverError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-fade-in mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@example.com"
                    {...register("email")}
                    autoFocus
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <span className="text-xs text-destructive font-medium">{errors.email.message}</span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      {...register("password")}
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-destructive font-medium">{errors.password.message}</span>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  id="login-submit"
                >
                  {isSubmitting && (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
            Demo credentials
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-mono text-muted-foreground">
            <span>admin@example.com</span>
            <span className="text-border">/</span>
            <span>password@123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
