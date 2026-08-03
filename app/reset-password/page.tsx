"use client";

import {
  LoaderCircle,
  LockKeyhole,
  Shield,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";


export default function ResetPasswordPage() {

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [ready, setReady] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");



  useEffect(() => {

    let mounted = true;


    async function initializeRecovery() {

      try {

        /*
         * PKCE recovery flow
         * Supabase sends ?code=
         */
        const url =
          new URL(
            window.location.href,
          );


        const code =
          url.searchParams.get(
            "code",
          );


        if (code) {

          const {
            error,
          } =
            await supabase.auth.exchangeCodeForSession(
              code,
            );


          if (!error) {

            if (mounted) {
              setReady(true);
              setChecking(false);
            }

            return;
          }

        }



        /*
         * Existing session check
         */
        const {
          data,
        } =
          await supabase.auth.getSession();


        if (
          data.session
        ) {

          if (mounted) {
            setReady(true);
            setChecking(false);
          }

          return;
        }




        /*
         * Listen for recovery event
         */
        const {
          data: listener,
        } =
          await supabase.auth.onAuthStateChange(
            (
              event,
              session,
            ) => {


              console.log(
                "SUPABASE AUTH EVENT:",
                event,
              );


              if (
                event ===
                "PASSWORD_RECOVERY"
              ) {

                if (mounted) {
                  setReady(true);
                  setChecking(false);
                }

              }



              if (
                session
              ) {

                if (mounted) {
                  setReady(true);
                  setChecking(false);
                }

              }

            },
          );



        /*
         * Timeout fallback
         */
        setTimeout(() => {

          if (
            mounted &&
            !ready
          ) {

            setChecking(false);

            setError(
              "Invalid or expired password reset link.",
            );

          }

        }, 5000);



        return () => {
          listener.subscription.unsubscribe();
        };


      } catch (error) {

        console.error(
          "Recovery error:",
          error,
        );


        if (mounted) {

          setChecking(false);

          setError(
            "Unable to verify password reset link.",
          );

        }

      }

    }


    initializeRecovery();



    return () => {
      mounted = false;
    };


  }, []);




  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();


    setError("");
    setMessage("");



    if (
      password.length < 6
    ) {

      setError(
        "Password must be at least 6 characters.",
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



    setLoading(true);



    try {

      const {
        error,
      } =
        await supabase.auth.updateUser({
          password,
        });



      if (error) {

        setError(
          error.message,
        );

        return;
      }



      setMessage(
        "Password updated successfully. You can now login.",
      );


      setPassword("");
      setConfirmPassword("");



    } catch (error) {

      console.error(
        "Update password error:",
        error,
      );


      setError(
        "Unable to update password.",
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
            Reset Password
          </h1>



          <p className="mt-2 text-sm text-slate-500">
            Create a new password for your SAGIP account.
          </p>


        </div>





        {checking && (

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">

            <LoaderCircle className="size-5 animate-spin" />

            Checking reset link...

          </div>

        )}






        {!checking && error && (

          <div className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">

            {error}

          </div>

        )}







        {ready && (

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >


            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                New Password
              </label>


              <div className="relative">

                <LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/>


                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value,
                    )
                  }
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pl-12 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />


              </div>

            </div>





            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Confirm Password
              </label>


              <div className="relative">

                <LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"/>


                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value,
                    )
                  }
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 pl-12 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />

              </div>

            </div>





            {message && (

              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">

                {message}

              </div>

            )}






            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
            >

              {loading && (
                <LoaderCircle className="size-5 animate-spin" />
              )}


              {loading
                ? "Updating..."
                : "Update Password"}


            </button>



          </form>

        )}





        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-bold text-red-600 hover:text-red-700"
        >
          Back to Login
        </Link>


      </section>


    </main>

  );
}