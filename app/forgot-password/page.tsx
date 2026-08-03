"use client";

import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  Shield,
} from "lucide-react";
import Link from "next/link";
import {
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);



  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();


    setMessage("");
    setError("");

    setLoading(true);



    try {

      console.log(
        "Sending password reset request:",
        email,
      );



      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          },
        );



      if (error) {

        console.error(
          "Supabase reset error:",
          error,
        );


        setError(
          error.message,
        );


        return;

      }



      console.log(
        "Password reset email requested successfully",
      );



      setMessage(
        "Password reset link has been sent. Please check your email.",
      );



    } catch (error) {


      console.error(
        "Forgot password error:",
        error,
      );


      setError(
        "Unable to send password reset email. Please try again.",
      );


    } finally {

      setLoading(false);

    }

  }



  return (

    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">


      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">


        <div className="text-center">


          <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-red-700 text-white">
            <Shield className="size-7" />
          </span>


          <h1 className="mt-5 text-3xl font-extrabold">
            Forgot Password
          </h1>


          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we will send you a password reset link.
          </p>


        </div>




        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >



          <div>


            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Email Address
            </label>



            <div className="relative">


              <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/>


              <input

                id="email"

                type="email"

                value={email}

                onChange={(e)=>
                  setEmail(
                    e.target.value,
                  )
                }

                placeholder="you@example.com"

                required

                disabled={loading}

                className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pl-12 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"

              />


            </div>


          </div>





          {message && (

            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">

              {message}

            </div>

          )}





          {error && (

            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">

              {error}

            </div>

          )}






          <button

            type="submit"

            disabled={loading}

            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 font-bold text-white transition hover:bg-red-800 disabled:opacity-50"

          >


            {loading && (

              <LoaderCircle className="size-5 animate-spin"/>

            )}



            {loading
              ? "Sending..."
              : "Send Reset Link"}



          </button>




        </form>





        <Link

          href="/login"

          className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"

        >

          <ArrowLeft className="size-4"/>

          Back to Login


        </Link>



      </section>


    </main>

  );
}