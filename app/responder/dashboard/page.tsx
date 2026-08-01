"use client";

import {
  startLocationSharing,
  startPresenceSharing,
  stopLocationSharing,
} from "@/lib/location-sharing";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  LocateFixed,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCw,
  Shield,
  ShieldCheck,
  Siren,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Responder = {
  id: string;
  full_name: string | null;
  agency: string | null;
  phone: string | null;
  status: string | null;
  availability: string | null;
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

const pendingStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
];

const assignedStatuses = [
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export default function ResponderDashboardPage() {
  const router = useRouter();

  const [responder, setResponder] =
    useState<Responder | null>(null);

  const [pendingRequests, setPendingRequests] =
    useState<EmergencyRequest[]>([]);

  const [assignedRequests, setAssignedRequests] =
    useState<EmergencyRequest[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    processingRequestId,
    setProcessingRequestId,
  ] = useState<string | null>(null);

  const [
    sharingRequestId,
    setSharingRequestId,
  ] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(
    async (responderId: string) => {
      const {
        data: pendingRows,
        error: pendingError,
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
        .is("responder_id", null)
        .in("status", pendingStatuses)
        .order("created_at", {
          ascending: true,
        });

      if (pendingError) {
        setError(pendingError.message);
        return;
      }

      const {
        data: assignedRows,
        error: assignedError,
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
        .eq("responder_id", responderId)
        .in("status", assignedStatuses)
        .order("created_at", {
          ascending: false,
        });

      if (assignedError) {
        setError(assignedError.message);
        return;
      }

      setPendingRequests(pendingRows ?? []);
      setAssignedRequests(assignedRows ?? []);
    },
    [],
  );

  useEffect(() => {
    let channel:
      | ReturnType<typeof supabase.channel>
      | undefined;

    async function initializeDashboard() {
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
        data: responderData,
        error: responderError,
      } = await supabase
        .from("responders")
        .select(
          `
            id,
            full_name,
            agency,
            phone,
            status,
            availability
          `,
        )
        .eq("auth_id", user.id)
        .maybeSingle();

      if (responderError) {
        setError(responderError.message);
        setIsLoading(false);
        return;
      }

      if (!responderData) {
        setError(
          "This account is not registered as an emergency responder.",
        );
        setIsLoading(false);
        return;
      }

      setResponder(responderData);

      if (
        responderData.availability === "Available"
      ) {
        startPresenceSharing(
          responderData.id,
        );
      }

      await loadRequests(responderData.id);

      channel = supabase
        .channel(
          `responder-dashboard-${responderData.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "emergency_requests",
          },
          async () => {
            await loadRequests(
              responderData.id,
            );
          },
        )
        .subscribe();

      setIsLoading(false);
    }

    initializeDashboard();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      stopLocationSharing();
    };
  }, [loadRequests, router]);

  async function handleRefresh() {
    if (!responder) {
      return;
    }

    setError("");
    setMessage("");
    setIsRefreshing(true);

    try {
      await loadRequests(responder.id);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleAccept(
    requestId: string,
  ) {
    if (!responder) {
      return;
    }

    setError("");
    setMessage("");
    setProcessingRequestId(requestId);

    try {
      const {
        data: acceptedRequest,
        error: acceptError,
      } = await supabase
        .from("emergency_requests")
        .update({
          responder_id: responder.id,
          status: "Accepted",
          accepted_at:
            new Date().toISOString(),
        })
        .eq("id", requestId)
        .is("responder_id", null)
        .in("status", pendingStatuses)
        .select("id, status")
        .maybeSingle();

      if (acceptError) {
        setError(acceptError.message);
        return;
      }

      if (!acceptedRequest) {
        setError(
          "This request may already have been accepted by another responder.",
        );

        await loadRequests(responder.id);
        return;
      }

      const {
        error: responderUpdateError,
      } = await supabase
        .from("responders")
        .update({
          availability: "Busy",
          status: "On Duty",
        })
        .eq("id", responder.id);

      if (responderUpdateError) {
        setError(
          `The request was accepted, but responder availability could not be updated: ${responderUpdateError.message}`,
        );
      }

      setResponder((current) =>
        current
          ? {
              ...current,
              availability: "Busy",
              status: "On Duty",
            }
          : current,
      );

      stopLocationSharing();

      startLocationSharing(
        responder.id,
        requestId,
      );

      setMessage(
        "Emergency request accepted successfully.",
      );

      await loadRequests(responder.id);
    } catch {
      setError(
        "Unable to accept the emergency request. Please check your connection and try again.",
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  function handleStartSharing(
    request: EmergencyRequest,
  ) {
    if (!responder) {
      setError(
        "Responder information is unavailable.",
      );
      return;
    }

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser.",
      );
      return;
    }

    setError("");
    setMessage("");

    stopLocationSharing();

    startLocationSharing(
      responder.id,
      request.id,
    );

    setSharingRequestId(request.id);

    setMessage(
      "Live location sharing started. Keep this page open while responding.",
    );
  }

  function handleStopSharing() {
    stopLocationSharing();
    setSharingRequestId(null);

    setMessage(
      "Live location sharing stopped.",
    );
  }

  async function updateRequestStatus(
    request: EmergencyRequest,
    nextStatus: string,
  ) {
    if (!responder) {
      return;
    }

    setError("");
    setMessage("");
    setProcessingRequestId(request.id);

    try {
      const updateData: {
        status: string;
        accepted_at?: string;
        arrived_at?: string;
        completed_at?: string;
      } = {
        status: nextStatus,
      };

      if (nextStatus === "Accepted") {
        updateData.accepted_at =
          new Date().toISOString();
      }

      if (nextStatus === "Arrived") {
        updateData.arrived_at =
          new Date().toISOString();
      }

      if (nextStatus === "Completed") {
        updateData.completed_at =
          new Date().toISOString();
      }

      const {
        data: updatedRequest,
        error: updateError,
      } = await supabase
        .from("emergency_requests")
        .update(updateData)
        .eq("id", request.id)
        .eq(
          "responder_id",
          responder.id,
        )
        .select("id, status")
        .maybeSingle();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (!updatedRequest) {
        setError(
          "The request could not be updated. It may no longer be assigned to this responder.",
        );
        return;
      }

      if (nextStatus === "Accepted") {
        const {
          error: responderUpdateError,
        } = await supabase
          .from("responders")
          .update({
            availability: "Busy",
            status: "On Duty",
          })
          .eq("id", responder.id);

        if (responderUpdateError) {
          setError(
            `The assignment was accepted, but responder status could not be updated: ${responderUpdateError.message}`,
          );
        }

        setResponder((current) =>
          current
            ? {
                ...current,
                availability: "Busy",
                status: "On Duty",
              }
            : current,
        );
      }

      if (nextStatus === "Completed") {
        if (
          sharingRequestId === request.id
        ) {
          stopLocationSharing();
          setSharingRequestId(null);
        }

        const {
          error: locationDeleteError,
        } = await supabase
          .from("responder_locations")
          .delete()
          .eq(
            "emergency_request_id",
            request.id,
          )
          .eq(
            "responder_id",
            responder.id,
          );

        if (locationDeleteError) {
          console.error(
            "Unable to remove responder location:",
            locationDeleteError.message,
          );
        }

        const {
          error: responderUpdateError,
        } = await supabase
          .from("responders")
          .update({
            availability: "Available",
            status: "Online",
          })
          .eq("id", responder.id);

        if (responderUpdateError) {
          setError(
            `The incident was completed, but responder availability could not be updated: ${responderUpdateError.message}`,
          );
        }

        setResponder((current) =>
          current
            ? {
                ...current,
                availability:
                  "Available",
                status: "Online",
              }
            : current,
        );

        startPresenceSharing(
          responder.id,
        );
      }

      setMessage(
        nextStatus === "Completed"
          ? "Emergency response completed successfully."
          : `Emergency status updated to ${nextStatus}.`,
      );

      await loadRequests(responder.id);
    } catch {
      setError(
        "Unable to update the emergency status. Please check your connection and try again.",
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleLogout() {
    stopLocationSharing();
    setSharingRequestId(null);

    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading responder dashboard...
        </div>
      </main>
    );
  }

  if (!responder) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto size-12 text-red-600" />

          <h1 className="mt-5 text-2xl font-extrabold">
            Responder access unavailable
          </h1>

          <p className="mt-3 text-slate-500">
            {error ||
              "This account does not have responder access."}
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-7 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link
            href="/responder/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <ShieldCheck className="size-6" />
            </span>

            <div>
              <p className="text-xl font-extrabold">
                SAGIP Responder
              </p>

              <p className="text-xs text-slate-500">
                Emergency Response Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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

      <section className="mx-auto max-w-7xl px-5 py-8">
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

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-gradient-to-r from-red-600 to-red-800 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold text-red-100">
              Responder dashboard
            </p>

            <h1 className="mt-2 text-3xl font-extrabold">
              Welcome,{" "}
              {responder.full_name ||
                "Emergency Responder"}
            </h1>

            <p className="mt-4 text-red-100">
              Review pending emergency requests,
              accept assignments, share your live
              location, and provide response
              updates.
            </p>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current status
            </p>

            <div className="mt-5 flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <UserRound className="size-6" />
              </span>

              <div>
                <p className="font-extrabold">
                  {responder.agency ||
                    "Emergency Agency"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {responder.status ||
                    "Online"}{" "}
                  ·{" "}
                  {responder.availability ||
                    "Available"}
                </p>
              </div>
            </div>

            {sharingRequestId && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-600" />
                </span>

                Live location sharing
              </div>
            )}
          </aside>
        </section>

        {assignedRequests.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-extrabold">
              Active Assignments
            </h2>

            <p className="mt-2 text-slate-500">
              Share your live location and update
              each emergency as the response
              progresses.
            </p>

            <div className="mt-5 space-y-6">
              {assignedRequests.map(
                (request) => (
                  <AssignedRequestCard
                    key={request.id}
                    request={request}
                    processing={
                      processingRequestId ===
                      request.id
                    }
                    isSharingLocation={
                      sharingRequestId ===
                      request.id
                    }
                    sharingDisabled={
                      sharingRequestId !== null &&
                      sharingRequestId !==
                        request.id
                    }
                    onStartSharing={
                      handleStartSharing
                    }
                    onStopSharing={
                      handleStopSharing
                    }
                    onUpdateStatus={
                      updateRequestStatus
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div>
            <h2 className="text-2xl font-extrabold">
              Pending Emergency Requests
            </h2>

            <p className="mt-2 text-slate-500">
              New emergency reports appear here
              automatically.
            </p>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <Shield className="mx-auto size-12 text-slate-300" />

              <p className="mt-4 font-extrabold">
                No pending emergency requests
              </p>

              <p className="mt-2 text-sm text-slate-500">
                New requests will appear here in
                real time.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {pendingRequests.map(
                (request) => (
                  <PendingRequestCard
                    key={request.id}
                    request={request}
                    processing={
                      processingRequestId ===
                      request.id
                    }
                    disabled={
                      responder.availability ===
                      "Busy"
                    }
                    onAccept={handleAccept}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

type PendingRequestCardProps = {
  request: EmergencyRequest;
  processing: boolean;
  disabled: boolean;
  onAccept: (
    requestId: string,
  ) => void;
};

function PendingRequestCard({
  request,
  processing,
  disabled,
  onAccept,
}: PendingRequestCardProps) {
  const navigationUrl =
    createNavigationUrl(request);

  return (
    <article className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-red-700 text-white">
          <Siren className="size-6" />
        </span>

        <StatusBadge
          status={
            request.status ?? "Pending"
          }
        />
      </div>

      <h3 className="mt-5 text-xl font-extrabold">
        {request.emergency_type ||
          "Emergency Request"}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {formatDateTime(
          request.created_at,
        )}
      </p>

      <div className="mt-5 space-y-4">
        <InfoRow
          icon={MapPin}
          text={
            request.address ||
            "Address unavailable"
          }
        />

        <InfoRow
          icon={AlertTriangle}
          text={
            request.description ||
            "No description provided."
          }
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {navigationUrl && (
          <a
            href={navigationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Navigation className="size-4" />
            View Location
            <ExternalLink className="size-3" />
          </a>
        )}

        <button
          type="button"
          disabled={
            processing || disabled
          }
          onClick={() =>
            onAccept(request.id)
          }
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}

          {disabled
            ? "Responder Busy"
            : processing
              ? "Accepting..."
              : "Accept Request"}
        </button>
      </div>
    </article>
  );
}

type AssignedRequestCardProps = {
  request: EmergencyRequest;
  processing: boolean;
  isSharingLocation: boolean;
  sharingDisabled: boolean;
  onStartSharing: (
    request: EmergencyRequest,
  ) => void;
  onStopSharing: () => void;
  onUpdateStatus: (
    request: EmergencyRequest,
    status: string,
  ) => void;
};

function AssignedRequestCard({
  request,
  processing,
  isSharingLocation,
  sharingDisabled,
  onStartSharing,
  onStopSharing,
  onUpdateStatus,
}: AssignedRequestCardProps) {
  const nextStatus = getNextStatus(
    request.status ?? "Accepted",
  );

  const navigationUrl =
    createNavigationUrl(request);

  return (
    <article className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-red-600 to-red-800 p-7 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-100">
              Assigned emergency
            </p>

            <h3 className="mt-2 text-2xl font-extrabold">
              {request.emergency_type ||
                "Emergency"}
            </h3>
          </div>

          <StatusBadge
            status={
              request.status ?? "Accepted"
            }
          />
        </div>
      </div>

      <div className="p-7">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <InfoRow
              icon={MapPin}
              text={
                request.address ||
                "Address unavailable"
              }
            />

            <InfoRow
              icon={AlertTriangle}
              text={
                request.description ||
                "No description provided."
              }
            />
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-500">
              Requested
            </p>

            <p className="mt-2 font-semibold">
              {formatDateTime(
                request.created_at,
              )}
            </p>

            {request.accepted_at && (
              <>
                <p className="mt-5 text-sm font-bold text-slate-500">
                  Accepted
                </p>

                <p className="mt-2 font-semibold">
                  {formatDateTime(
                    request.accepted_at,
                  )}
                </p>
              </>
            )}

            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm font-bold ${
                isSharingLocation
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {isSharingLocation
                ? "Your live GPS location is being shared."
                : request.status === "Dispatched"
                  ? "Accept the dispatched assignment before starting live GPS sharing."
                  : "Live GPS sharing is currently off."}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {navigationUrl && (
            <a
              href={navigationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Navigation className="size-5" />
              Navigation
            </a>
          )}

          <Link
            href={`/messages?request=${request.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 font-bold text-red-700 transition hover:bg-red-100"
          >
            <MessageCircle className="size-5" />
            Open Chat
          </Link>

          {isSharingLocation ? (
            <button
              type="button"
              onClick={onStopSharing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 font-bold text-red-700 transition hover:bg-red-100"
            >
              <XCircle className="size-5" />
              Stop Location
            </button>
          ) : (
            <button
              type="button"
              disabled={
                sharingDisabled ||
                request.status ===
                  "Dispatched"
              }
              onClick={() =>
                onStartSharing(request)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LocateFixed className="size-5" />
              Start Location
            </button>
          )}

          {nextStatus && (
            <button
              type="button"
              disabled={processing}
              onClick={() =>
                onUpdateStatus(
                  request,
                  nextStatus,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}

              {processing
                ? "Updating..."
                : `Mark as ${nextStatus}`}
            </button>
          )}
        </div>
      </div>
    </article>
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

type InfoRowProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  text: string;
};

function InfoRow({
  icon: Icon,
  text,
}: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-red-700" />

      <p className="break-words text-sm leading-6 text-slate-700">
        {text}
      </p>
    </div>
  );
}

function getNextStatus(
  currentStatus: string,
) {
  switch (currentStatus) {
    case "Dispatched":
      return "Accepted";

    case "Accepted":
      return "Responding";

    case "Responding":
      return "Arrived";

    case "Arrived":
      return "In Progress";

    case "In Progress":
      return "Completed";

    default:
      return null;
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
      return "bg-orange-100 text-orange-800";

    case "In Progress":
      return "bg-cyan-100 text-cyan-800";

    case "Completed":
      return "bg-emerald-100 text-emerald-800";

    case "Cancelled":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function createNavigationUrl(
  request: EmergencyRequest,
) {
  if (
    request.latitude === null ||
    request.longitude === null
  ) {
    return null;
  }

  const latitude = Number(
    request.latitude,
  );

  const longitude = Number(
    request.longitude,
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
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