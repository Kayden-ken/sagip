"use client";

import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  Gauge,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  Siren,
  UserRound,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const RequestLocationMap = dynamic(
  () =>
    import(
      "@/components/request-location-map"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading map...
        </div>
      </div>
    ),
  },
);

type ResponderDetails = {
  id: string;
  full_name: string | null;
  agency: string | null;
  phone: string | null;
  status: string | null;
};

type EmergencyRequest = {
  id: string;
  profile_id: string;
  responder_id: string | null;
  emergency_type: string | null;
  description: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
};

type ResponderLocation = {
  responder_id: string;
  emergency_request_id: string;
  latitude: number | string;
  longitude: number | string;
  accuracy: number | string | null;
  heading: number | string | null;
  speed: number | string | null;
  updated_at: string;
};

const visibleStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
  "Completed",
];

const progressSteps = [
  {
    status: "Pending",
    label: "Request submitted",
    description:
      "Your emergency request was received.",
  },
  {
    status: "Accepted",
    label: "Responder assigned",
    description:
      "A responder accepted your request.",
  },
  {
    status: "Responding",
    label: "Responder on the way",
    description:
      "The responder is travelling to your location.",
  },
  {
    status: "Arrived",
    label: "Responder arrived",
    description:
      "The responder reached the emergency scene.",
  },
  {
    status: "In Progress",
    label: "Assistance in progress",
    description:
      "The emergency is currently being handled.",
  },
  {
    status: "Completed",
    label: "Request completed",
    description:
      "The emergency response has been completed.",
  },
];

