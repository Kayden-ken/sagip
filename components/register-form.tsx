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
import {
  useState,
} from "react";

export default function RegisterForm() {

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);



  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();

    setError("");
    setSuccess("");


    const form =
      event.currentTarget;


    const formData =
      new FormData(form);



    const firstName =
      String(
        formData.get("firstName") ?? "",
      ).trim();


    const lastName =
      String(
        formData.get("lastName") ?? "",
      ).trim();


    const email =
      String(
        formData.get("email") ?? "",
      )
      .trim()
      .toLowerCase();


    const phone =
      String(
        formData.get("phone") ?? "",
      ).trim();


    const password =
      String(
        formData.get("password") ?? "",
      );


    const confirmPassword =
      String(
        formData.get("confirmPassword") ?? "",
      );



    if (
      !firstName ||
      !lastName
    ) {

      setError(
        "Please enter your first and last name.",
      );

      return;

    }



    if (!email) {

      setError(
        "Please enter your email address.",
      );

      return;

    }



    if (
      password.length < 8
    ) {

      setError(
        "Password must contain at least 8 characters.",
      );

      return;

    }



    if (
      password !== confirmPassword
    ) {

      setError(
        "Passwords do not match.",
      );

      return;

    }



    setIsSubmitting(true);



    try {


      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email,
          password,

          options: {

            emailRedirectTo:
              `${window.location.origin}/login`,

            data: {

              first_name:
                firstName,

              last_name:
                lastName,

              full_name:
                `${firstName} ${lastName}`,

              phone,

              role:
                "citizen",

            },

          },

        });



      if (signUpError) {

        setError(
          signUpError.message,
        );

        return;

      }



      form.reset();



      if (
        data.user &&
        !data.session
      ) {

        setSuccess(
          "Account created successfully. Please check your email and verify your account before signing in.",
        );

        return;

      }



      setSuccess(
        "Account created successfully.",
      );


    } catch {

      setError(
        "Unable to create account. Please try again.",
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

      <div className="grid gap-5 sm:grid-cols-2">

        <InputField
          id="firstName"
          label="First name"
          icon={<UserRound />}
          placeholder="Enter first name"
          disabled={isSubmitting}
        />


        <InputField
          id="lastName"
          label="Last name"
          icon={<UserRound />}
          placeholder="Enter last name"
          disabled={isSubmitting}
        />

      </div>



      <InputField
        id="email"
        label="Email address"
        icon={<Mail />}
        placeholder="name@example.com"
        type="email"
        disabled={isSubmitting}
      />



      <InputField
        id="phone"
        label="Phone number"
        icon={<Phone />}
        placeholder="09XX XXX XXXX"
        disabled={isSubmitting}
      />
      <div className="grid gap-5 sm:grid-cols-2">

        <PasswordField
          id="password"
          label="Password"
          visible={showPassword}
          disabled={isSubmitting}
          onToggle={() =>
            setShowPassword(
              (current) => !current,
            )
          }
        />


        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          visible={showConfirmPassword}
          disabled={isSubmitting}
          onToggle={() =>
            setShowConfirmPassword(
              (current) => !current,
            )
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
          I agree to the SAGIP terms of service, privacy policy,
          and location sharing policy during an active emergency.
        </span>

      </label>




      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-red-700 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >

        {isSubmitting
          ? "Creating account..."
          : "Create Account"}

      </button>


    </form>
  );
}




type InputFieldProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  disabled: boolean;
};



function InputField({
  id,
  label,
  icon,
  placeholder,
  type = "text",
  disabled,
}: InputFieldProps) {

  return (

    <div>

      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>


      <div className="relative">

        <span className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400">
          {icon}
        </span>


        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          required
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
        />

      </div>

    </div>

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
          type={
            visible
              ? "text"
              : "password"
          }
          minLength={8}
          placeholder="At least 8 characters"
          required
          disabled={disabled}
          className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
        />


        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
