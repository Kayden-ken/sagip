import { supabase } from "@/lib/supabase";

export type ReportFilters = {
  startDate: string;
  endDate: string;
  status: string;
  emergencyType: string;
};

export type ReportEmergency = {
  id: string;
  emergencyType: string;
  description: string | null;
  address: string | null;
  status: string;
  responderId: string | null;
  responderName: string | null;
  responderAgency: string | null;
  citizenId: string | null;
  citizenName: string | null;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
};

export type ReportSummary = {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  averageAcceptanceMinutes: number | null;
  averageArrivalMinutes: number | null;
  averageResolutionMinutes: number | null;
};

export type EmergencyTypeSummary = {
  emergencyType: string;
  count: number;
  percentage: number;
};

export type ResponderPerformance = {
  responderId: string;
  responderName: string;
  agency: string;
  assigned: number;
  completed: number;
  active: number;
  cancelled: number;
  completionRate: number;
  averageAcceptanceMinutes: number | null;
  averageArrivalMinutes: number | null;
  averageResolutionMinutes: number | null;
};

export type AdminReportsData = {
  filters: ReportFilters;
  summary: ReportSummary;
  emergencies: ReportEmergency[];
  emergencyTypes: string[];
  statuses: string[];
  emergencyTypeSummary: EmergencyTypeSummary[];
  responderPerformance: ResponderPerformance[];
};

type EmergencyRow = {
  id: string;
  emergency_type: string | null;
  description: string | null;
  address: string | null;
  status: string | null;
  responder_id: string | null;
  profile_id: string | null;
  created_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
};

type ResponderRow = {
  id: string;
  full_name: string | null;
  agency: string | null;
};

type CitizenRow = {
  id: string;
};

const ACTIVE_STATUSES = [
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export function createDefaultReportFilters(): ReportFilters {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: toInputDate(firstDay),
    endDate: toInputDate(now),
    status: "All",
    emergencyType: "All",
  };
}

