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
import {
  useEffect,
  useState,
} from "react";

export default function LoginForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);



  useEffect(() => {

    const savedEmail =
      localStorage.getItem(
        "sagip_remember_email",
      );


    if (savedEmail) {

      setEmail(savedEmail);

      setRememberMe(true);

    }

  }, []);




  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();

    setError("");

    setIsSubmitting(true);



    const password =
      String(
        new FormData(
          event.currentTarget,
        ).get("password") ?? "",
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

        setError(
          loginError.message,
        );

        return;

      }



      const user =
        loginData.user;



      if (!user) {

        setError(
          "Unable to retrieve account information.",
        );

        return;

      }




      /*
       * Check admin FIRST.
       *
       * Admin accounts are manually created
       * trusted accounts.
       */
      const {
        data: admin,
        error: adminError,
      } =
        await supabase
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
          .eq(
            "auth_id",
            user.id,
          )
          .maybeSingle();



      if (adminError) {

        await supabase.auth.signOut();

        setError(
          adminError.message,
        );

        return;

      }




      if (admin) {


        if (
          admin.status !==
          "Active"
        ) {

          await supabase.auth.signOut();


          setError(
            "Your administrator account is inactive.",
          );


          return;

        }



        router.replace(
          "/admin/dashboard",
        );


        router.refresh();


        return;

      }




      /*
       * Citizens and responders
       * require verified email.
       */
      if (
        !user.email_confirmed_at
      ) {


        await supabase.auth.signOut();



        setError(
          "Please verify your email address before signing in. Check your inbox for the verification email.",
        );


        return;

      }




      /*
       * Remember email
       */
      if (rememberMe) {

        localStorage.setItem(
          "sagip_remember_email",
          email,
        );

      } else {

        localStorage.removeItem(
          "sagip_remember_email",
        );

      }





      /*
       * Check responder
       */
      const {
        data: responder,
        error: responderError,
      } =
        await supabase
          .from("responders")
          .select(
            "id, auth_id",
          )
          .eq(
            "auth_id",
            user.id,
          )
          .maybeSingle();




      if (responderError) {

        await supabase.auth.signOut();


        setError(
          responderError.message,
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
       * Citizen
       */
      router.replace(
        "/dashboard",
      );


      router.refresh();



    } catch (error) {


      console.error(
        "Login error:",
        error,
      );


      setError(
        "Unable to sign in. Please try again.",
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
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
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
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
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
                (current) =>
                  !current,
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
            checked={rememberMe}
            onChange={(event) =>
              setRememberMe(
                event.target.checked,
              )
            }
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 px-5 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:from-red-700 hover:to-red-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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