export default function RequestsPage() {
  const router = useRouter();

  const [profileId, setProfileId] =
    useState("");
  const [request, setRequest] =
    useState<EmergencyRequest | null>(null);
  const [responder, setResponder] =
    useState<ResponderDetails | null>(null);

  const [
    responderLocation,
    setResponderLocation,
  ] = useState<ResponderLocation | null>(
    null,
  );

  const [isLoading, setIsLoading] =
    useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [isCancelling, setIsCancelling] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  const loadResponder = useCallback(
    async (responderId: string | null) => {
      if (!responderId) {
        setResponder(null);
        return;
      }

      const {
        data,
        error: responderError,
      } = await supabase
        .from("responders")
        .select(
          `
            id,
            full_name,
            agency,
            phone,
            status
          `,
        )
        .eq("id", responderId)
        .maybeSingle();

      if (responderError) {
        console.error(
          "Unable to load responder:",
          responderError.message,
        );
        setResponder(null);
        return;
      }

      setResponder(data);
    },
    [],
  );

  const loadResponderLocation =
    useCallback(
      async (requestId: string | null) => {
        if (!requestId) {
          setResponderLocation(null);
          return;
        }

        const {
          data,
          error: locationError,
        } = await supabase
          .from("responder_locations")
          .select(
            `
              responder_id,
              emergency_request_id,
              latitude,
              longitude,
              accuracy,
              heading,
              speed,
              updated_at
            `,
          )
          .eq(
            "emergency_request_id",
            requestId,
          )
          .maybeSingle();

        if (locationError) {
          console.error(
            "Unable to load responder location:",
            locationError.message,
          );
          setResponderLocation(null);
          return;
        }

        setResponderLocation(data);
      },
      [],
    );

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
            profile_id,
            responder_id,
            emergency_type,
            description,
            latitude,
            longitude,
            address,
            status,
            created_at,
            accepted_at,
            arrived_at,
            completed_at
          `,
        )
        .eq(
          "profile_id",
          selectedProfileId,
        )
        .in("status", visibleStatuses)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (requestError) {
        setError(requestError.message);
        return;
      }

      setRequest(data);

      await Promise.all([
        loadResponder(
          data?.responder_id ?? null,
        ),
        loadResponderLocation(
          data?.id ?? null,
        ),
      ]);

      return data;
    },
    [
      loadResponder,
      loadResponderLocation,
    ],
  );

  useEffect(() => {
    let requestChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    let responderChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    let locationChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    async function initializePage() {
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

      setProfileId(profile.id);

      const activeRequest =
        await loadActiveRequest(profile.id);

      requestChannel = supabase
        .channel(
          `citizen-request-${profile.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "emergency_requests",
            filter: `profile_id=eq.${profile.id}`,
          },
          async () => {
            await loadActiveRequest(
              profile.id,
            );
          },
        )
        .subscribe();

      responderChannel = supabase
        .channel(
          `citizen-responder-${profile.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "responders",
          },
          async () => {
            await loadActiveRequest(
              profile.id,
            );
          },
        )
        .subscribe();

      if (activeRequest?.id) {
        locationChannel = supabase
          .channel(
            `citizen-live-location-${activeRequest.id}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "responder_locations",
              filter: `emergency_request_id=eq.${activeRequest.id}`,
            },
            async () => {
              await loadResponderLocation(
                activeRequest.id,
              );
            },
          )
          .subscribe();
      }

      setIsLoading(false);
    }

    initializePage();

    return () => {
      if (requestChannel) {
        supabase.removeChannel(
          requestChannel,
        );
      }

      if (responderChannel) {
        supabase.removeChannel(
          responderChannel,
        );
      }

      if (locationChannel) {
        supabase.removeChannel(
          locationChannel,
        );
      }
    };
  }, [
    loadActiveRequest,
    loadResponderLocation,
    router,
  ]);

  async function handleRefresh() {
    if (!profileId) {
      return;
    }

    setError("");
    setMessage("");
    setIsRefreshing(true);

    await loadActiveRequest(profileId);

    setIsRefreshing(false);
  }

  async function handleCancel() {
    if (!request) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this emergency request? Only continue if assistance is no longer required or the request was submitted accidentally.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setIsCancelling(true);

    const {
      data: cancelledRequest,
      error: cancelError,
    } = await supabase
      .from("emergency_requests")
      .update({
        status: "Cancelled",
      })
      .eq("id", request.id)
      .eq("profile_id", request.profile_id)
      .eq("status", "Pending")
      .select("id")
      .maybeSingle();

    if (cancelError) {
      setError(cancelError.message);
      setIsCancelling(false);
      return;
    }

    if (!cancelledRequest) {
      setError(
        "This request can no longer be cancelled because it may already have been accepted.",
      );

      await loadActiveRequest(
        request.profile_id,
      );

      setIsCancelling(false);
      return;
    }

    setRequest(null);
    setResponder(null);
    setResponderLocation(null);
    setMessage(
      "Your emergency request was cancelled.",
    );
    setIsCancelling(false);
  }

  const latitude = useMemo(() => {
    if (
      request?.latitude === null ||
      request?.latitude === undefined
    ) {
      return null;
    }

    const value = Number(
      request.latitude,
    );

    return Number.isFinite(value)
      ? value
      : null;
  }, [request]);

  const longitude = useMemo(() => {
    if (
      request?.longitude === null ||
      request?.longitude === undefined
    ) {
      return null;
    }

    const value = Number(
      request.longitude,
    );

    return Number.isFinite(value)
      ? value
      : null;
  }, [request]);

  const responderLatitude = useMemo(() => {
    if (!responderLocation) {
      return null;
    }

    const value = Number(
      responderLocation.latitude,
    );

    return Number.isFinite(value)
      ? value
      : null;
  }, [responderLocation]);

  const responderLongitude = useMemo(() => {
    if (!responderLocation) {
      return null;
    }

    const value = Number(
      responderLocation.longitude,
    );

    return Number.isFinite(value)
      ? value
      : null;
  }, [responderLocation]);


  const trackingMetrics = useMemo(() => {
    if (
      latitude === null ||
      longitude === null ||
      responderLatitude === null ||
      responderLongitude === null
    ) {
      return null;
    }

    const straightLineKilometers =
      calculateDistanceKilometers(
        responderLatitude,
        responderLongitude,
        latitude,
        longitude,
      );

    const estimatedRoadKilometers =
      straightLineKilometers * 1.25;

    const currentSpeedMetersPerSecond =
      responderLocation?.speed !== null &&
      responderLocation?.speed !== undefined
        ? Number(responderLocation.speed)
        : null;

    const speedKilometersPerHour =
      currentSpeedMetersPerSecond !== null &&
      Number.isFinite(
        currentSpeedMetersPerSecond,
      ) &&
      currentSpeedMetersPerSecond > 1
        ? currentSpeedMetersPerSecond * 3.6
        : 25;

    const estimatedMinutes = Math.max(
      1,
      Math.ceil(
        (estimatedRoadKilometers /
          speedKilometersPerHour) *
          60,
      ),
    );

    return {
      estimatedRoadKilometers,
      estimatedMinutes,
    };
  }, [
    latitude,
    longitude,
    responderLatitude,
    responderLongitude,
    responderLocation,
  ]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading emergency status...
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
                Emergency Tracking
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`size-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:text-red-700"
            >
              <ArrowLeft className="size-4" />

              <span className="hidden sm:inline">
                Dashboard
              </span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700"
          >
            {message}
          </div>
        )}

        {!request ? (
          <NoActiveRequest />
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl">
              <div className="bg-gradient-to-r from-red-600 to-red-800 px-7 py-7 text-white sm:px-9">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
                      <Siren className="size-7" />
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-red-100">
                        Active Emergency
                      </p>

                      <h1 className="mt-1 text-3xl font-extrabold">
                        {request.emergency_type ||
                          "Emergency Request"}
                      </h1>
                    </div>
                  </div>

                  <StatusBadge
                    status={
                      request.status ||
                      "Pending"
                    }
                  />
                </div>
              </div>

              <div className="grid gap-6 p-7 sm:p-9 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <h2 className="text-xl font-extrabold">
                    Request Details
                  </h2>

                  <div className="mt-6 space-y-5">
                    <DetailItem
                      icon={Clock3}
                      label="Submitted"
                      value={formatDateTime(
                        request.created_at,
                      )}
                    />

                    <DetailItem
                      icon={MapPin}
                      label="Location"
                      value={
                        request.address ||
                        "Address unavailable"
                      }
                    />

                    <DetailItem
                      icon={Navigation}
                      label="Coordinates"
                      value={
                        latitude !== null &&
                        longitude !== null
                          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                          : "Coordinates unavailable"
                      }
                    />
                  </div>

                  <div className="mt-7 rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </p>

                    <p className="mt-3 leading-7 text-slate-700">
                      {request.description ||
                        "No additional description was provided."}
                    </p>
                  </div>
                </div>

                <ResponderCard
                  responder={responder}
                  requestStatus={
                    request.status ||
                    "Pending"
                  }
                />
              </div>
            </section>

            <ProgressTimeline
              currentStatus={
                request.status ||
                "Pending"
              }
            />

            {latitude !== null &&
              longitude !== null && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div>
                    <h2 className="text-2xl font-extrabold">
                      Live Emergency Map
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      The emergency marker shows
                      your location. The green
                      marker shows the responder's
                      latest shared GPS position.
                    </p>

                    <div
                      className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                        responderLatitude !== null &&
                        responderLongitude !== null
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`size-2.5 rounded-full ${
                          responderLatitude !== null &&
                          responderLongitude !== null
                            ? "animate-pulse bg-emerald-600"
                            : "bg-slate-400"
                        }`}
                      />

                      {responderLatitude !== null &&
                      responderLongitude !== null
                        ? "Responder location is live"
                        : "Waiting for responder location"}
                    </div>
                  </div>

                  {trackingMetrics && (
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <TrackingMetric
                        icon={Navigation}
                        label="Estimated distance"
                        value={`${trackingMetrics.estimatedRoadKilometers.toFixed(
                          trackingMetrics.estimatedRoadKilometers < 10
                            ? 1
                            : 0,
                        )} km`}
                      />

                      <TrackingMetric
                        icon={Clock3}
                        label="Estimated arrival"
                        value={`${trackingMetrics.estimatedMinutes} min`}
                      />

                      <TrackingMetric
                        icon={Gauge}
                        label="GPS update"
                        value={
                          responderLocation?.updated_at
                            ? formatRelativeTime(
                                responderLocation.updated_at,
                              )
                            : "Unavailable"
                        }
                      />
                    </div>
                  )}

                  <div className="mt-6">
                    <RequestLocationMap
                      latitude={latitude}
                      longitude={longitude}
                      address={
                        request.address
                      }
                      responderLatitude={
                        responderLatitude
                      }
                      responderLongitude={
                        responderLongitude
                      }
                      responderUpdatedAt={
                        responderLocation?.updated_at ??
                        null
                      }
                      responderName={
                        responder?.full_name ??
                        null
                      }
                    />
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-400">
                    Distance and ETA are approximate
                    estimates. Actual road travel
                    time may vary.
                  </p>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-800"
                  >
                    Open in Google Maps
                    <ExternalLink className="size-4" />
                  </a>
                </section>
              )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">
                    Cancel request
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Cancellation is available only
                    before a responder accepts the
                    emergency request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={
                    isCancelling ||
                    request.status !==
                      "Pending"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="size-5" />

                  {isCancelling
                    ? "Cancelling..."
                    : "Cancel Request"}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function NoActiveRequest() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <ShieldAlert className="size-10" />
      </span>

      <h1 className="mt-6 text-3xl font-extrabold">
        No active emergency
      </h1>

      <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
        Your active emergency request and
        responder status will appear here.
      </p>

      <Link
        href="/emergency"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-700 px-6 py-4 font-extrabold text-white shadow-lg shadow-red-200 hover:bg-red-800"
      >
        <Siren className="size-5" />
        Request Emergency Assistance
      </Link>
    </section>
  );
}

type ResponderCardProps = {
  responder: ResponderDetails | null;
  requestStatus: string;
};

function ResponderCard({
  responder,
  requestStatus,
}: ResponderCardProps) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Assigned Responder
      </p>

      {!responder ? (
        <div className="mt-8 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <LoaderCircle className="size-8 animate-spin" />
          </span>

          <p className="mt-4 font-extrabold text-slate-800">
            Waiting for a responder
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your request is visible to available
            emergency responders.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <UserRound className="size-7" />
            </span>

            <div>
              <p className="font-extrabold">
                {responder.full_name ||
                  "Emergency Responder"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {responder.agency ||
                  "Emergency Response Agency"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Response status
              </p>

              <p className="mt-1 font-extrabold text-slate-800">
                {requestStatus}
              </p>
            </div>

            {responder.phone && (
              <a
                href={`tel:${responder.phone}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800"
              >
                <Phone className="size-4" />
                Call Responder
              </a>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

type DetailItemProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
};

