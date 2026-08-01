"use client";

import type {
  IncidentDetailsData,
  IncidentTimeline,
} from "@/lib/incident-details";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
  Siren,
  UserRound,
} from "lucide-react";
import Link from "next/link";

type IncidentDetailsProps = {
  incident: IncidentDetailsData;
  administratorName?: string | null;
};

export default function IncidentDetails({
  incident,
  administratorName,
}: IncidentDetailsProps) {
  const mapUrl = createMapUrl(
    incident.latitude,
    incident.longitude,
  );

  const timelineItems =
    createTimelineItems(
      incident.timeline,
    );

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
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

          #incident-report,
          #incident-report * {
            visibility: visible;
          }

          #incident-report {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
          }

          #incident-report > header {
            break-after: avoid;
            page-break-after: avoid;
          }

          #incident-report > div {
            padding: 0 !important;
          }

          .print-hidden {
            display: none !important;
          }

          .print-avoid-break,
          .incident-section,
          .responder-section,
          .signature-section,
          .timeline-item,
          .metric-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .timeline-grid,
          .metrics-grid {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
        }
      `}</style>

      <div className="print-hidden mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
        >
          <Printer className="size-4" />
          Print or Save as PDF
        </button>
      </div>

      <article
        id="incident-report"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="bg-gradient-to-r from-red-700 to-red-900 px-6 py-8 text-white sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <ShieldCheck className="size-8" />
              </span>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-100">
                  SAGIP
                </p>

                <h1 className="mt-1 text-3xl font-extrabold">
                  Incident Report
                </h1>

                <p className="mt-2 text-sm text-red-100">
                  Emergency Response Management
                  System
                </p>
              </div>
            </div>

            <StatusBadge
              status={incident.status}
            />
          </div>
        </header>

        <div className="space-y-8 p-6 sm:p-10">
          <section className="print-avoid-break grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              label="Incident ID"
              value={incident.id}
            />

            <SummaryItem
              label="Emergency Type"
              value={incident.emergencyType}
            />

            <SummaryItem
              label="Reported"
              value={formatDateTime(
                incident.timeline.reportedAt,
              )}
            />

            <SummaryItem
              label="Last Updated"
              value={formatDateTime(
                incident.updatedAt,
              )}
            />
          </section>

          <section className="print-avoid-break rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <Siren className="mt-0.5 size-5 shrink-0 text-red-700" />

              <div>
                <h2 className="font-extrabold text-red-900">
                  Incident Description
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-red-900/80">
                  {incident.description ||
                    "No incident description was provided."}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <InformationPanel
              title="Citizen Information"
              icon={UserRound}
              className="incident-section"
            >
              <DetailRow
                label="Full Name"
                value={
                  incident.citizen
                    ?.fullName ??
                  "Citizen record unavailable"
                }
              />

              <DetailRow
                label="Phone"
                value={
                  incident.citizen
                    ?.phone ??
                  "Not provided"
                }
                icon={Phone}
              />

              <DetailRow
                label="Email"
                value={
                  incident.citizen
                    ?.email ??
                  "Not provided"
                }
              />

              <DetailRow
                label="Registered Address"
                value={
                  incident.citizen
                    ?.address ??
                  "Not provided"
                }
              />
            </InformationPanel>

            <InformationPanel
              title="Assigned Responder"
              icon={ShieldCheck}
              className="incident-section responder-section"
            >
              <DetailRow
                label="Full Name"
                value={
                  incident.responder
                    ?.fullName ??
                  "No responder assigned"
                }
              />

              <DetailRow
                label="Agency"
                value={
                  incident.responder
                    ?.agency ??
                  "Not provided"
                }
              />

              <DetailRow
                label="Phone"
                value={
                  incident.responder
                    ?.phone ??
                  "Not provided"
                }
                icon={Phone}
              />

              <DetailRow
                label="Responder Status"
                value={
                  incident.responder
                    ?.status ??
                  "Not available"
                }
              />
            </InformationPanel>
          </section>

          <section className="incident-section print-avoid-break rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <MapPin className="size-5" />
              </span>

              <div>
                <h2 className="text-lg font-extrabold">
                  Incident Location
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recorded location of the
                  emergency request.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <SummaryItem
                label="Address"
                value={
                  incident.address ??
                  "Address unavailable"
                }
              />

              <SummaryItem
                label="Latitude"
                value={formatCoordinate(
                  incident.latitude,
                )}
              />

              <SummaryItem
                label="Longitude"
                value={formatCoordinate(
                  incident.longitude,
                )}
              />
            </div>

            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="print-hidden mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-800"
              >
                Open location in Google Maps
                <ExternalLink className="size-4" />
              </a>
            )}
          </section>

          <section>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <CalendarClock className="size-5" />
              </span>

              <div>
                <h2 className="text-lg font-extrabold">
                  Response Timeline
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recorded milestones for this
                  incident.
                </p>
              </div>
            </div>

            <div className="timeline-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {timelineItems.map((item) => (
                <TimelineItem
                  key={item.label}
                  label={item.label}
                  value={formatDateTime(
                    item.value,
                  )}
                  completed={Boolean(
                    item.value,
                  )}
                />
              ))}
            </div>
          </section>

          <section className="print-avoid-break">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Clock3 className="size-5" />
              </span>

              <div>
                <h2 className="text-lg font-extrabold">
                  Response Statistics
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Calculated from available
                  timestamps.
                </p>
              </div>
            </div>

            <div className="metrics-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Acceptance Time"
                value={formatDuration(
                  incident.durations
                    .acceptanceMinutes,
                )}
              />

              <MetricCard
                label="Dispatch to Acceptance"
                value={formatDuration(
                  incident.durations
                    .dispatchToAcceptanceMinutes,
                )}
              />

              <MetricCard
                label="Travel Time"
                value={formatDuration(
                  incident.durations
                    .travelMinutes,
                )}
              />

              <MetricCard
                label="Resolution Time"
                value={formatDuration(
                  incident.durations
                    .resolutionMinutes,
                )}
              />

              <MetricCard
                label="Total Incident Time"
                value={formatDuration(
                  incident.durations
                    .totalMinutes,
                )}
              />
            </div>
          </section>

          <section className="signature-section print-avoid-break grid gap-10 border-t border-slate-200 pt-10 sm:grid-cols-2">
            <SignatureField
              label="Administrator"
              name={
                administratorName ||
                "SAGIP Administrator"
              }
            />

            <SignatureField
              label="Assigned Responder"
              name={
                incident.responder
                  ?.fullName ||
                "Emergency Responder"
              }
            />
          </section>

          <footer className="border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-400">
            This report was generated by the
            SAGIP Emergency Response Management
            System on{" "}
            {formatDateTime(
              new Date().toISOString(),
            )}
            .
          </footer>
        </div>
      </article>
    </>
  );
}

function InformationPanel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`print-avoid-break rounded-2xl border border-slate-200 p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="size-5" />
        </span>

        <h2 className="text-lg font-extrabold">
          {title}
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div className="mt-1 flex items-start gap-2">
        {Icon && (
          <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
        )}

        <p className="break-words text-sm font-semibold leading-6 text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-extrabold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  completed,
}: {
  label: string;
  value: string;
  completed: boolean;
}) {
  return (
    <article className="timeline-item print-avoid-break flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
          completed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        <CheckCircle2 className="size-4" />
      </span>

      <div>
        <p className="text-sm font-extrabold">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {value}
        </p>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-extrabold text-slate-900">
        {value}
      </p>
    </article>
  );
}

