import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
        <p className="mt-2 text-gray-600">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
