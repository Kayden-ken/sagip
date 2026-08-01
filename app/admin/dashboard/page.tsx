"use client";

import { supabase } from "@/lib/supabase";
import {
  getAdminAnalytics,
  type AdminAnalyticsData,
} from "@/lib/admin-analytics";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileBarChart,
  LoaderCircle,
  LogOut,
  MapPin,
  PieChart,
  RefreshCw,
  Send,
  ShieldCheck,
  Siren,
  Timer,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type AdminProfile = {
  full_name: string | null;
  role: string | null;
};

type EmergencyRequest = {
  id: string;
  emergency_type: string | null;
  description: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string | null;
  responder_id: string | null;
  profile_id: string;
  created_at: string;
  accepted_at: string | null;
};

type Responder = {
  id: string;
  full_name: string | null;
  agency: string | null;
  status: string | null;
  availability: string | null;
};

type ResponderLocation = {
  responder_id: string;
  emergency_request_id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
};

type ResponderPresenceLocation = {
  responder_id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
};

const AdminCommandMap = dynamic(
  () => import("@/components/admin-command-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading command map...
        </div>
      </div>
    ),
  },
);

type DashboardStats = {
  pendingEmergencies: number;
  activeEmergencies: number;
  availableResponders: number;
  busyResponders: number;
  registeredCitizens: number;
  completedToday: number;
};

const pendingStatuses = [
  "Pending",
  "Verified",
];

const openStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