export async function getAdminReports(
  filters: ReportFilters,
): Promise<AdminReportsData> {
  const normalizedFilters = normalizeFilters(filters);

  let emergencyQuery = supabase
    .from("emergency_requests")
    .select(
      `
        id,
        emergency_type,
        description,
        address,
        status,
        responder_id,
        profile_id,
        created_at,
        accepted_at,
        arrived_at,
        completed_at
      `,
    )
    .gte("created_at", startOfDayIso(normalizedFilters.startDate))
    .lte("created_at", endOfDayIso(normalizedFilters.endDate))
    .order("created_at", { ascending: false });

  if (normalizedFilters.status !== "All") {
    emergencyQuery = emergencyQuery.eq(
      "status",
      normalizedFilters.status,
    );
  }

  if (normalizedFilters.emergencyType !== "All") {
    emergencyQuery = emergencyQuery.eq(
      "emergency_type",
      normalizedFilters.emergencyType,
    );
  }

  const [
    emergenciesResult,
    respondersResult,
    citizensResult,
    allTypesResult,
  ] = await Promise.all([
    emergencyQuery,
    supabase
      .from("responders")
      .select("id, full_name, agency")
      .order("full_name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id"),
    supabase
      .from("emergency_requests")
      .select("emergency_type"),
  ]);

  if (emergenciesResult.error) {
    throw new Error(
      `Unable to load report emergencies: ${emergenciesResult.error.message}`,
    );
  }

  if (respondersResult.error) {
    throw new Error(
      `Unable to load responder records: ${respondersResult.error.message}`,
    );
  }

  if (citizensResult.error) {
    throw new Error(
      `Unable to load citizen records: ${citizensResult.error.message}`,
    );
  }

  if (allTypesResult.error) {
    throw new Error(
      `Unable to load emergency types: ${allTypesResult.error.message}`,
    );
  }

  const emergencyRows =
    (emergenciesResult.data ?? []) as EmergencyRow[];
  const responderRows =
    (respondersResult.data ?? []) as ResponderRow[];
  const citizenRows =
    (citizensResult.data ?? []) as CitizenRow[];

  const responderMap = new Map(
    responderRows.map((item) => [item.id, item]),
  );

  const citizenMap = new Map(
    citizenRows.map((item) => [item.id, item]),
  );

  const emergencies: ReportEmergency[] = emergencyRows.map(
    (item) => {
      const responder = item.responder_id
        ? responderMap.get(item.responder_id)
        : undefined;

      const citizen = item.profile_id
        ? citizenMap.get(item.profile_id)
        : undefined;

      return {
        id: item.id,
        emergencyType:
          item.emergency_type?.trim() || "Other",
        description: item.description,
        address: item.address,
        status: item.status?.trim() || "Unknown",
        responderId: item.responder_id,
        responderName:
          responder?.full_name ?? null,
        responderAgency:
          responder?.agency ?? null,
        citizenId: item.profile_id,
        citizenName: item.profile_id ?? null,
        createdAt: item.created_at,
        acceptedAt: item.accepted_at,
        arrivedAt: item.arrived_at,
        completedAt: item.completed_at,
      };
    },
  );

  const emergencyTypes = Array.from(
    new Set(
      (allTypesResult.data ?? [])
        .map((item) =>
          typeof item.emergency_type === "string"
            ? item.emergency_type.trim()
            : "",
        )
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const statuses = [
    "Pending",
    "Verified",
    "Dispatched",
    "Accepted",
    "Responding",
    "Arrived",
    "In Progress",
    "Completed",
    "Cancelled",
  ];

  return {
    filters: normalizedFilters,
    summary: buildSummary(emergencies),
    emergencies,
    emergencyTypes,
    statuses,
    emergencyTypeSummary:
      buildEmergencyTypeSummary(emergencies),
    responderPerformance:
      buildResponderPerformance(
        emergencies,
        responderRows,
      ),
  };
}

function buildSummary(
  emergencies: ReportEmergency[],
): ReportSummary {
  const total = emergencies.length;
  const pending = emergencies.filter(
    (item) => item.status === "Pending",
  ).length;
  const active = emergencies.filter((item) =>
    ACTIVE_STATUSES.includes(item.status),
  ).length;
  const completed = emergencies.filter(
    (item) => item.status === "Completed",
  ).length;
  const cancelled = emergencies.filter(
    (item) => item.status === "Cancelled",
  ).length;

  return {
    total,
    pending,
    active,
    completed,
    cancelled,
    completionRate:
      total > 0
        ? Math.round((completed / total) * 100)
        : 0,
    averageAcceptanceMinutes:
      calculateAverage(
        emergencies,
        "createdAt",
        "acceptedAt",
      ),
    averageArrivalMinutes:
      calculateAverage(
        emergencies,
        "acceptedAt",
        "arrivedAt",
      ),
    averageResolutionMinutes:
      calculateAverage(
        emergencies,
        "arrivedAt",
        "completedAt",
      ),
  };
}

function buildEmergencyTypeSummary(
  emergencies: ReportEmergency[],
): EmergencyTypeSummary[] {
  const counts = new Map<string, number>();

  emergencies.forEach((item) => {
    counts.set(
      item.emergencyType,
      (counts.get(item.emergencyType) ?? 0) + 1,
    );
  });

  const total = emergencies.length;

  return Array.from(counts.entries())
    .map(([emergencyType, count]) => ({
      emergencyType,
      count,
      percentage:
        total > 0
          ? Math.round((count / total) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildResponderPerformance(
  emergencies: ReportEmergency[],
  responders: ResponderRow[],
): ResponderPerformance[] {
  return responders
    .map((responder) => {
      const assigned = emergencies.filter(
        (item) => item.responderId === responder.id,
      );

      const completed = assigned.filter(
        (item) => item.status === "Completed",
      ).length;

      const active = assigned.filter((item) =>
        ACTIVE_STATUSES.includes(item.status),
      ).length;

      const cancelled = assigned.filter(
        (item) => item.status === "Cancelled",
      ).length;

      return {
        responderId: responder.id,
        responderName:
          responder.full_name ||
          "Emergency Responder",
        agency:
          responder.agency ||
          "Emergency Agency",
        assigned: assigned.length,
        completed,
        active,
        cancelled,
        completionRate:
          assigned.length > 0
            ? Math.round(
                (completed / assigned.length) * 100,
              )
            : 0,
        averageAcceptanceMinutes:
          calculateAverage(
            assigned,
            "createdAt",
            "acceptedAt",
          ),
        averageArrivalMinutes:
          calculateAverage(
            assigned,
            "acceptedAt",
            "arrivedAt",
          ),
        averageResolutionMinutes:
          calculateAverage(
            assigned,
            "arrivedAt",
            "completedAt",
          ),
      };
    })
    .filter((item) => item.assigned > 0)
    .sort((a, b) => {
      if (b.completed !== a.completed) {
        return b.completed - a.completed;
      }

      return b.assigned - a.assigned;
    });
}

function calculateAverage(
  emergencies: ReportEmergency[],
  startField:
    | "createdAt"
    | "acceptedAt"
    | "arrivedAt",
  endField:
    | "acceptedAt"
    | "arrivedAt"
    | "completedAt",
): number | null {
  const durations = emergencies.flatMap((item) => {
    const start = item[startField];
    const end = item[endField];

    if (!start || !end) {
      return [];
    }

    const difference =
      new Date(end).getTime() -
      new Date(start).getTime();

    if (
      !Number.isFinite(difference) ||
      difference < 0
    ) {
      return [];
    }

    return [difference / 60000];
  });

  if (durations.length === 0) {
    return null;
  }

  return Number(
    (
      durations.reduce(
        (sum, duration) => sum + duration,
        0,
      ) / durations.length
    ).toFixed(1),
  );
}

function normalizeFilters(
  filters: ReportFilters,
): ReportFilters {
  const defaults = createDefaultReportFilters();

  return {
    startDate:
      filters.startDate || defaults.startDate,
    endDate:
      filters.endDate || defaults.endDate,
    status: filters.status || "All",
    emergencyType:
      filters.emergencyType || "All",
  };
}

function startOfDayIso(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function endOfDayIso(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}