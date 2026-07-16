"use client";

import { supabase } from "@/lib/supabase";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = String(
      formData.get("firstName") ?? "",
    ).trim();

    const lastName = String(
      formData.get("lastName") ?? "",
    ).trim();

    const email = String(
      formData.get("email") ?? "",
    )
      .trim()
      .toLowerCase();

    const phone = String(
      formData.get("phone") ?? "",
    ).trim();

    const password = String(
      formData.get("password") ?? "",
    );

    const confirmPassword = String(
      formData.get("confirmPassword") ?? "",
    );

    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
              phone,
              role: "citizen",
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      form.reset();

      if (data.session) {
        setSuccess("Your account was created successfully.");

        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        setSuccess(
          "Your account was created. Please check your email and confirm your account before signing in.",
        );

        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setError(
        "Unable to create your account. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            First name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Enter first name"
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Last name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Enter last name"
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Email address
        </label>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Phone number
        </label>

        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="09XX XXX XXXX"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField
          id="password"
          label="Password"
          visible={showPassword}
          disabled={isSubmitting}
          onToggle={() =>
            setShowPassword((current) => !current)
          }
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          visible={showConfirmPassword}
          disabled={isSubmitting}
          onToggle={() =>
            setShowConfirmPassword((current) => !current)
          }
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {success}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          name="terms"
          required
          disabled={isSubmitting}
          className="mt-1 size-4 accent-red-600"
        />

        <span>
          I agree to the SAGIP terms of service, privacy policy, and location
          sharing policy during an active emergency.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-red-700 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  visible: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function PasswordField({
  id,
  label,
  visible,
  disabled,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={
            id === "password" ? "new-password" : "off"
          }
          placeholder="At least 8 characters"
          minLength={8}
          required
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed"
        >
          {visible ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}