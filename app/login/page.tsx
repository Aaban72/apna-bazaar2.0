
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("mode") === "reset") {
      setMode("reset");
    }
  }, []);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessageType("success");
          setMessage("Account created successfully. Redirecting...");
          router.push("/");
          router.refresh();
        } else {
          setMessageType("success");
          setMessage(
            "Signup successful. Check your email and click the confirmation link. Then return here and log in."
          );
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push("/");
        router.refresh();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/login?mode=reset`,
          }
        );

        if (error) throw error;

        setMessageType("success");
        setMessage(
          "If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder."
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) throw error;

        setPassword("");
        setMode("login");
        setMessageType("success");
        setMessage(
          "Password updated successfully. You can now log in with your new password."
        );
        window.history.replaceState({}, "", "/login");
      }
    } catch (err: unknown) {
      setMessageType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create account"
      : mode === "login"
        ? "Welcome back"
        : mode === "forgot"
          ? "Reset your password"
          : "Choose a new password";

  const description =
    mode === "signup"
      ? "Buy and sell on Apna Bazaar."
      : mode === "login"
        ? "Log in to your Apna Bazaar account."
        : mode === "forgot"
          ? "Enter your email address to receive a password reset link."
          : "Enter a new password for your account.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to Apna Bazaar
        </Link>

        <div className="mt-7">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>

        {(mode === "login" || mode === "signup") && (
          <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => changeMode("login")}
              className={`rounded-md py-2 text-sm font-semibold ${
                mode === "login"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => changeMode("signup")}
              className={`rounded-md py-2 text-sm font-semibold ${
                mode === "signup"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {mode === "reset" ? "New password" : "Password"}
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "reset" || mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "reset"
                    ? "Enter your new password"
                    : "At least 6 characters"
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create account"
                : mode === "login"
                  ? "Login"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Update password"}
          </button>
        </form>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 break-words rounded-lg p-3 text-sm ${
              messageType === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {(mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            onClick={() => changeMode("login")}
            className="mt-5 w-full text-center text-sm font-medium text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          By signing up, you agree to use Apna Bazaar responsibly.
        </p>
      </div>
    </main>
  );
}