const activeStatuses = [
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] =
    useState<AdminProfile | null>(null);

  const [emergencies, setEmergencies] =
    useState<EmergencyRequest[]>([]);

  const [responders, setResponders] =
    useState<Responder[]>([]);

  const [
    responderLocations,
    setResponderLocations,
  ] = useState<ResponderLocation[]>([]);

  const [
    presenceLocations,
    setPresenceLocations,
  ] = useState<ResponderPresenceLocation[]>([]);

  const [
    selectedResponders,
    setSelectedResponders,
  ] = useState<Record<string, string>>({});

  const [
    processingEmergencyId,
    setProcessingEmergencyId,
  ] = useState<string | null>(null);

  const [stats, setStats] =
    useState<DashboardStats>({
      pendingEmergencies: 0,
      activeEmergencies: 0,
      availableResponders: 0,
      busyResponders: 0,
      registeredCitizens: 0,
      completedToday: 0,
    });


  const [analytics, setAnalytics] =
    useState<AdminAnalyticsData | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboardData = useCallback(
    async () => {
      setError("");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        emergencyResult,
        responderResult,
        citizenCountResult,
        completedTodayResult,
        responderLocationResult,
        responderPresenceResult,
      ] = await Promise.all([
        supabase
          .from("emergency_requests")
          .select(
            `
              id,
              emergency_type,
              description,
              address,
              latitude,
              longitude,
              status,
              responder_id,
              profile_id,
              created_at,
              accepted_at
            `,
          )
          .in("status", openStatuses)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("responders")
          .select(
            `
              id,
              full_name,
              agency,
              status,
              availability
            `,
          )
          .order("full_name", {
            ascending: true,
          }),

        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("emergency_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "Completed")
          .gte(
            "completed_at",
            todayStart.toISOString(),
          ),

        supabase
          .from("responder_locations")
          .select(
            `
              responder_id,
              emergency_request_id,
              latitude,
              longitude,
              updated_at
            `,
          )
          .order("updated_at", {
            ascending: false,
          }),

        supabase
          .from("responder_presence_locations")
          .select(
            `
              responder_id,
              latitude,
              longitude,
              updated_at
            `,
          )
          .order("updated_at", {
            ascending: false,
          }),
      ]);

      if (emergencyResult.error) {
        setError(
          emergencyResult.error.message,
        );
        return;
      }

      if (responderResult.error) {
        setError(
          responderResult.error.message,
        );
        return;
      }

      if (citizenCountResult.error) {
        setError(
          citizenCountResult.error.message,
        );
        return;
      }

      if (completedTodayResult.error) {
        setError(
          completedTodayResult.error.message,
        );
        return;
      }

      if (responderLocationResult.error) {
        setError(
          responderLocationResult.error.message,
        );
        return;
      }

      if (responderPresenceResult.error) {
        setError(
          responderPresenceResult.error.message,
        );
        return;
      }

      const emergencyRows =
        emergencyResult.data ?? [];

      const responderRows =
        responderResult.data ?? [];

      setEmergencies(emergencyRows);
      setResponders(responderRows);
      setResponderLocations(
        responderLocationResult.data ?? [],
      );

      setPresenceLocations(
        responderPresenceResult.data ?? [],
      );

      try {
        const analyticsData =
          await getAdminAnalytics();

        setAnalytics(analyticsData);
      } catch (analyticsError) {
        console.error(
          "Unable to load analytics:",
          analyticsError,
        );

        setAnalytics(null);
      }

      setStats({
        pendingEmergencies:
          emergencyRows.filter((item) =>
            pendingStatuses.includes(
              item.status ?? "",
            ),
          ).length,

        activeEmergencies:
          emergencyRows.filter((item) =>
            activeStatuses.includes(
              item.status ?? "",
            ),
          ).length,

        availableResponders:
          responderRows.filter(
            (item) =>
              item.availability ===
              "Available",
          ).length,

        busyResponders:
          responderRows.filter(
            (item) =>
              item.availability ===
              "Busy",
          ).length,

        registeredCitizens:
          citizenCountResult.count ?? 0,

        completedToday:
          completedTodayResult.count ?? 0,
      });
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;
    let realtimeChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    // A unique topic prevents channel collisions during
    // React Strict Mode's development-only effect remount.
    const channelId = Math.random()
      .toString(36)
      .slice(2);

    const refreshDashboard = () => {
      if (!isCancelled) {
        void loadDashboardData();
      }
    };

    async function initializeAdmin() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (isCancelled) {
          return;
        }

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

        if (isCancelled) {
          return;
        }

        if (adminError) {
          setError(adminError.message);
          return;
        }

        if (!adminData) {
          router.replace("/dashboard");
          return;
        }

        setAdmin(adminData);
        await loadDashboardData();

        if (isCancelled) {
          return;
        }

        // Register every postgres_changes callback first.
        // Call subscribe() only once, after all listeners exist.
        realtimeChannel = supabase
          .channel(
            `admin-dashboard-realtime-${channelId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "emergency_requests",
            },
            refreshDashboard,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "responders",
            },
            refreshDashboard,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "profiles",
            },
            refreshDashboard,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "responder_locations",
            },
            refreshDashboard,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "responder_presence_locations",
            },
            refreshDashboard,
          )
          .subscribe((status) => {
            if (
              status === "CHANNEL_ERROR" &&
              !isCancelled
            ) {
              setError(
                "Unable to connect to realtime dashboard updates. Refresh the page and try again.",
              );
            }
          });
      } catch (initializationError) {
        if (!isCancelled) {
          console.error(
            "Unable to initialize admin dashboard:",
            initializationError,
          );

          setError(
            "Unable to initialize the admin dashboard. Please refresh the page and try again.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeAdmin();

    return () => {
      isCancelled = true;

      if (realtimeChannel) {
        void supabase.removeChannel(
          realtimeChannel,
        );
      }
    };
  }, [loadDashboardData, router]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setMessage("");

    try {
      await loadDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleResponderSelection(
    emergencyId: string,
    responderId: string,
  ) {
    setSelectedResponders((current) => ({
      ...current,
      [emergencyId]: responderId,
    }));
  }

  async function handleDispatch(
    emergency: EmergencyRequest,
  ) {
    const responderId =
      selectedResponders[emergency.id];

    if (!responderId) {
      setError(
        "Select an available responder first.",
      );
      return;
    }

    const selectedResponder =
      responders.find(
        (item) => item.id === responderId,
      );

    if (
      !selectedResponder ||
      selectedResponder.availability !==
        "Available"
    ) {
      setError(
        "The selected responder is no longer available.",
      );
      await loadDashboardData();
      return;
    }

    setError("");
    setMessage("");
    setProcessingEmergencyId(
      emergency.id,
    );

    try {
      const {
        data: dispatchedRequest,
        error: dispatchError,
      } = await supabase
        .from("emergency_requests")
        .update({
          responder_id: responderId,
          status: "Dispatched",
        })
        .eq("id", emergency.id)
        .is("responder_id", null)
        .in("status", pendingStatuses)
        .select(
          "id, responder_id, status",
        )
        .maybeSingle();

      if (dispatchError) {
        setError(dispatchError.message);
        return;
      }

      if (!dispatchedRequest) {
        setError(
          "This emergency may already have been assigned or updated by another administrator.",
        );

        await loadDashboardData();
        return;
      }

      const {
        error: responderUpdateError,
      } = await supabase
        .from("responders")
        .update({
          availability: "Busy",
          status: "Dispatched",
        })
        .eq("id", responderId)
        .eq(
          "availability",
          "Available",
        );

      if (responderUpdateError) {
        setError(
          `The emergency was dispatched, but the responder status could not be updated: ${responderUpdateError.message}`,
        );
      }

      setSelectedResponders(
        (current) => {
          const updated = {
            ...current,
          };

          delete updated[emergency.id];

          return updated;
        },
      );

      setMessage(
        `Emergency dispatched to ${
          selectedResponder.full_name ||
          "the selected responder"
        }.`,
      );

      await loadDashboardData();
    } catch {
      setError(
        "Unable to dispatch the emergency. Please check your connection and try again.",
      );
    } finally {
      setProcessingEmergencyId(null);
    }
  }

  async function handleLogout() {
    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const responderMap = useMemo(
    () =>
      Object.fromEntries(
        responders.map((responder) => [
          responder.id,
          responder,
        ]),
      ) as Record<string, Responder>,
    [responders],
  );

  const availableResponders =
    useMemo(
      () =>
        responders.filter(
          (responder) =>
            responder.availability ===
            "Available",
        ),
      [responders],
    );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading admin dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <ShieldCheck className="size-6" />
            </span>

            <div>
              <p className="text-xl font-extrabold">
                SAGIP Admin
              </p>

              <p className="text-xs text-slate-500">
                Emergency Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/responders"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Users className="size-4" />

              <span className="hidden sm:inline">
                Responders
              </span>
            </Link>

            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <FileBarChart className="size-4" />
        
              <span className="hidden sm:inline">
                Reports
              </span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
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

        <section className="rounded-3xl bg-gradient-to-r from-red-600 to-red-800 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold text-red-100">
            Admin command center
          </p>

          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Welcome,{" "}
            {admin?.full_name ||
              "SAGIP Administrator"}
          </h1>

          <p className="mt-3 text-red-100">
            {admin?.role ||
              "System Administrator"}
          </p>

          <p className="mt-5 max-w-3xl leading-7 text-red-100">
            Review incoming emergencies and
            dispatch available responders.
          </p>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Link
            href="/admin/reports"
            className="group rounded-3xl border border-red-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 transition group-hover:bg-red-700 group-hover:text-white">
                <FileBarChart className="size-6" />
              </span>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Administrative Reports
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  View filtered emergency records,
                  response statistics, responder
                  performance, CSV exports, and
                  printable reports.
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-red-700">
                  Open Reports
                  <ExternalLink className="size-4" />
                </span>
              </div>
            </div>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <ShieldCheck className="size-6" />
              </span>

              <div>
                <h2 className="text-xl font-extrabold">
                  Command Center Status
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Monitor live emergencies, dispatch
                  available responders, and review
                  incident details from one dashboard.
                </p>

                <p className="mt-4 text-sm font-bold text-emerald-300">
                  System monitoring active
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">
                Live Command Map
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monitor open emergencies and responders who are sharing their live GPS location.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-bold">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-red-700">
                <span className="size-3 rounded-full bg-blue-600" />
                Emergency
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                <span className="size-3 rounded-full bg-emerald-600" />
                Live responder
              </span>
            </div>
          </div>

          <div className="mt-6">
            <AdminCommandMap
              emergencies={emergencies}
              responderLocations={responderLocations}
              presenceLocations={presenceLocations}
              responders={responders}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <h2 className="text-2xl font-extrabold">
                Dispatch Board
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assign an available responder to
                each pending emergency.
              </p>
            </div>

            {emergencies.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <ShieldCheck className="mx-auto size-12 text-slate-300" />

                <p className="mt-4 font-extrabold text-slate-700">
                  No open emergencies
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {emergencies.map(
                  (emergency) => (
                    <EmergencyCard
                      key={emergency.id}
                      emergency={emergency}
                      responder={
                        emergency.responder_id
                          ? responderMap[
                              emergency
                                .responder_id
                            ] ?? null
                          : null
                      }
                      availableResponders={
                        availableResponders
                      }
                      selectedResponderId={
                        selectedResponders[
                          emergency.id
                        ] ?? ""
                      }
                      processing={
                        processingEmergencyId ===
                        emergency.id
                      }
                      onResponderSelection={
                        handleResponderSelection
                      }
                      onDispatch={
                        handleDispatch
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-extrabold">
              Responders
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current responder availability.
            </p>

            <div className="mt-6 space-y-3">
              {responders.map((responder) => (
                <ResponderRow
                  key={responder.id}
                  responder={responder}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <DashboardCard
            title="Pending"
            value={stats.pendingEmergencies}
            icon={AlertTriangle}
            tone="amber"
          />

          <DashboardCard
            title="Active"
            value={stats.activeEmergencies}
            icon={Siren}
            tone="red"
          />

          <DashboardCard
            title="Available"
            value={stats.availableResponders}
            icon={Activity}
            tone="emerald"
          />

          <DashboardCard
            title="Busy"
            value={stats.busyResponders}
            icon={UserRound}
            tone="violet"
          />

          <DashboardCard
            title="Citizens"
            value={stats.registeredCitizens}
            icon={Users}
            tone="blue"
          />

          <DashboardCard
            title="Completed Today"
            value={stats.completedToday}
            icon={CheckCircle2}
            tone="emerald"
          />
        </section>

        {analytics && (
          <section className="mt-8 space-y-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <BarChart3 className="size-5" />
                </span>

                <div>
                  <h2 className="text-2xl font-extrabold">
                    Emergency Analytics
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Operational performance based
                    on recorded emergency activity.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <PerformanceCard
                title="Completion Rate"
                value={`${analytics.stats.completionRate}%`}
                description={`${analytics.stats.totalEmergencies} total recorded emergencies`}
                icon={CheckCircle2}
                tone="emerald"
              />

              <PerformanceCard
                title="Average Acceptance"
                value={formatDuration(
                  analytics.stats
                    .averageAcceptanceMinutes,
                )}
                description="Request submitted to responder acceptance"
                icon={Timer}
                tone="blue"
              />

              <PerformanceCard
                title="Average Arrival"
                value={formatDuration(
                  analytics.stats
                    .averageArrivalMinutes,
                )}
                description="Responder acceptance to scene arrival"
                icon={TrendingUp}
                tone="violet"
              />

              <PerformanceCard
                title="Average Completion"
                value={formatDuration(
                  analytics.stats
                    .averageCompletionMinutes,
                )}
                description="Scene arrival to incident completion"
                icon={Clock3}
                tone="amber"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <EmergencyTrendChart
                data={
                  analytics.emergencyTrend
                }
              />

              <EmergencyTypeBreakdown
                data={
                  analytics.emergencyTypes
                }
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
              <ResponderAvailabilityChart
                data={
                  analytics.responderAvailability
                }
              />

              <RecentEmergencyList
                emergencies={
                  analytics.recentEmergencies
                }
              />
            </div>
          </section>
        )}

        
      </section>
    </main>
  );
}


type PerformanceCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tone:
    | "emerald"
    | "blue"
    | "violet"
    | "amber";
};

function PerformanceCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: PerformanceCardProps) {
  const toneClasses = {
    emerald:
      "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    violet:
      "bg-violet-100 text-violet-700",
    amber:
      "bg-amber-100 text-amber-700",
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {value}
          </p>
        </div>

        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          <Icon className="size-5" />
        </span>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </article>
  );
}

type EmergencyTrendChartProps = {
  data: AdminAnalyticsData["emergencyTrend"];
};

function EmergencyTrendChart({
  data,
}: EmergencyTrendChartProps) {
  const maximum = Math.max(
    1,
    ...data.map((item) => item.count),
  );

  const total = data.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold">
            Emergency Requests
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Requests received during the last
            seven days.
          </p>
        </div>

        <div className="rounded-2xl bg-red-50 px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-red-500">
            7-day total
          </p>

          <p className="mt-1 text-2xl font-extrabold text-red-700">
            {total}
          </p>
        </div>
      </div>

      <div className="mt-8 flex h-64 items-end gap-3">
        {data.map((item) => {
          const height =
            item.count === 0
              ? 4
              : Math.max(
                  12,
                  (item.count / maximum) *
                    100,
                );

          return (
            <div
              key={item.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-2 text-xs font-extrabold text-slate-600">
                {item.count}
              </span>

              <div className="flex h-44 w-full items-end rounded-xl bg-slate-100 p-1">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-red-700 to-red-500 transition-all"
                  style={{
                    height: `${height}%`,
                  }}
                  title={`${item.label}: ${item.count} emergencies`}
                />
              </div>

              <span className="mt-3 text-xs font-bold text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type EmergencyTypeBreakdownProps = {
  data: AdminAnalyticsData["emergencyTypes"];
};

function EmergencyTypeBreakdown({
  data,
}: EmergencyTypeBreakdownProps) {
  const total = data.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const visibleData = data.slice(0, 6);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <PieChart className="size-5" />
        </span>

        <div>
          <h3 className="text-xl font-extrabold">
            Emergency Types
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Most frequently reported categories.
          </p>
        </div>
      </div>

      {visibleData.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No emergency data recorded yet.
        </p>
      ) : (
        <div className="mt-7 space-y-5">
          {visibleData.map((item) => {
            const percentage =
              total > 0
                ? Math.round(
                    (item.count / total) *
                      100,
                  )
                : 0;

            return (
              <div
                key={item.emergencyType}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="truncate text-sm font-bold text-slate-700">
                    {item.emergencyType}
                  </p>

                  <p className="shrink-0 text-sm font-extrabold text-slate-900">
                    {item.count}{" "}
                    <span className="font-semibold text-slate-400">
                      ({percentage}%)
                    </span>
                  </p>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-600"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

type ResponderAvailabilityChartProps = {
  data: AdminAnalyticsData["responderAvailability"];
};

function ResponderAvailabilityChart({
  data,
}: ResponderAvailabilityChartProps) {
  const maximum = Math.max(
    1,
    ...data.map((item) => item.count),
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <h3 className="text-xl font-extrabold">
        Responder Availability
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Current operational availability.
      </p>

      <div className="mt-7 space-y-6">
        {data.map((item) => {
          const percentage =
            (item.count / maximum) * 100;

          return (
            <div key={item.availability}>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-slate-700">
                  {item.availability}
                </p>

                <p className="text-lg font-extrabold text-slate-900">
                  {item.count}
                </p>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    item.availability ===
                    "Available"
                      ? "bg-emerald-600"
                      : item.availability ===
                          "Busy"
                        ? "bg-amber-500"
                        : "bg-slate-500"
                  }`}
                  style={{
                    width: `${Math.max(
                      item.count === 0
                        ? 0
                        : 8,
                      percentage,
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type RecentEmergencyListProps = {
  emergencies: AdminAnalyticsData["recentEmergencies"];
};

function RecentEmergencyList({
  emergencies,
}: RecentEmergencyListProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div>
        <h3 className="text-xl font-extrabold">
          Recent Emergencies
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Latest emergency activity across the
          system.
        </p>
      </div>

      {emergencies.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <ShieldCheck className="mx-auto size-10 text-slate-300" />

          <p className="mt-3 font-bold text-slate-600">
            No emergency records yet
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {emergencies.map(
            (emergency) => (
              <article
                key={emergency.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                      <Siren className="size-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-extrabold">
                        {emergency.emergency_type ||
                          "Emergency Request"}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {emergency.address ||
                          "Address unavailable"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <StatusBadge
                    status={
                      emergency.status ||
                      "Pending"
                    }
                  />

                  <p className="text-xs text-slate-400">
                    {formatDateTime(
                      emergency.created_at,
                    )}
                  </p>

                  <Link
                    href={`/admin/incidents/${emergency.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    <Eye className="size-4" />
                    View Details
                  </Link>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

type EmergencyCardProps = {
  emergency: EmergencyRequest;
  responder: Responder | null;
  availableResponders: Responder[];
  selectedResponderId: string;
  processing: boolean;
  onResponderSelection: (
    emergencyId: string,
    responderId: string,
  ) => void;
  onDispatch: (
    emergency: EmergencyRequest,
  ) => void;
};

function EmergencyCard({
  emergency,
  responder,
  availableResponders,
  selectedResponderId,
  processing,
  onResponderSelection,
  onDispatch,
}: EmergencyCardProps) {
  const mapUrl = createMapUrl(emergency);

  const canDispatch =
    pendingStatuses.includes(
      emergency.status ?? "",
    ) &&
    !emergency.responder_id;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white">
            <Siren className="size-5" />
          </span>

          <div>
            <h3 className="text-lg font-extrabold">
              {emergency.emergency_type ||
                "Emergency Request"}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Clock3 className="size-3.5" />
              {formatDateTime(
                emergency.created_at,
              )}
            </div>
          </div>
        </div>

        <StatusBadge
          status={
            emergency.status ?? "Pending"
          }
        />
      </div>

      <div className="mt-5 space-y-3">
        <InfoRow
          icon={MapPin}
          value={
            emergency.address ||
            "Address unavailable"
          }
        />

        <InfoRow
          icon={AlertTriangle}
          value={
            emergency.description ||
            "No description provided."
          }
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Assigned responder
        </p>

        <p className="mt-1 text-sm font-bold text-slate-700">
          {responder
            ? responder.full_name ||
              "Emergency Responder"
            : "Not yet assigned"}
        </p>

        {responder?.agency && (
          <p className="mt-1 text-xs text-slate-500">
            {responder.agency}
          </p>
        )}
      </div>

      {canDispatch && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <label
            htmlFor={`responder-${emergency.id}`}
            className="text-sm font-extrabold text-slate-700"
          >
            Assign responder
          </label>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              id={`responder-${emergency.id}`}
              value={selectedResponderId}
              onChange={(event) =>
                onResponderSelection(
                  emergency.id,
                  event.target.value,
                )
              }
              disabled={
                processing ||
                availableResponders.length === 0
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
            >
              <option value="">
                {availableResponders.length ===
                0
                  ? "No responders available"
                  : "Select responder"}
              </option>

              {availableResponders.map(
                (availableResponder) => (
                  <option
                    key={
                      availableResponder.id
                    }
                    value={
                      availableResponder.id
                    }
                  >
                    {availableResponder.full_name ||
                      "Emergency Responder"}
                    {availableResponder.agency
                      ? ` — ${availableResponder.agency}`
                      : ""}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() =>
                onDispatch(emergency)
              }
              disabled={
                processing ||
                !selectedResponderId
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}

              {processing
                ? "Dispatching..."
                : "Dispatch"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <ExternalLink className="size-4" />
            View Location
          </a>
        )}

        <Link
          href={`/admin/incidents/${emergency.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Eye className="size-4" />
          View Details
        </Link>
      </div>
    </article>
  );
}

type DashboardCardProps = {
  title: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tone:
    | "red"
    | "amber"
    | "emerald"
    | "blue"
    | "violet";
};

function DashboardCard({
  title,
  value,
  icon: Icon,
  tone,
}: DashboardCardProps) {
  const toneClasses = {
    red: "bg-red-100 text-red-700",
    amber:
      "bg-amber-100 text-amber-700",
    emerald:
      "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    violet:
      "bg-violet-100 text-violet-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`flex size-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
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

type ResponderRowProps = {
  responder: Responder;
};

function ResponderRow({
  responder,
}: ResponderRowProps) {
  const available =
    responder.availability === "Available";

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          available
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        <UserRound className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">
          {responder.full_name ||
            "Emergency Responder"}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          {responder.agency ||
            "Emergency Agency"}
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-extrabold ${
          available
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {responder.availability ||
          "Unknown"}
      </span>
    </article>
  );
}

type InfoRowProps = {
  icon: React.ComponentType<{
    className?: string;
  }>;
  value: string;
};

function InfoRow({
  icon: Icon,
  value,
}: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-red-700" />

      <p className="text-sm leading-6 text-slate-600">
        {value}
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
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${getStatusClasses(
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

function createMapUrl(
  emergency: EmergencyRequest,
) {
  if (
    emergency.latitude === null ||
    emergency.longitude === null
  ) {
    return null;
  }

  const latitude = Number(
    emergency.latitude,
  );

  const longitude = Number(
    emergency.longitude,
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
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