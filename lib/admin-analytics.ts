import { supabase } from "@/lib/supabase";

export type AdminDashboardStats = {
  activeEmergencies: number;
  availableResponders: number;
  registeredCitizens: number;
  completedToday: number;
  totalEmergencies: number;
  completionRate: number;
  averageAcceptanceMinutes: number | null;
  averageArrivalMinutes: number | null;
  averageCompletionMinutes: number | null;
};

export type EmergencyTrendPoint = {
  date: string;
  label: string;
  count: number;
};

export type EmergencyTypePoint = {
  emergencyType: string;
  count: number;
};

export type ResponderAvailabilityPoint = {
  availability: string;
  count: number;
};

export type RecentEmergency = {
  id: string;
  emergency_type: string | null;
  status: string | null;
  address: string | null;
  created_at: string;
  responder_id: string | null;
};

export type AdminAnalyticsData = {
  stats: AdminDashboardStats;
  emergencyTrend: EmergencyTrendPoint[];
  emergencyTypes: EmergencyTypePoint[];
  responderAvailability: ResponderAvailabilityPoint[];
  recentEmergencies: RecentEmergency[];
};

type EmergencyAnalyticsRow = {
  id: string;
  emergency_type: string | null;
  status: string | null;
  address: string | null;
  created_at: string;
  responder_id: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
};

type ResponderAnalyticsRow = {
  id: string;
  availability: string | null;
  status: string | null;
};

const ACTIVE_STATUSES = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

const COMPLETED_STATUS = "Completed";

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const [
    emergenciesResult,
    respondersResult,
    citizensResult,
  ] = await Promise.all([
    supabase
      .from("emergency_requests")
      .select(
        `
          id,
          emergency_type,
          status,
          address,
          created_at,
          responder_id,
          accepted_at,
          arrived_at,
          completed_at
        `,
      )
      .order("created_at", {
        ascending: false,
      }),
    supabase
      .from("responders")
      .select(
        `
          id,
          availability,
          status
        `,
      ),
    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  if (emergenciesResult.error) {
    throw new Error(
      `Unable to load emergency analytics: ${emergenciesResult.error.message}`,
    );
  }

  if (respondersResult.error) {
    throw new Error(
      `Unable to load responder analytics: ${respondersResult.error.message}`,
    );
  }

  if (citizensResult.error) {
    throw new Error(
      `Unable to load citizen count: ${citizensResult.error.message}`,
    );
  }

  const emergencies =
    (emergenciesResult.data ??
      []) as EmergencyAnalyticsRow[];

  const responders =
    (respondersResult.data ??
      []) as ResponderAnalyticsRow[];

  const registeredCitizens =
    citizensResult.count ?? 0;

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = addDays(
    todayStart,
    1,
  );

  const activeEmergencies =
    emergencies.filter((request) =>
      ACTIVE_STATUSES.includes(
        request.status ?? "",
      ),
    ).length;

  const availableResponders =
    responders.filter((responder) => {
      const availability =
        normalizeValue(
          responder.availability,
        );

      return availability === "available";
    }).length;

  const completedToday =
    emergencies.filter((request) => {
      if (
        request.status !==
          COMPLETED_STATUS ||
        !request.completed_at
      ) {
        return false;
      }

      const completedAt = new Date(
        request.completed_at,
      );

      return (
        completedAt >= todayStart &&
        completedAt < tomorrowStart
      );
    }).length;

  const completedCount =
    emergencies.filter(
      (request) =>
        request.status ===
        COMPLETED_STATUS,
    ).length;

  const totalEmergencies =
    emergencies.length;

  const completionRate =
    totalEmergencies > 0
      ? Math.round(
          (completedCount /
            totalEmergencies) *
            100,
        )
      : 0;

  const stats: AdminDashboardStats = {
    activeEmergencies,
    availableResponders,
    registeredCitizens,
    completedToday,
    totalEmergencies,
    completionRate,
    averageAcceptanceMinutes:
      calculateAverageDurationMinutes(
        emergencies,
        "created_at",
        "accepted_at",
      ),
    averageArrivalMinutes:
      calculateAverageDurationMinutes(
        emergencies,
        "accepted_at",
        "arrived_at",
      ),
    averageCompletionMinutes:
      calculateAverageDurationMinutes(
        emergencies,
        "arrived_at",
        "completed_at",
      ),
  };

  return {
    stats,
    emergencyTrend:
      buildEmergencyTrend(
        emergencies,
        now,
      ),
    emergencyTypes:
      buildEmergencyTypes(
        emergencies,
      ),
    responderAvailability:
      buildResponderAvailability(
        responders,
      ),
    recentEmergencies:
      emergencies
        .slice(0, 8)
        .map((request) => ({
          id: request.id,
          emergency_type:
            request.emergency_type,
          status: request.status,
          address: request.address,
          created_at:
            request.created_at,
          responder_id:
            request.responder_id,
        })),
  };
}

function buildEmergencyTrend(
  emergencies: EmergencyAnalyticsRow[],
  now: Date,
): EmergencyTrendPoint[] {
  const todayStart =
    startOfLocalDay(now);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const dayStart = addDays(
        todayStart,
        index - 6,
      );

      const dayEnd = addDays(
        dayStart,
        1,
      );

      const count =
        emergencies.filter(
          (request) => {
            const createdAt =
              new Date(
                request.created_at,
              );

            return (
              createdAt >= dayStart &&
              createdAt < dayEnd
            );
          },
        ).length;

      return {
        date: toDateKey(dayStart),
        label:
          new Intl.DateTimeFormat(
            "en-PH",
            {
              weekday: "short",
            },
          ).format(dayStart),
        count,
      };
    },
  );
}

