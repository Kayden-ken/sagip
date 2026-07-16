"use client";

import NotificationBell from "@/components/notification-bell";
import { supabase } from "@/lib/supabase";
import {
  ClipboardList,
  Clock3,
  HeartHandshake,
  HeartPulse,
  LogOut,
  MapPin,
  MessageCircle,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
};

type ActiveEmergencyRequest = {
  id: string;
  emergency_type: string | null;
  address: string | null;
  status: string | null;
  created_at: string;
};

const quickActions = [
  {
    title: "Request Emergency",
    description:
      "Send an emergency request with your current location.",
    href: "/emergency",
    icon: HeartPulse,
    urgent: true,
  },
  {
    title: "Track Request",
    description:
      "Monitor the status of your active emergency request.",
    href: "/requests",
    icon: MapPin,
    urgent: false,
  },
  {
    title: "Messages",
    description:
      "Communicate with assigned responders or dispatchers.",
    href: "/messages",
    icon: MessageCircle,
    urgent: false,
  },
  {
    title: "Incident History",
    description:
      "Review your previous emergency requests and outcomes.",
    href: "/history",
    icon: ClipboardList,
    urgent: false,
  },
  {
    title: "Emergency Contacts",
    description:
      "Manage people who should be contacted during an emergency.",
    href: "/emergency-contacts",
    icon: HeartHandshake,
    urgent: false,
  },
];

const activeStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [
    activeRequest,
    setActiveRequest,
  ] =
    useState<ActiveEmergencyRequest | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadActiveRequest = useCallback(
    async (selectedProfileId: string) => {
      const {
        data,
        error: requestError,
      } = await supabase
        .from("emergency_requests")
        .select(
          `
            id,
            emergency_type,
            address,
            status,
            created_at
          `,
        )
        .eq(
          "profile_id",
          selectedProfileId,
        )
        .in("status", activeStatuses)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (requestError) {
        console.error(
          "Unable to load active request:",
          requestError.message,
        );
        return;
      }

      setActiveRequest(data);
    },
    [],
  );

  useEffect(() => {
    let requestChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    async function initializeDashboard() {
      setError("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: responderData,
        error: responderError,
      } = await supabase
        .from("responders")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (responderError) {
        console.error(
          "Unable to check account role:",
          responderError.message,
        );
      }

      if (responderData) {
        router.replace(
          "/responder/dashboard",
        );
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name",
        )
        .eq("auth_id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(
          profileError.message,
        );
      }

      setProfile({
        firstName:
          profileData?.first_name ??
          String(
            user.user_metadata
              .first_name ?? "",
          ),
        lastName:
          profileData?.last_name ??
          String(
            user.user_metadata
              .last_name ?? "",
          ),
        email: user.email ?? "",
      });

      if (profileData?.id) {
        const selectedProfileId =
          profileData.id;

        await loadActiveRequest(
          selectedProfileId,
        );

        requestChannel = supabase
          .channel(
            `dashboard-request-${selectedProfileId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "emergency_requests",
              filter: `profile_id=eq.${selectedProfileId}`,
            },
            async () => {
              await loadActiveRequest(
                selectedProfileId,
              );
            },
          )
          .subscribe();
      }

      setIsLoading(false);
    }

    initializeDashboard();

    return () => {
      if (requestChannel) {
        supabase.removeChannel(
          requestChannel,
        );
      }
    };
  }, [
    loadActiveRequest,
    router,
  ]);

  async function handleLogout() {
    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(
        logoutError.message,
      );
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">
          Loading your SAGIP
          account...
        </p>
      </main>
    );
  }

  const fullName =
    `${profile?.firstName ?? ""} ${
      profile?.lastName ?? ""
    }`.trim();

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <Shield
                className="size-5"
                fill="currentColor"
              />
            </span>

            <div>
              <p className="text-xl font-extrabold">
                SAGIP
              </p>

              <p className="text-xs text-slate-500">
                Citizen Emergency Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell />

            <Link
              href="/profile"
              aria-label="Profile"
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-100"
            >
              <UserRound className="size-5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <LogOut className="size-4" />

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl bg-gradient-to-r from-red-600 to-red-800 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold text-red-100">
              Welcome back
            </p>

            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              {fullName ||
                "SAGIP Citizen"}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-red-100">
              Request emergency assistance,
              track active incidents, manage
              emergency contacts, and keep
              your profile information
              updated.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/emergency"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-extrabold text-red-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-red-50"
              >
                <HeartPulse className="size-5" />
                Request Emergency
              </Link>

              <Link
                href="/requests"
                className="inline-flex items-center justify-center rounded-xl bg-white/15 px-6 py-4 font-bold text-white transition hover:bg-white/25"
              >
                Track Active Request
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Account
            </p>

            <div className="mt-5 flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <UserRound className="size-7" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">
                  {fullName ||
                    "Citizen"}
                </p>

                <p className="truncate text-sm text-slate-500">
                  {profile?.email}
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="mt-6 block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Manage Profile
            </Link>
          </aside>
        </section>

        <section className="py-10">
          <div>
            <h2 className="text-2xl font-extrabold">
              Quick Actions
            </h2>

            <p className="mt-2 text-slate-500">
              Access your most important
              SAGIP services.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map(
              (action) => {
                const Icon =
                  action.icon;

                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className={`group rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                      action.urgent
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex size-12 items-center justify-center rounded-xl ${
                        action.urgent
                          ? "bg-red-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="size-6" />
                    </span>

                    <h3 className="mt-5 text-lg font-extrabold transition group-hover:text-red-700">
                      {action.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {
                        action.description
                      }
                    </p>
                  </Link>
                );
              },
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">
                  Active Request
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current emergency
                  request status
                </p>
              </div>

              {activeRequest ? (
                <StatusBadge
                  status={
                    activeRequest.status ??
                    "Pending"
                  }
                />
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  None
                </span>
              )}
            </div>

            {activeRequest ? (
              <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-red-700 text-white">
                        <HeartPulse className="size-6" />
                      </span>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                          Emergency type
                        </p>

                        <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                          {activeRequest.emergency_type ??
                            "Emergency Request"}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0 text-red-700" />

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Location
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                            {activeRequest.address ||
                              "Address unavailable"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 size-5 shrink-0 text-red-700" />

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Submitted
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDateTime(
                              activeRequest.created_at,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/requests"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
                  >
                    View Live Tracking
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <HeartPulse className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-bold text-slate-700">
                  No active emergency
                  request
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Your active request and
                  responder status will
                  appear here.
                </p>

                <Link
                  href="/emergency"
                  className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
                >
                  Request Assistance
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-extrabold">
              Safety Reminder
            </h2>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Keep your location services
              enabled and make sure your
              emergency contacts, medical
              information, and phone number
              are accurate.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/profile"
                className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                Review Profile
              </Link>

              <Link
                href="/emergency-contacts"
                className="block rounded-xl bg-red-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-red-800"
              >
                Manage Emergency
                Contacts
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type StatusBadgeProps = {
  status: string;
};

function StatusBadge({
  status,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${getStatusClasses(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function getStatusClasses(
  status: string,
) {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-800";

    case "Verified":
    case "Dispatched":
      return "bg-blue-100 text-blue-800";

    case "Accepted":
      return "bg-indigo-100 text-indigo-800";

    case "Responding":
      return "bg-violet-100 text-violet-800";

    case "Arrived":
      return "bg-orange-100 text-orange-800";

    case "In Progress":
      return "bg-cyan-100 text-cyan-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDateTime(
  dateValue: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(dateValue));
}