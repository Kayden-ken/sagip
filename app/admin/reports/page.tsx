"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Printer,
  RefreshCw,
  ShieldCheck,
  Siren,
  Timer,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import {
  createDefaultReportFilters,
  getAdminReports,
  type AdminReportsData,
  type ReportEmergency,
  type ReportFilters,
} from "@/lib/admin-reports";

type AdminProfile = {
  full_name: string | null;
  role: string | null;
};

export default function AdminReportsPage() {
  const router = useRouter();

  const [admin, setAdmin] =
    useState<AdminProfile | null>(null);

  const [filters, setFilters] =
    useState<ReportFilters>(
      createDefaultReportFilters(),
    );

  const [data, setData] =
    useState<AdminReportsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadReports = useCallback(
    async (nextFilters: ReportFilters) => {
      setError("");

      try {
        const reportData =
          await getAdminReports(nextFilters);

        setData(reportData);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load reports.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: adminData,
        error: adminError,
      } = await supabase
        .from("admins")
        .select("full_name, role")
        .eq("auth_id", user.id)
        .eq("status", "Active")
        .maybeSingle();

      if (adminError) {
        setError(adminError.message);
        setLoading(false);
        return;
      }

      if (!adminData) {
        router.replace("/dashboard");
        return;
      }

      setAdmin(adminData);
      await loadReports(filters);
      setLoading(false);
    }

    initialize();
  }, [filters, loadReports, router]);

  const reportTitle = useMemo(() => {
    if (!data) {
      return "Administrative Reports";
    }

    return `${formatDateOnly(
      data.filters.startDate,
    )} – ${formatDateOnly(
      data.filters.endDate,
    )}`;
  }, [data]);

  async function handleApplyFilters() {
    setRefreshing(true);

    try {
      await loadReports(filters);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleResetFilters() {
    const defaults =
      createDefaultReportFilters();

    setFilters(defaults);
    setRefreshing(true);

    try {
      await loadReports(defaults);
    } finally {
      setRefreshing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleCsvExport() {
    if (!data) {
      return;
    }

    const csv = createEmergencyCsv(
      data.emergencies,
    );

    downloadTextFile(
      csv,
      `sagip-emergency-report-${data.filters.startDate}-to-${data.filters.endDate}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading reports...
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          #reports-print-area,
          #reports-print-area * {
            visibility: visible;
          }

          #reports-print-area {
            position: static !important;
            width: 100% !important;
          }

          .print-hidden {
            display: none !important;
          }

          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-table {
            font-size: 10px !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
        <header className="print-hidden border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
                <BarChart3 className="size-6" />
              </span>

              <div>
                <p className="text-xl font-extrabold">
                  SAGIP Reports
                </p>

                <p className="text-xs text-slate-500">
                  Administrative Reporting Center
                </p>
              </div>
            </div>

            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-8">
          {error && (
            <div
              role="alert"
              className="print-hidden mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          )}

          <section className="print-hidden rounded-3xl bg-gradient-to-r from-red-700 to-red-900 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold text-red-100">
              Administrative reporting
            </p>

            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Emergency Reports
            </h1>

            <p className="mt-3 text-red-100">
              Prepared for{" "}
              {admin?.full_name ||
                "SAGIP Administrator"}
            </p>

            <p className="mt-5 max-w-3xl leading-7 text-red-100">
              Review emergency activity, response
              performance, completion rates, and
              responder outcomes.
            </p>
          </section>

          <section className="print-hidden mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Filter className="size-5" />
              </span>

              <div>
                <h2 className="text-xl font-extrabold">
                  Report Filters
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a date range and optional
                  emergency filters.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterField label="Start Date">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      startDate:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </FilterField>

              <FilterField label="End Date">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      endDate:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </FilterField>

              <FilterField label="Status">
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                >
                  <option value="All">
                    All statuses
                  </option>

                  {data?.statuses.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ),
                  )}
                </select>
              </FilterField>

              <FilterField label="Emergency Type">
                <select
                  value={filters.emergencyType}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      emergencyType:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                >
                  <option value="All">
                    All emergency types
                  </option>

                  {data?.emergencyTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ),
                  )}
                </select>
              </FilterField>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
              >
                {refreshing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Apply Filters
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleCsvExport}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                <Download className="size-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Printer className="size-4" />
                Print / Save PDF
              </button>
            </div>
          </section>

          {data && (
            <div
              id="reports-print-area"
              className="mt-8 space-y-8"
            >
              <section className="print-avoid-break rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-700">
                      SAGIP
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold">
                      Emergency Activity Report
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Reporting period:{" "}
                      {reportTitle}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 px-5 py-4 text-sm">
                    <p className="font-bold text-slate-700">
                      Prepared by
                    </p>

                    <p className="mt-1 text-slate-500">
                      {admin?.full_name ||
                        "SAGIP Administrator"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                <ReportCard
                  title="Total"
                  value={data.summary.total}
                  icon={FileSpreadsheet}
                  tone="blue"
                />

                <ReportCard
                  title="Pending"
                  value={data.summary.pending}
                  icon={Clock3}
                  tone="amber"
                />

                <ReportCard
                  title="Active"
                  value={data.summary.active}
                  icon={Siren}
                  tone="red"
                />

                <ReportCard
                  title="Completed"
                  value={data.summary.completed}
                  icon={CheckCircle2}
                  tone="emerald"
                />

                <ReportCard
                  title="Cancelled"
                  value={data.summary.cancelled}
                  icon={XCircle}
                  tone="slate"
                />
              </section>

              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Completion Rate"
                  value={`${data.summary.completionRate}%`}
                  icon={ShieldCheck}
                />

                <MetricCard
                  title="Average Acceptance"
                  value={formatDuration(
                    data.summary
                      .averageAcceptanceMinutes,
                  )}
                  icon={Timer}
                />

                <MetricCard
                  title="Average Arrival"
                  value={formatDuration(
                    data.summary
                      .averageArrivalMinutes,
                  )}
                  icon={CalendarDays}
                />

                <MetricCard
                  title="Average Resolution"
                  value={formatDuration(
                    data.summary
                      .averageResolutionMinutes,
                  )}
                  icon={Clock3}
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
                <section className="print-avoid-break rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-extrabold">
                    Emergency Types
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Distribution within the selected
                    reporting period.
                  </p>

                  {data.emergencyTypeSummary.length ===
                  0 ? (
                    <p className="mt-6 text-sm text-slate-500">
                      No records found.
                    </p>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {data.emergencyTypeSummary.map(
                        (item) => (
                          <div
                            key={
                              item.emergencyType
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-bold text-slate-700">
                                {
                                  item.emergencyType
                                }
                              </p>

                              <p className="shrink-0 text-sm font-extrabold">
                                {item.count}{" "}
                                <span className="font-semibold text-slate-400">
                                  ({item.percentage}
                                  %)
                                </span>
                              </p>
                            </div>

                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-red-700"
                                style={{
                                  width: `${item.percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <UserRound className="size-6 text-violet-700" />

                    <div>
                      <h3 className="text-xl font-extrabold">
                        Responder Performance
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Performance based on assigned
                        incidents in the selected
                        period.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="print-table min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-3">
                            Responder
                          </th>
                          <th className="px-3 py-3">
                            Assigned
                          </th>
                          <th className="px-3 py-3">
                            Completed
                          </th>
                          <th className="px-3 py-3">
                            Rate
                          </th>
                          <th className="px-3 py-3">
                            Accept
                          </th>
                          <th className="px-3 py-3">
                            Arrive
                          </th>
                          <th className="px-3 py-3">
                            Resolve
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.responderPerformance.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-10 text-center text-slate-500"
                            >
                              No responder performance
                              records found.
                            </td>
                          </tr>
                        ) : (
                          data.responderPerformance.map(
                            (item) => (
                              <tr
                                key={
                                  item.responderId
                                }
                                className="border-b border-slate-100"
                              >
                                <td className="px-3 py-4">
                                  <p className="font-extrabold text-slate-800">
                                    {
                                      item.responderName
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.agency}
                                  </p>
                                </td>

                                <td className="px-3 py-4 font-bold">
                                  {item.assigned}
                                </td>

                                <td className="px-3 py-4 font-bold text-emerald-700">
                                  {item.completed}
                                </td>

                                <td className="px-3 py-4 font-extrabold">
                                  {
                                    item.completionRate
                                  }
                                  %
                                </td>

                                <td className="px-3 py-4">
                                  {formatDuration(
                                    item.averageAcceptanceMinutes,
                                  )}
                                </td>

                                <td className="px-3 py-4">
                                  {formatDuration(
                                    item.averageArrivalMinutes,
                                  )}
                                </td>

                                <td className="px-3 py-4">
                                  {formatDuration(
                                    item.averageResolutionMinutes,
                                  )}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold">
                    Emergency Records
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Detailed records matching the
                    selected filters.
                  </p>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="print-table min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-3">
                          Date
                        </th>
                        <th className="px-3 py-3">
                          Type
                        </th>
                        <th className="px-3 py-3">
                          Citizen
                        </th>
                        <th className="px-3 py-3">
                          Address
                        </th>
                        <th className="px-3 py-3">
                          Responder
                        </th>
                        <th className="px-3 py-3">
                          Status
                        </th>
                        <th className="print-hidden px-3 py-3">
                          Details
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.emergencies.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-12 text-center text-slate-500"
                          >
                            No emergency records match
                            the selected filters.
                          </td>
                        </tr>
                      ) : (
                        data.emergencies.map(
                          (item) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 align-top"
                            >
                              <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                                {formatDateTime(
                                  item.createdAt,
                                )}
                              </td>

                              <td className="px-3 py-4 font-extrabold">
                                {
                                  item.emergencyType
                                }
                              </td>

                              <td className="px-3 py-4">
                                {item.citizenName ||
                                  "Unavailable"}
                              </td>

                              <td className="max-w-xs px-3 py-4 text-slate-600">
                                {item.address ||
                                  "Unavailable"}
                              </td>

                              <td className="px-3 py-4">
                                <p className="font-bold">
                                  {item.responderName ||
                                    "Not assigned"}
                                </p>

                                {item.responderAgency && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      item.responderAgency
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-3 py-4">
                                <StatusBadge
                                  status={
                                    item.status
                                  }
                                />
                              </td>

                              <td className="print-hidden px-3 py-4">
                                <Link
                                  href={`/admin/incidents/${item.id}`}
                                  className="font-bold text-red-700 hover:text-red-800"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
                Generated by the SAGIP Emergency
                Response Management System on{" "}
                {formatDateTime(
                  new Date().toISOString(),
                )}
                .
              </footer>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReportCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tone:
    | "blue"
    | "amber"
    | "red"
    | "emerald"
    | "slate";
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    emerald:
      "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-200 text-slate-700",
  };

  return (
    <article className="print-avoid-break rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`flex size-11 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="size-5" />
      </span>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-extrabold">
        {value}
      </p>
    </article>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <article className="print-avoid-break rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-extrabold">
            {value}
          </p>
        </div>

        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Icon className="size-5" />
        </span>
      </div>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${getStatusClasses(
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
      return "bg-blue-100 text-blue-800";
    case "Dispatched":
      return "bg-cyan-100 text-cyan-800";
    case "Accepted":
      return "bg-indigo-100 text-indigo-800";
    case "Responding":
      return "bg-violet-100 text-violet-800";
    case "Arrived":
      return "bg-orange-100 text-orange-800";
    case "In Progress":
      return "bg-red-100 text-red-800";
    case "Completed":
      return "bg-emerald-100 text-emerald-800";
    case "Cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function createEmergencyCsv(
  emergencies: ReportEmergency[],
) {
  const headers = [
    "Incident ID",
    "Created At",
    "Emergency Type",
    "Citizen",
    "Address",
    "Responder",
    "Agency",
    "Status",
    "Accepted At",
    "Arrived At",
    "Completed At",
  ];

  const rows = emergencies.map((item) => [
    item.id,
    item.createdAt,
    item.emergencyType,
    item.citizenName ?? "",
    item.address ?? "",
    item.responderName ?? "",
    item.responderAgency ?? "",
    item.status,
    item.acceptedAt ?? "",
    item.arrivedAt ?? "",
    item.completedAt ?? "",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) =>
          `"${String(value).replace(
            /"/g,
            '""',
          )}"`,
        )
        .join(","),
    )
    .join("\n");
}

function downloadTextFile(
  content: string,
  fileName: string,
  mimeType: string,
) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function formatDuration(
  minutes: number | null,
) {
  if (minutes === null) {
    return "No data";
  }

  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining =
    Math.round(minutes % 60);

  return remaining > 0
    ? `${hours}h ${remaining}m`
    : `${hours}h`;
}

function formatDateOnly(
  value: string,
) {
  const date = new Date(
    `${value}T00:00:00`,
  );

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}