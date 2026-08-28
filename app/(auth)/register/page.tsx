"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import {
  resolvePostLoginWorkspace,
  useWorkspaceSelection,
} from "@/hooks/useWorkspaceSelection";
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
import {
  lastNameSchema,
  organizationNameSchema,
  strictEmailSchema,
} from "@/lib/validation";

const phoneRegex = /^[0-9]{10,15}$/;
const firstNameRegex = /^[a-zA-Z\s'-]+$/;

const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .regex(firstNameRegex, "First name can only contain letters"),
    lastName: lastNameSchema,
    email: strictEmailSchema,
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    organizationName: organizationNameSchema,
    phone: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value || value.trim() === "" || phoneRegex.test(value.trim()),
        "Phone must be 10 to 15 digits",
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { selectWorkspace } = useWorkspaceSelection();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      const response = await fetch(`${API_URL}/auth/register-org`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          organizationName: data.organizationName,
          phone: data.phone || "",
        }),
      });

      const result = await response.json();

      console.log("Register Response:", result);

      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      // Handle API errors
      if (!result.success) {
        throw new Error(result.message || "Registration failed");
      }

      const { user, accessToken, refreshToken } = result.data;

      // Update Zustand store
      setAuth(user, accessToken, refreshToken);

      toast.success("Account created successfully!", {
        description: `Welcome ${user.firstName}! Your organization "${user.organizationName}" has been created.`,
        duration: 2000,
      });

      const { redirectTo, workspace } = await resolvePostLoginWorkspace();
      if (workspace) {
        selectWorkspace(workspace);
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (error: any) {
      console.error("Registration Error:", error);

      toast.error("Registration failed", {
        description:
          error?.message || "Something went wrong. Please try again.",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-blue-100">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-blue-900">
          Create Account
        </CardTitle>
        <CardDescription>
          Register your organization and admin account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register("firstName", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(
                      /[^a-zA-Z\s'-]/g,
                      "",
                    );
                  },
                })}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register("lastName", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(
                      /[^a-zA-Z\s'-]/g,
                      "",
                    );
                  },
                })}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input
              id="organizationName"
              placeholder="ABC Hospital"
              {...register("organizationName")}
              disabled={isLoading}
            />
            {errors.organizationName && (
              <p className="text-sm text-red-500">
                {errors.organizationName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              placeholder="9876543210 or 919876543210"
              {...register("phone", {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                },
              })}
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-800 transition hover:bg-white/70 hover:text-[#1e3a8a]"
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
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmPassword")}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-800 transition hover:bg-white/70 hover:text-[#1e3a8a]"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} strokeWidth={2.25} />
                ) : (
                  <Eye size={18} strokeWidth={2.25} />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating account...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus size={18} />
                Create Account
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