function buildEmergencyTypes(
  emergencies: EmergencyAnalyticsRow[],
): EmergencyTypePoint[] {
  const counts = new Map<
    string,
    number
  >();

  emergencies.forEach((request) => {
    const emergencyType =
      request.emergency_type?.trim() ||
      "Other";

    counts.set(
      emergencyType,
      (counts.get(emergencyType) ??
        0) + 1,
    );
  });

  return Array.from(
    counts.entries(),
  )
    .map(
      ([
        emergencyType,
        count,
      ]) => ({
        emergencyType,
        count,
      }),
    )
    .sort(
      (first, second) =>
        second.count - first.count,
    );
}

function buildResponderAvailability(
  responders: ResponderAnalyticsRow[],
): ResponderAvailabilityPoint[] {
  const categories = [
    "Available",
    "Busy",
    "Offline",
  ];

  const counts = new Map<
    string,
    number
  >(
    categories.map((category) => [
      category,
      0,
    ]),
  );

  responders.forEach((responder) => {
    const availability =
      normalizeValue(
        responder.availability,
      );

    const status = normalizeValue(
      responder.status,
    );

    let category = "Offline";

    if (availability === "available") {
      category = "Available";
    } else if (
      availability === "busy" ||
      status === "on duty"
    ) {
      category = "Busy";
    }

    counts.set(
      category,
      (counts.get(category) ?? 0) +
        1,
    );
  });

  return categories.map(
    (availability) => ({
      availability,
      count:
        counts.get(availability) ?? 0,
    }),
  );
}

function calculateAverageDurationMinutes(
  emergencies: EmergencyAnalyticsRow[],
  startField:
    | "created_at"
    | "accepted_at"
    | "arrived_at",
  endField:
    | "accepted_at"
    | "arrived_at"
    | "completed_at",
): number | null {
  const durations =
    emergencies.flatMap(
      (request) => {
        const startValue =
          request[startField];

        const endValue =
          request[endField];

        if (
          !startValue ||
          !endValue
        ) {
          return [];
        }

        const startTime =
          new Date(
            startValue,
          ).getTime();

        const endTime =
          new Date(
            endValue,
          ).getTime();

        const duration =
          endTime - startTime;

        if (
          !Number.isFinite(
            duration,
          ) ||
          duration < 0
        ) {
          return [];
        }

        return [
          duration / 60000,
        ];
      },
    );

  if (durations.length === 0) {
    return null;
  }

  const total =
    durations.reduce(
      (sum, duration) =>
        sum + duration,
      0,
    );

  return Number(
    (
      total /
      durations.length
    ).toFixed(1),
  );
}

function normalizeValue(
  value: string | null,
) {
  return (
    value?.trim().toLowerCase() ??
    ""
  );
}

function startOfLocalDay(
  date: Date,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function addDays(
  date: Date,
  numberOfDays: number,
) {
  const result = new Date(date);
  result.setDate(
    result.getDate() +
      numberOfDays,
  );
  return result;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}