function SignatureField({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  return (
    <div className="pt-12 text-center">
      <div className="border-b border-slate-500" />

      <p className="mt-2 font-extrabold">
        {name}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label} Signature
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`w-fit rounded-full px-4 py-2 text-xs font-extrabold ${getStatusClasses(
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
      return "bg-white/15 text-white";
  }
}

function createTimelineItems(
  timeline: IncidentTimeline,
) {
  return [
    {
      label: "Reported",
      value: timeline.reportedAt,
    },
    {
      label: "Verified",
      value: timeline.verifiedAt,
    },
    {
      label: "Dispatched",
      value: timeline.dispatchedAt,
    },
    {
      label: "Accepted",
      value: timeline.acceptedAt,
    },
    {
      label: "Responding",
      value: timeline.respondingAt,
    },
    {
      label: "Arrived",
      value: timeline.arrivedAt,
    },
    {
      label: "In Progress",
      value: timeline.startedAt,
    },
    {
      label: "Completed",
      value: timeline.completedAt,
    },
    {
      label: "Cancelled",
      value: timeline.cancelledAt,
    },
  ];
}

function createMapUrl(
  latitude: number | null,
  longitude: number | null,
) {
  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function formatCoordinate(
  coordinate: number | null,
) {
  return coordinate === null
    ? "Unavailable"
    : coordinate.toFixed(6);
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (
    !Number.isFinite(date.getTime())
  ) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
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

  const hours = Math.floor(
    minutes / 60,
  );

  const remainingMinutes =
    Math.round(minutes % 60);

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}