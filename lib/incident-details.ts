import { supabase } from "@/lib/supabase";

export type IncidentCitizen = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type IncidentResponder = {
  id: string;
  fullName: string;
  agency: string | null;
  phone: string | null;
  status: string | null;
  availability: string | null;
};

export type IncidentTimeline = {
  reportedAt: string | null;
  verifiedAt: string | null;
  dispatchedAt: string | null;
  acceptedAt: string | null;
  respondingAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type IncidentDurations = {
  acceptanceMinutes: number | null;
  dispatchToAcceptanceMinutes: number | null;
  travelMinutes: number | null;
  resolutionMinutes: number | null;
  totalMinutes: number | null;
};

export type IncidentDetailsData = {
  id: string;
  emergencyType: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  citizen: IncidentCitizen | null;
  responder: IncidentResponder | null;
  timeline: IncidentTimeline;
  durations: IncidentDurations;
};

type UnknownRow = Record<string, unknown>;

export async function getIncidentDetails(
  incidentId: string,
): Promise<IncidentDetailsData | null> {
  const {
    data: emergencyData,
    error: emergencyError,
  } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("id", incidentId)
    .maybeSingle();

  if (emergencyError) {
    throw new Error(emergencyError.message);
  }

  if (!emergencyData) {
    return null;
  }

  const emergency =
    emergencyData as UnknownRow;

  const profileId = stringOrNull(
    emergency.profile_id,
  );

  const responderId = stringOrNull(
    emergency.responder_id,
  );

  const [
    citizenResult,
    responderResult,
  ] = await Promise.all([
    profileId
      ? supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    responderId
      ? supabase
          .from("responders")
          .select("*")
          .eq("id", responderId)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  if (citizenResult.error) {
    throw new Error(
      citizenResult.error.message,
    );
  }

  if (responderResult.error) {
    throw new Error(
      responderResult.error.message,
    );
  }

  const citizenRow =
    citizenResult.data
      ? (citizenResult.data as UnknownRow)
      : null;

  const responderRow =
    responderResult.data
      ? (responderResult.data as UnknownRow)
      : null;

  const timeline: IncidentTimeline = {
    reportedAt: firstDate(
      emergency.created_at,
      emergency.reported_at,
    ),

    verifiedAt: firstDate(
      emergency.verified_at,
    ),

    dispatchedAt: firstDate(
      emergency.dispatched_at,
    ),

    acceptedAt: firstDate(
      emergency.accepted_at,
    ),

    respondingAt: firstDate(
      emergency.responding_at,
    ),

    arrivedAt: firstDate(
      emergency.arrived_at,
    ),

    startedAt: firstDate(
      emergency.started_at,
      emergency.in_progress_at,
    ),

    completedAt: firstDate(
      emergency.completed_at,
    ),

    cancelledAt: firstDate(
      emergency.cancelled_at,
    ),
  };

  return {
    id: String(emergency.id),

    emergencyType:
      stringOrNull(
        emergency.emergency_type,
      ) ?? "Emergency Request",

    description: stringOrNull(
      emergency.description,
    ),

    address: stringOrNull(
      emergency.address,
    ),

    latitude: numberOrNull(
      emergency.latitude,
    ),

    longitude: numberOrNull(
      emergency.longitude,
    ),

    status:
      stringOrNull(
        emergency.status,
      ) ?? "Pending",

    createdAt:
      firstDate(
        emergency.created_at,
      ) ?? new Date().toISOString(),

    updatedAt: firstDate(
      emergency.updated_at,
    ),

    citizen: citizenRow
      ? normalizeCitizen(citizenRow)
      : null,

    responder: responderRow
      ? normalizeResponder(
          responderRow,
        )
      : null,

    timeline,

    durations:
      calculateDurations(timeline),
  };
}

function normalizeCitizen(
  row: UnknownRow,
): IncidentCitizen {
  return {
    id: String(row.id ?? ""),

    fullName:
      firstString(
        row.full_name,
        row.name,
      ) ?? "Registered Citizen",

    email: firstString(
      row.email,
    ),

    phone: firstString(
      row.phone,
      row.phone_number,
      row.contact_number,
      row.mobile_number,
    ),

    address: firstString(
      row.address,
      row.home_address,
    ),
  };
}

function normalizeResponder(
  row: UnknownRow,
): IncidentResponder {
  return {
    id: String(row.id ?? ""),

    fullName:
      firstString(
        row.full_name,
        row.name,
      ) ?? "Emergency Responder",

    agency: firstString(
      row.agency,
      row.organization,
      row.department,
    ),

    phone: firstString(
      row.phone,
      row.phone_number,
      row.contact_number,
      row.mobile_number,
    ),

    status: firstString(
      row.status,
    ),

    availability: firstString(
      row.availability,
    ),
  };
}

function calculateDurations(
  timeline: IncidentTimeline,
): IncidentDurations {
  return {
    acceptanceMinutes: minutesBetween(
      timeline.reportedAt,
      timeline.acceptedAt,
    ),

    dispatchToAcceptanceMinutes:
      minutesBetween(
        timeline.dispatchedAt,
        timeline.acceptedAt,
      ),

    travelMinutes: minutesBetween(
      timeline.acceptedAt,
      timeline.arrivedAt,
    ),

    resolutionMinutes: minutesBetween(
      timeline.arrivedAt ??
        timeline.startedAt,
      timeline.completedAt,
    ),

    totalMinutes: minutesBetween(
      timeline.reportedAt,
      timeline.completedAt,
    ),
  };
}

function minutesBetween(
  start: string | null,
  end: string | null,
): number | null {
  if (!start || !end) {
    return null;
  }

  const startTime =
    new Date(start).getTime();

  const endTime =
    new Date(end).getTime();

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    return null;
  }

  const minutes =
    (endTime - startTime) /
    60000;

  return (
    Math.round(minutes * 10) / 10
  );
}

function firstDate(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    if (
      typeof value !== "string" ||
      value.trim() === ""
    ) {
      continue;
    }

    const date = new Date(value);

    if (
      Number.isFinite(
        date.getTime(),
      )
    ) {
      return date.toISOString();
    }
  }

  return null;
}

function firstString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    const normalized =
      stringOrNull(value);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function stringOrNull(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function numberOrNull(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue,
  )
    ? numericValue
    : null;
}