"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  Siren,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const GuestTrackingMap = dynamic(
  () =>
    import(
      "@/components/guest-tracking-map"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading live tracking map...
        </div>
      </div>
    ),
  },
);

type CoordinateValue =
  | number
  | string
  | null;

type TrackingData = {
  emergency: {
    emergencyType: string | null;
    description: string | null;
    address: string | null;
    latitude: CoordinateValue;
    longitude: CoordinateValue;
    status: string | null;
    createdAt: string;
    acceptedAt: string | null;
    arrivedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  responder: {
    full_name: string | null;
    agency: string | null;
    status: string | null;
    availability: string | null;
  } | null;
  responderLocation: {
    latitude: CoordinateValue;
    longitude: CoordinateValue;
    updatedAt: string;
  } | null;
  checkedAt: string;
};

type TrackingResponse =
  TrackingData & {
    error?: string;
  };

const statusSteps = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
  "Completed",
];

const terminalStatuses =
  new Set([
    "Completed",
    "Cancelled",
  ]);

const GPS_REFRESH_INTERVAL_MS =
  5_000;

const GPS_FRESH_SECONDS = 30;

export default function GuestTrackingPage() {
  const [
    trackingCode,
    setTrackingCode,
  ] = useState("");

  const [
    guestPhone,
    setGuestPhone,
  ] = useState("");

  const [
    trackingData,
    setTrackingData,
  ] =
    useState<TrackingData | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    isAutoRefreshing,
    setIsAutoRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const fetchTracking = useCallback(
    async (
      selectedTrackingCode: string,
      selectedGuestPhone: string,
      silent = false,
    ) => {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsAutoRefreshing(true);
      }

      setError("");

      try {
        const response = await fetch(
          "/api/emergency/guest/track",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              trackingCode:
                selectedTrackingCode,
              guestPhone:
                selectedGuestPhone,
            }),
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as TrackingResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to retrieve this emergency request.",
          );
        }

        setTrackingData(result);

        window.sessionStorage.setItem(
          "sagip_guest_phone",
          selectedGuestPhone,
        );

        window.sessionStorage.setItem(
          "sagip_guest_tracking_code",
          selectedTrackingCode,
        );
      } catch (trackingError) {
        if (!silent) {
          setTrackingData(null);
        }

        setError(
          getErrorMessage(
            trackingError,
            "Unable to retrieve this emergency request.",
          ),
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        } else {
          setIsAutoRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const parameters =
      new URLSearchParams(
        window.location.search,
      );

    const codeFromUrl =
      parameters.get("code") ?? "";

    const savedCode =
      window.sessionStorage.getItem(
        "sagip_guest_tracking_code",
      ) ?? "";

    const savedPhone =
      window.sessionStorage.getItem(
        "sagip_guest_phone",
      ) ?? "";

    const initialCode =
      codeFromUrl || savedCode;

    setTrackingCode(initialCode);
    setGuestPhone(savedPhone);

    if (
      initialCode &&
      savedPhone
    ) {
      void fetchTracking(
        initialCode,
        savedPhone,
      );
    }
  }, [fetchTracking]);

  useEffect(() => {
    const status =
      trackingData?.emergency
        .status ?? "";

    if (
      !trackingData ||
      !trackingCode ||
      !guestPhone ||
      terminalStatuses.has(status)
    ) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        void fetchTracking(
          trackingCode,
          guestPhone,
          true,
        );
      }, GPS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    fetchTracking,
    guestPhone,
    trackingCode,
    trackingData,
  ]);

  const currentStatus =
    trackingData?.emergency
      .status ?? "";

  const currentStepIndex =
    useMemo(
      () =>
        statusSteps.indexOf(
          currentStatus,
        ),
      [currentStatus],
    );

  const responderGpsState =
    useMemo(() => {
      const location =
        trackingData?.responderLocation;

      if (!location) {
        return {
          isAvailable: false,
          isFresh: false,
          ageSeconds: null,
        };
      }

      const updatedTime =
        new Date(
          location.updatedAt,
        ).getTime();

      if (
        Number.isNaN(updatedTime)
      ) {
        return {
          isAvailable: true,
          isFresh: false,
          ageSeconds: null,
        };
      }

      const ageSeconds =
        Math.max(
          0,
          Math.floor(
            (Date.now() -
              updatedTime) /
              1000,
          ),
        );

      return {
        isAvailable: true,
        isFresh:
          ageSeconds <=
          GPS_FRESH_SECONDS,
        ageSeconds,
      };
    }, [trackingData]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedCode =
      trackingCode
        .trim()
        .toUpperCase();

    setTrackingCode(
      normalizedCode,
    );

    await fetchTracking(
      normalizedCode,
      guestPhone,
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href="/"
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
                Guest Request Tracking
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-700 text-white shadow-lg shadow-red-200">
              <Siren className="size-8" />
            </span>

            <h1 className="mt-5 text-3xl font-extrabold">
              Track a Guest Emergency Request
            </h1>

            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-500">
              Enter the tracking code and the same contact number used when the
              emergency request was submitted.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 grid max-w-3xl gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label
                htmlFor="trackingCode"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Tracking Code
              </label>

              <input
                id="trackingCode"
                name="trackingCode"
                type="text"
                required
                autoCapitalize="characters"
                value={trackingCode}
                disabled={isLoading}
                onChange={(event) =>
                  setTrackingCode(
                    event.target.value
                      .toUpperCase(),
                  )
                }
                placeholder="SGP-2026-XXXXXXXXXX"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-sm uppercase outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="guestPhone"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Contact Number
              </label>

              <input
                id="guestPhone"
                name="guestPhone"
                type="tel"
                inputMode="tel"
                required
                value={guestPhone}
                disabled={isLoading}
                onChange={(event) =>
                  setGuestPhone(
                    event.target.value,
                  )
                }
                placeholder="09XX XXX XXXX"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !trackingCode.trim() ||
                !guestPhone.trim()
              }
              className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-red-700 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}

              {isLoading
                ? "Checking..."
                : "Track"}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {trackingData && (
            <div className="mt-8 space-y-6">
              <section className="rounded-3xl bg-gradient-to-r from-red-600 to-red-800 p-7 text-white shadow-lg">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-100">
                      Emergency Request
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold">
                      {trackingData
                        .emergency
                        .emergencyType ||
                        "Emergency"}
                    </h2>

                    <p className="mt-3 text-sm text-red-100">
                      Submitted{" "}
                      {formatDateTime(
                        trackingData
                          .emergency
                          .createdAt,
                      )}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      currentStatus ||
                      "Pending"
                    }
                  />
                </div>
              </section>

              {currentStatus ===
                "Cancelled" && (
                <div className="rounded-2xl border border-slate-300 bg-slate-100 p-5 text-sm font-semibold text-slate-700">
                  This emergency request was cancelled.
                </div>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-extrabold">
                  Response Progress
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Status and responder GPS are checked automatically every five
                  seconds while the incident remains active.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {statusSteps.map(
                    (step, index) => {
                      const reached =
                        currentStatus ===
                          "Completed" ||
                        (currentStepIndex >=
                          0 &&
                          index <=
                            currentStepIndex);

                      return (
                        <div
                          key={step}
                          className={`rounded-2xl border p-4 ${
                            reached
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {reached ? (
                              <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
                            ) : (
                              <Clock3 className="size-5 shrink-0 text-slate-400" />
                            )}

                            <span
                              className={`text-sm font-extrabold ${
                                reached
                                  ? "text-emerald-900"
                                  : "text-slate-500"
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Navigation className="size-5" />
                      </span>

                      <div>
                        <h2 className="text-xl font-extrabold">
                          Live Responder GPS
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Red shows the emergency location. Green shows the
                          responder&apos;s latest shared location.
                        </p>
                      </div>
                    </div>
                  </div>

                  {responderGpsState.isAvailable ? (
                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold ${
                        responderGpsState.isFresh
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {responderGpsState.isFresh ? (
                        <Wifi className="size-4" />
                      ) : (
                        <WifiOff className="size-4" />
                      )}

                      {responderGpsState.isFresh
                        ? "Live GPS active"
                        : "GPS update delayed"}
                    </div>
                  ) : (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-extrabold text-slate-600">
                      <WifiOff className="size-4" />
                      Waiting for GPS
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <GuestTrackingMap
                    emergencyLatitude={
                      trackingData
                        .emergency
                        .latitude
                    }
                    emergencyLongitude={
                      trackingData
                        .emergency
                        .longitude
                    }
                    emergencyLabel={
                      trackingData
                        .emergency
                        .emergencyType ||
                      "Emergency"
                    }
                    responderLocation={
                      trackingData
                        .responderLocation
                    }
                    responderName={
                      trackingData
                        .responder
                        ?.full_name
                    }
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      {trackingData
                        .responderLocation
                        ? `Last responder GPS update: ${formatRelativeTime(
                            trackingData
                              .responderLocation
                              .updatedAt,
                          )}`
                        : "The responder has not shared a GPS location yet."}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      GPS positions may vary slightly depending on device signal,
                      permissions, and network availability.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                    {isAutoRefreshing && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}

                    Checked{" "}
                    {formatRelativeTime(
                      trackingData.checkedAt,
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-extrabold">
                    Incident Details
                  </h2>

                  <div className="mt-6 space-y-5">
                    <DetailRow
                      icon={MapPin}
                      label="Location"
                      value={
                        trackingData
                          .emergency
                          .address ||
                        "Address unavailable"
                      }
                    />

                    <DetailRow
                      icon={AlertTriangle}
                      label="Description"
                      value={
                        trackingData
                          .emergency
                          .description ||
                        "No description provided."
                      }
                    />

                    <DetailRow
                      icon={Clock3}
                      label="Last Checked"
                      value={formatDateTime(
                        trackingData
                          .checkedAt,
                      )}
                    />
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-extrabold">
                    Assigned Responder
                  </h2>

                  {trackingData.responder ? (
                    <div className="mt-6 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                        <UserRound className="size-6" />
                      </span>

                      <div>
                        <p className="font-extrabold text-slate-900">
                          {trackingData
                            .responder
                            .full_name ||
                            "Emergency Responder"}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {trackingData
                            .responder
                            .agency ||
                            "Emergency Response Unit"}
                        </p>

                        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-emerald-700">
                          {trackingData
                            .responder
                            .status ||
                            trackingData
                              .responder
                              .availability ||
                            "Assigned"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <UserRound className="mx-auto size-10 text-slate-300" />

                      <p className="mt-3 font-bold text-slate-600">
                        Awaiting responder assignment
                      </p>
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-5 shrink-0 text-blue-700" />

                      <p className="text-sm leading-6 text-blue-800">
                        Keep your phone available in case a dispatcher or
                        responder needs to contact you.
                      </p>
                    </div>
                  </div>
                </article>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type DetailRowProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-red-700" />

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
          {value}
        </p>
      </div>
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
      className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-extrabold ${getStatusClasses(
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
      return "bg-amber-100 text-amber-900";
    case "Verified":
      return "bg-blue-100 text-blue-900";
    case "Dispatched":
      return "bg-cyan-100 text-cyan-900";
    case "Accepted":
      return "bg-indigo-100 text-indigo-900";
    case "Responding":
      return "bg-violet-100 text-violet-900";
    case "Arrived":
      return "bg-orange-100 text-orange-900";
    case "In Progress":
      return "bg-red-100 text-red-900";
    case "Completed":
      return "bg-emerald-100 text-emerald-900";
    case "Cancelled":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-white/90 text-slate-900";
  }
}

function formatDateTime(
  dateValue: string,
) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatRelativeTime(
  dateValue: string,
) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "at an unknown time";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() -
        date.getTime()) /
        1000,
    ),
  );

  if (seconds < 10) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  return formatDateTime(
    dateValue,
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}
