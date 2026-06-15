"use client";

import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

export default function Home() {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Scribing AI</h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-Powered Medical Scribing Platform
          </p>

          {isAuthenticated ? (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-2">
                Welcome, {user?.firstName} {user?.lastName}!
              </h2>
              <p className="text-gray-600 mb-4">
                You are successfully logged in
              </p>
              <p className="text-sm text-gray-500">Email: {user?.email}</p>
              <p className="text-sm text-gray-500">
                Organization: {user?.organizationName}
              </p>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/login";
                }}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link
                href="/login"
                className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
