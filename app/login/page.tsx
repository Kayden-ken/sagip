import LoginForm from "@/components/login-forn";
import Link from "next/link";
import {
  ArrowLeft,
  Bolt,
  HeartHandshake,
  MapPin,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
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
                <h1 className="text-3xl font-extrabold">
                  Welcome back
                </h1>

                <p className="mt-2 text-slate-500">
                  Sign in to your account to continue
                </p>
              </div>

              <LoginForm />

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-400">Or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-bold text-red-600 hover:text-red-700"
                >
                  Create one
                </Link>
              </p>
            </div>

            <div className="mt-7 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-red-600"
              >
                <ArrowLeft className="size-4" />
                Back to home
              </Link>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 px-10 text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute -left-24 top-20 size-72 rounded-full bg-white/5" />
          <div className="absolute -right-20 bottom-10 size-80 rounded-full bg-white/5" />
          <div className="absolute right-24 top-24 size-40 rounded-full bg-white/5" />

          <div className="relative z-10 max-w-xl text-center">
            <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-white/10">
              <HeartHandshake className="size-12" fill="currentColor" />
            </span>

            <h2 className="mt-8 text-4xl font-extrabold">
              Your Safety, Our Priority
            </h2>

            <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-red-100">
              Access emergency services quickly, manage your profile, and stay
              connected with responders when you need them most.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <FeatureBadge icon={Bolt} label="Quick Response" />
              <FeatureBadge icon={MapPin} label="Live Tracking" />
              <FeatureBadge icon={Users} label="24/7 Support" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type FeatureBadgeProps = {
  icon: LucideIcon;
  label: string;
};

function FeatureBadge({ icon: Icon, label }: FeatureBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur-sm">
      <Icon className="size-4" fill="currentColor" />
      {label}
    </div>
  );
}