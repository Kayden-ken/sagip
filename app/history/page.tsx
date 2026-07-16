"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Shield,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type IncidentHistoryItem = {
  id: string;
  emergency_type: string | null;
  description: string | null;
  address: string | null;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  responder_id: string | null;
};

type ResponderSummary = {
  id: string;
  full_name: string | null;
  agency: string | null;
};

export default function HistoryPage() {
  const router = useRouter();

  const [incidents, setIncidents] =
    useState<IncidentHistoryItem[]>([]);

  const [responders, setResponders] =
    useState<Record<string, ResponderSummary>>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        setError(
          "Please complete and save your profile first.",
        );
        setIsLoading(false);
        return;
      }

      const {
        data: incidentRows,
        error: incidentError,
      } = await supabase
        .from("emergency_requests")
        .select(`
          id,
          emergency_type,
          description,
          address,
          status,
          created_at,
          accepted_at,
          arrived_at,
          completed_at,
          responder_id
        `)
        .eq("profile_id", profile.id)
        .in("status", ["Completed", "Cancelled"])
        .order("created_at", {
          ascending: false,
        });

      if (incidentError) {
        setError(incidentError.message);
        setIsLoading(false);
        return;
      }

      const historyRows = incidentRows ?? [];

      setIncidents(historyRows);

      const responderIds = Array.from(
        new Set(
          historyRows
            .map((incident) => incident.responder_id)
            .filter(
              (id): id is string =>
                Boolean(id),
            ),
        ),
      );

      if (responderIds.length > 0) {
        const {
          data: responderRows,
          error: responderError,
        } = await supabase
          .from("responders")
          .select("id, full_name, agency")
          .in("id", responderIds);

        if (responderError) {
          console.error(
            responderError.message,
          );
        } else {
          const responderMap =
            Object.fromEntries(
              (responderRows ?? []).map(
                (responder) => [
                  responder.id,
                  responder,
                ],
              ),
            );

          setResponders(responderMap);
        }
      }

      setIsLoading(false);
    }

    loadHistory();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading incident history...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
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
                Incident History
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div>
          <h1 className="text-3xl font-extrabold">
            Incident History
          </h1>

          <p className="mt-2 text-slate-500">
            Review completed and cancelled emergency requests.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {incidents.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <ShieldAlert className="mx-auto size-12 text-slate-300" />

            <h2 className="mt-5 text-2xl font-extrabold">
              No incident history yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              Completed and cancelled emergency requests will appear here.
            </p>
          </section>
        ) : (
          <div className="mt-8 space-y-5">
            {incidents.map((incident) => {
              const responder =
                incident.responder_id
                  ? responders[
                      incident.responder_id
                    ]
                  : null;

              return (
                <article
                  key={incident.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                          incident.status ===
                          "Completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {incident.status ===
                        "Completed" ? (
                          <CheckCircle2 className="size-6" />
                        ) : (
                          <XCircle className="size-6" />
                        )}
                      </span>

                      <div>
                        <h2 className="text-xl font-extrabold">
                          {incident.emergency_type ||
                            "Emergency Request"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(
                            incident.created_at,
                          )}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        incident.status ||
                        "Unknown"
                      }
                    />
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <HistoryDetail
                      icon={MapPin}
                      label="Location"
                      value={
                        incident.address ||
                        "Address unavailable"
                      }
                    />

                    <HistoryDetail
                      icon={UserRound}
                      label="Responder"
                      value={
                        responder
                          ? `${responder.full_name || "Emergency Responder"}${
                              responder.agency
                                ? ` — ${responder.agency}`
                                : ""
                            }`
                          : "No responder assigned"
                      }
                    />

                    <HistoryDetail
                      icon={CalendarDays}
                      label="Completed"
                      value={
                        incident.completed_at
                          ? formatDateTime(
                              incident.completed_at,
                            )
                          : "Not completed"
                      }
                    />

                    <HistoryDetail
                      icon={Clock3}
                      label="Response duration"
                      value={calculateDuration(
                        incident.created_at,
                        incident.completed_at,
                      )}
                    />
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </p>

                    <p className="mt-3 leading-7 text-slate-700">
                      {incident.description ||
                        "No description was provided."}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

type StatusBadgeProps = {
  status: string;
};

function StatusBadge({
  status,
}: StatusBadgeProps) {
  const classes =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-200 text-slate-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${classes}`}
    >
      {status}
    </span>
  );
}

type HistoryDetailProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
};

function HistoryDetail({
  icon: Icon,
  label,
  value,
}: HistoryDetailProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <Icon className="size-5" />
      </span>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
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

function calculateDuration(
  createdAt: string,
  completedAt: string | null,
) {
  if (!completedAt) {
    return "Unavailable";
  }

  const start = new Date(createdAt).getTime();
  const end = new Date(completedAt).getTime();

  const totalMinutes = Math.max(
    0,
    Math.round((end - start) / 60000),
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} minute${
      totalMinutes === 1 ? "" : "s"
    }`;
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  return `${hours} hour${
    hours === 1 ? "" : "s"
  }${minutes ? ` ${minutes} minutes` : ""}`;
}