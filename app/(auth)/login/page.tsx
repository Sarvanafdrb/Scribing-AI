"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAxiosError } from "axios";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const getLoginErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the API server. Start the backend with: npm run dev (in scribing-ai-api folder).";
    }
    return (
      (error.response.data as { message?: string })?.message ||
      "Invalid credentials"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Invalid credentials";
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

      setAuth(
        {
          ...user,
          isSuperAdmin: Boolean(user.isSuperAdmin),
          permissions: user.permissions || [],
          organizationName: user.organizationName || user.organization?.name,
          organization: user.isSuperAdmin ? null : user.organization,
        },
        accessToken,
        refreshToken,
      );

      toast.success("Welcome back!", {
        description: `Hello ${user.firstName} ${user.lastName}`,
      });

      router.push("/dashboard");
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
    <Card className="shadow-xl border-blue-100">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-blue-900">
          Welcome Back
        </CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="sangeetha@test.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Signing in...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn size={18} />
                Sign In
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">
            Organization access is managed by a super admin.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
