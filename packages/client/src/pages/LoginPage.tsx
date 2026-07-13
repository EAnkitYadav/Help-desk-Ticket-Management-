import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { loginSchema, type LoginFormData } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f5] p-4 sm:p-6 selection:bg-slate-200 selection:text-slate-900 font-sans">
      <div className="w-full max-w-[420px] bg-white border border-[#e4e4e7] rounded-2xl sm:rounded-[20px] p-8 sm:p-10 shadow-sm transition-all duration-300">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#09090b] tracking-tight mb-1">
            Helpdesk
          </h1>
          <p className="text-sm text-[#71717a] font-normal">
            Sign in to your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          id="login-form"
          noValidate
        >
          {serverError && (
            <Alert
              variant="destructive"
              className="bg-red-50 border-red-200 text-red-600 py-3 px-3.5 rounded-xl animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-600" />
              <AlertDescription className="text-sm font-medium text-red-600 ml-1">
                {serverError}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-email" className="text-xs font-semibold text-[#27272a]">
                Email
              </label>
              {errors.email && (
                <span className="text-xs text-red-600 font-medium animate-fade-in">
                  {errors.email.message}
                </span>
              )}
            </div>
            <Input
              id="login-email"
              type="email"
              {...register("email")}
              placeholder="admin@example.com"
              autoFocus
              autoComplete="email"
              aria-invalid={!!errors.email}
              className="w-full bg-white border-[#e4e4e7] px-3.5 py-2 h-10 text-sm text-[#09090b] placeholder:text-[#a1a1aa] focus-visible:border-[#18181b] focus-visible:ring-2 focus-visible:ring-[#18181b]/10 rounded-lg sm:rounded-xl transition-all duration-150"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-semibold text-[#27272a]">
                Password
              </label>
              {errors.password && (
                <span className="text-xs text-red-600 font-medium animate-fade-in">
                  {errors.password.message}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••••"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="w-full bg-white border-[#e4e4e7] pl-3.5 pr-10 py-2 h-10 text-sm text-[#09090b] placeholder:text-[#a1a1aa] focus-visible:border-[#18181b] focus-visible:ring-2 focus-visible:ring-[#18181b]/10 rounded-lg sm:rounded-xl transition-all duration-150"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#27272a] p-1 rounded-md transition-colors cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="login-submit"
            className="w-full mt-2 h-10 py-2.5 px-4 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white font-medium text-sm rounded-lg sm:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#18181b]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#f4f4f5] text-center">
          <p className="text-[11px] text-[#a1a1aa] font-medium uppercase tracking-wider mb-2">
            Demo credentials
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-xs font-mono text-[#3f3f46]">
            <span>admin@example.com</span>
            <span className="text-[#a1a1aa]">/</span>
            <span>password@123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
