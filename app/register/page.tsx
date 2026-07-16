import RegisterForm from "@/components/register-form";
import Link from "next/link";
import {
  Check,
  Shield,
  UserRoundPlus,
} from "lucide-react";

const benefits = [
  "Quick emergency request submission",
  "Real-time request tracking",
  "Manage emergency contacts",
  "Access to nearby facilities",
];

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left information panel */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 px-10 text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute -left-24 top-16 size-72 rounded-full bg-white/5" />
          <div className="absolute -right-28 bottom-12 size-80 rounded-full bg-white/5" />
          <div className="absolute right-20 top-20 size-44 rounded-full bg-white/5" />

          <div className="relative z-10 w-full max-w-xl text-center">
            <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-white/10">
              <UserRoundPlus className="size-12" />
            </span>

            <h1 className="mt-8 text-4xl font-extrabold">
              Join SAGIP Today
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-red-100">
              Create your account to access emergency services, manage your
              profile, and connect with responders in your area.
            </p>

            <div className="mx-auto mt-9 max-w-lg rounded-2xl bg-white/10 p-6 text-left backdrop-blur-sm">
              <div className="space-y-5">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-4"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check className="size-5" />
                    </span>

                    <p className="font-semibold text-white">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right registration panel */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-3"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-red-700 text-white shadow-md">
                <Shield className="size-6" fill="currentColor" />
              </span>

              <span className="text-3xl font-extrabold tracking-tight">
                SAGIP
              </span>
            </Link>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-300/40 sm:p-8">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold">
                  Create Account
                </h2>

                <p className="mt-2 text-slate-500">
                  Fill in your details to get started
                </p>
              </div>

              <RegisterForm />

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-400">Or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-red-600 hover:text-red-700"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm font-medium text-slate-500 transition hover:text-red-600"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}