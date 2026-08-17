"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  resolvePostLoginWorkspace,
  useWorkspaceSelection,
} from "@/hooks/useWorkspaceSelection";
import { authService } from "@/services/auth.service";
import { normalizeAuthUser, toPersistedAuthUser } from "@/types/auth.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginGlassShell } from "@/components/auth/LoginGlassShell";
import { isAxiosError } from "axios";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";
import { strictEmailSchema } from "@/lib/validation";

const loginSchema = z.object({
  email: strictEmailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const glassFieldClass =
  "h-12 rounded-2xl border border-white/50 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl placeholder:text-slate-500/80 focus-visible:border-blue-300/80 focus-visible:ring-2 focus-visible:ring-blue-900/15";

const getLoginErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the API server. Start the backend with: npm run dev (in scribing-ai-api folder).";
    }

    const status = error.response.status;
    const message = (error.response.data as { message?: string })?.message;

    if (status === 503 && message) return message;
    if (message) return message;

    if (status === 503) {
      return "Cannot reach the API server. Start the backend with: npm run dev (in scribing-ai-api folder).";
    }

    return "Invalid credentials";
  }

  if (
    error instanceof Error &&
    error.message !== "No refresh token available"
  ) {
    return error.message;
  }

  return "Invalid credentials";
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { selectWorkspace } = useWorkspaceSelection();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mounted = useMounted();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const result = await authService.login({
        email: data.email,
        password: data.password,
      });

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      const { accessToken, refreshToken, user } = result.data;

      if (!accessToken || !user) {
        throw new Error("Invalid response from server");
      }

      setAuth(toPersistedAuthUser(normalizeAuthUser(user))!, accessToken, refreshToken);

      try {
        const meResponse = await authService.getCurrentUser();
        const freshUser =
          meResponse?.data?.user || meResponse?.user || meResponse?.data;
        if (freshUser?.id) {
          useAuthStore.getState().setUser(
            toPersistedAuthUser(
              normalizeAuthUser({
                ...freshUser,
                isSuperAdmin: Boolean(freshUser.isSuperAdmin),
                permissions: freshUser.permissions || [],
                organizationName:
                  freshUser.organizationName || freshUser.organization?.name,
                organization: freshUser.isSuperAdmin
                  ? null
                  : freshUser.organization,
              }),
            ),
          );
        }
      } catch {
        // Proceed with login response user if /auth/me refresh fails.
      }

      toast.success("Welcome back!", {
        description: `Hello ${user.firstName} ${user.lastName}`,
      });

      const { redirectTo, workspace } = await resolvePostLoginWorkspace();
      if (workspace) {
        selectWorkspace(workspace);
      }
      router.push(redirectTo);
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: getLoginErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginGlassShell>
      <div
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-white/55",
          "bg-white/25 shadow-[0_24px_80px_rgba(15,43,110,0.14)] backdrop-blur-3xl",
          "before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-white/80",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-transparent" />

        <div className="relative px-8 pb-8 pt-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] border border-white/60 bg-white/40 shadow-[0_12px_40px_rgba(30,64,175,0.18)] backdrop-blur-2xl">
              <Sparkles className="h-8 w-8 text-[#1e3a8a]" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1e3a8a]/70">
              Scribing AI
            </p>
            <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to continue to your healthcare workspace
            </p>
          </div>

          {mounted ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@organization.com"
                  className={glassFieldClass}
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={cn(glassFieldClass, "pr-12")}
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-800 transition hover:bg-white/70 hover:text-[#1e3a8a]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={2.25} />
                    ) : (
                      <Eye size={18} strokeWidth={2.25} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="h-4 w-4 rounded border-white/60 bg-white/50 accent-[#1e3a8a]"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#1e3a8a] transition hover:text-[#172554]"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "mt-2 h-12 w-full rounded-2xl border border-[#172554]/20 text-base font-medium text-white",
                  "bg-[#1e3a8a] shadow-[0_14px_36px_rgba(30,58,138,0.35)]",
                  "transition-all duration-300 hover:scale-[1.01] hover:bg-[#172554]",
                  "disabled:scale-100 disabled:opacity-80",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-5" aria-hidden>
              <div className="space-y-2">
                <div className="h-4 w-12 rounded bg-white/30" />
                <div className={cn(glassFieldClass, "h-12 animate-pulse bg-white/30")} />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 rounded bg-white/30" />
                <div className={cn(glassFieldClass, "h-12 animate-pulse bg-white/30")} />
              </div>
              <div className="h-4" />
              <div className="mt-2 h-12 animate-pulse rounded-2xl bg-[#1e3a8a]/40" />
            </div>
          )}

          <p className="mt-7 text-center text-xs leading-relaxed text-slate-500">
            Organization access is managed by your super admin.
          </p>
        </div>
      </div>
    </LoginGlassShell>
  );
}