function DetailItem({
  icon: Icon,
  label,
  value,
}: DetailItemProps) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <Icon className="size-5" />
      </span>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

type TrackingMetricProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
};

function TrackingMetric({
  icon: Icon,
  label,
  value,
}: TrackingMetricProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
        <Icon className="size-5" />
      </span>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-extrabold text-slate-900">
        {value}
      </p>
    </div>
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
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${getStatusClasses(
        status,
      )}`}
    >
      <CircleDot className="size-4" />
      {status}
    </span>
  );
}

type ProgressTimelineProps = {
  currentStatus: string;
};

function ProgressTimeline({
  currentStatus,
}: ProgressTimelineProps) {
  const currentIndex =
    getProgressIndex(currentStatus);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-extrabold">
        Emergency Progress
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        This timeline updates automatically when
        the responder changes the incident status.
      </p>

      <div className="mt-8 space-y-3">
        {progressSteps.map(
          (step, index) => {
            const complete =
              index <= currentIndex;
            const active =
              index === currentIndex;

            return (
              <div
                key={step.status}
                className={`flex items-start gap-4 rounded-2xl border p-5 ${
                  active
                    ? "border-red-300 bg-red-50"
                    : complete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {complete ? (
                    <Check className="size-5" />
                  ) : (
                    <span className="text-sm font-bold">
                      {index + 1}
                    </span>
                  )}
                </span>

                <div>
                  <p
                    className={`font-extrabold ${
                      active
                        ? "text-red-800"
                        : "text-slate-800"
                    }`}
                  >
                    {step.label}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}

function getProgressIndex(
  status: string,
) {
  switch (status) {
    case "Verified":
    case "Dispatched":
      return 0;

    case "Accepted":
      return 1;

    case "Responding":
      return 2;

    case "Arrived":
      return 3;

    case "In Progress":
      return 4;

    case "Completed":
      return 5;

    default:
      return 0;
  }
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
    case "In Progress":
      return "bg-orange-100 text-orange-800";

    case "Completed":
      return "bg-emerald-100 text-emerald-800";

    case "Cancelled":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function calculateDistanceKilometers(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKilometers = 6371;

  const latitudeDelta =
    degreesToRadians(
      latitudeB - latitudeA,
    );

  const longitudeDelta =
    degreesToRadians(
      longitudeB - longitudeA,
    );

  const firstLatitude =
    degreesToRadians(latitudeA);

  const secondLatitude =
    degreesToRadians(latitudeB);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusKilometers *
    Math.asin(Math.sqrt(haversine))
  );
}

function degreesToRadians(
  degrees: number,
) {
  return (degrees * Math.PI) / 180;
}

function formatRelativeTime(
  dateValue: string,
) {
  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() -
        new Date(dateValue).getTime()) /
        1000,
    ),
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(
    seconds / 60,
  );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  return `${hours} hr${
    hours === 1 ? "" : "s"
  } ago`;
}

function formatDateTime(
  dateValue: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(new Date(dateValue));
}