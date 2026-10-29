"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup" | "forgot" | "reset";

function getSafeRedirectPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    return "/";
  }

  try {
    const parsed = new URL(value, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("mode") === "reset") {
      setMode("reset");
    }

    if (params.get("error") === "oauth_callback") {
      setMessageType("error");
      setMessage(
        "Google sign-in could not be completed. Please try again."
      );
    }

    setRedirectTo(getSafeRedirectPath(params.get("next")));
  }, []);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  }

  function redirectAfterLogin() {
    router.replace(redirectTo);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setGoogleLoading(true);

    try {
      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set("next", redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      setMessageType("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again."
      );
      setGoogleLoading(false);
    }
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

        if (error) {
          throw error;
        }

        if (data.session) {
          setMessageType("success");
          setMessage("Account created successfully. Redirecting...");
          redirectAfterLogin();
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

        if (error) {
          throw error;
        }

        redirectAfterLogin();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/login?mode=reset`,
          }
        );

        if (error) {
          throw error;
        }

        setMessageType("success");
        setMessage(
          "If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder."
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          throw error;
        }

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
      ? "Buy and sell securely on Apna Bazaar."
      : mode === "login"
        ? "Log in to your Apna Bazaar account."
        : mode === "forgot"
          ? "Enter your email address to receive a password reset link."
          : "Enter a new password for your account.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 py-10 text-slate-100 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-6 shadow-2xl sm:p-8 backdrop-blur-xl">
        <Link
          href="/"
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          ← Back to Apna Bazaar
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-black text-white uppercase tracking-wide">{title}</h1>
          <p className="mt-1.5 text-xs text-slate-400">{description}</p>
        </div>

        {(mode === "login" || mode === "signup") && (
          <>
            <div className="mt-6 grid grid-cols-2 rounded-xl border border-cyan-500/20 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => changeMode("login")}
                className={`rounded-lg py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                  mode === "login"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => changeMode("signup")}
                className={`rounded-lg py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                  mode === "signup"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign up
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-slate-800 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {googleLoading ? (
                <span className="text-cyan-400 animate-pulse">Connecting to Google...</span>
              ) : (
                <>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 48 48"
                    className="h-4 w-4"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.94 46.98 31.7 46.98 24.55Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                    />
                  </svg>
                  {mode === "signup"
                    ? "Sign up with Google"
                    : "Login with Google"}
                </>
              )}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cyan-900/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#070d1e] px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-cyan-400"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-3.5 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-cyan-400"
              >
                {mode === "reset" ? "New Password" : "Password"}
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
                    ? "Enter new password"
                    : "At least 6 characters"
                }
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-3.5 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 uppercase tracking-wider"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create Account"
                : mode === "login"
                  ? "Login"
                  : mode === "forgot"
                    ? "Send Reset Link"
                    : "Update Password"}
          </button>
        </form>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 break-words rounded-xl p-3 text-xs font-bold border ${
              messageType === "error"
                ? "border-rose-500/30 bg-rose-950/60 text-rose-300"
                : "border-emerald-500/30 bg-emerald-950/60 text-emerald-300"
            }`}
          >
            {message}
          </div>
        )}

        {(mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            onClick={() => changeMode("login")}
            className="mt-5 w-full text-center text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            ← Back to Login
          </button>
        )}

        <p className="mt-6 text-center text-[10px] text-slate-500">
          By continuing, you agree to Apna Bazaar&apos;s Terms & Secure Policy.
        </p>
      </div>
    </main>
  );
}