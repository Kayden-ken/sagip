"use client";

import { supabase } from "@/lib/supabase";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    const formData = new FormData(
      event.currentTarget,
    );

    const email = String(
      formData.get("email") ?? "",
    )
      .trim()
      .toLowerCase();

    const password = String(
      formData.get("password") ?? "",
    );

    if (!email || !password) {
      setError(
        "Please enter your email address and password.",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const {
        data: loginData,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = loginData.user;

      if (!user) {
        setError(
          "Unable to retrieve the signed-in account.",
        );
        return;
      }

      /*
       * Check the admins table first.
       * An active admin must always be sent to
       * /admin/dashboard before checking other roles.
       */
      const {
        data: admin,
        error: adminError,
      } = await supabase
        .from("admins")
        .select(
          `
            id,
            auth_id,
            full_name,
            role,
            status
          `,
        )
        .eq("auth_id", user.id)
        .maybeSingle();

      if (adminError) {
        await supabase.auth.signOut();

        setError(
          `Unable to check admin access: ${adminError.message}`,
        );
        return;
      }

      if (admin) {
        if (admin.status !== "Active") {
          await supabase.auth.signOut();

          setError(
            "Your administrator account is inactive. Please contact the system owner.",
          );
          return;
        }

        router.replace("/admin/dashboard");
        router.refresh();
        return;
      }

      /*
       * Check whether the account is a responder.
       */
      const {
        data: responder,
        error: responderError,
      } = await supabase
        .from("responders")
        .select("id, auth_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (responderError) {
        await supabase.auth.signOut();

        setError(
          `Unable to check responder access: ${responderError.message}`,
        );
        return;
      }

      if (responder) {
        router.replace(
          "/responder/dashboard",
        );
        router.refresh();
        return;
      }

      /*
       * Any authenticated account that is neither
       * an admin nor a responder is treated as a citizen.
       */
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      console.error(
        "Login error:",
        caughtError,
      );

      setError(
        "Unable to sign in. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-5"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Email Address
        </label>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Password
        </label>

        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="button"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            disabled={isSubmitting}
            onClick={() =>
              setShowPassword(
                (current) => !current,
              )
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="remember"
            disabled={isSubmitting}
            className="size-4 rounded border-slate-300 accent-red-600"
          />

          Remember me
        </label>

        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:from-red-700 hover:to-red-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isSubmitting && (
          <LoaderCircle className="size-5 animate-spin" />
        )}

        {isSubmitting
          ? "Signing In..."
          : "Sign In"}
      </button>
    </form>
  );
}