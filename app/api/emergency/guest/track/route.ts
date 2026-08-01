import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKING_CODE_PATTERN =
  /^SGP-\d{4}-[A-F0-9]{10}$/;

type TrackingRequestBody = {
  trackingCode?: unknown;
  guestPhone?: unknown;
};

export async function POST(
  request: Request,
) {
  let body: TrackingRequestBody;

  try {
    body =
      (await request.json()) as TrackingRequestBody;
  } catch {
    return jsonError(
      "Invalid request body.",
      400,
    );
  }

  const trackingCode =
    normalizeTrackingCode(
      body.trackingCode,
    );

  const guestPhone = normalizePhone(
    body.guestPhone,
  );

  if (!trackingCode || !guestPhone) {
    return jsonError(
      "Enter a valid tracking code and contact number.",
      400,
    );
  }

  const trackingHash =
    hashTrackingCode(trackingCode);

  const {
    data: emergency,
    error: emergencyError,
  } = await supabaseAdmin
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
        created_at,
        accepted_at,
        arrived_at,
        completed_at,
        cancelled_at,
        guest_tracking_expires_at
      `,
    )
    .eq("request_source", "guest")
    .eq(
      "guest_tracking_hash",
      trackingHash,
    )
    .eq("guest_phone", guestPhone)
    .maybeSingle();

  if (emergencyError) {
    console.error(
      "Guest tracking lookup failed:",
      emergencyError,
    );

    return jsonError(
      "Unable to retrieve the emergency request.",
      500,
    );
  }

  if (!emergency) {
    return jsonError(
      "The tracking code or contact number is incorrect.",
      404,
    );
  }

  if (
    emergency.guest_tracking_expires_at &&
    new Date(
      emergency.guest_tracking_expires_at,
    ).getTime() < Date.now()
  ) {
    return jsonError(
      "This tracking code has expired.",
      410,
    );
  }

  let responder: {
    full_name: string | null;
    agency: string | null;
    status: string | null;
    availability: string | null;
  } | null = null;

  let responderLocation: {
    latitude: number | string;
    longitude: number | string;
    updatedAt: string;
  } | null = null;

  if (emergency.responder_id) {
    const [
      responderResult,
      locationResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("responders")
        .select(
          `
            full_name,
            agency,
            status,
            availability
          `,
        )
        .eq(
          "id",
          emergency.responder_id,
        )
        .maybeSingle(),

      supabaseAdmin
        .from("responder_locations")
        .select(
          `
            latitude,
            longitude,
            updated_at
          `,
        )
        .eq(
          "emergency_request_id",
          emergency.id,
        )
        .eq(
          "responder_id",
          emergency.responder_id,
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
    ]);

    if (responderResult.error) {
      console.error(
        "Guest responder lookup failed:",
        responderResult.error,
      );
    } else {
      responder =
        responderResult.data;
    }

    if (locationResult.error) {
      console.error(
        "Guest responder-location lookup failed:",
        locationResult.error,
      );
    } else if (
      locationResult.data
    ) {
      responderLocation = {
        latitude:
          locationResult.data.latitude,
        longitude:
          locationResult.data.longitude,
        updatedAt:
          locationResult.data.updated_at,
      };
    }
  }

  return NextResponse.json(
    {
      emergency: {
        emergencyType:
          emergency.emergency_type,
        description:
          emergency.description,
        address: emergency.address,
        latitude: emergency.latitude,
        longitude: emergency.longitude,
        status: emergency.status,
        createdAt:
          emergency.created_at,
        acceptedAt:
          emergency.accepted_at,
        arrivedAt:
          emergency.arrived_at,
        completedAt:
          emergency.completed_at,
        cancelledAt:
          emergency.cancelled_at,
      },
      responder,
      responderLocation,
      checkedAt:
        new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function normalizeTrackingCode(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase();

  return TRACKING_CODE_PATTERN.test(
    normalized,
  )
    ? normalized
    : null;
}

function hashTrackingCode(
  trackingCode: string,
) {
  return createHash("sha256")
    .update(trackingCode, "utf8")
    .digest("hex");
}

function normalizePhone(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null;
  }

  let digits =
    value.replace(/\D/g, "");

  if (
    digits.startsWith("09") &&
    digits.length === 11
  ) {
    digits = `63${digits.slice(1)}`;
  }

  if (
    digits.length < 7 ||
    digits.length > 15
  ) {
    return null;
  }

  return digits;
}

function jsonError(
  error: string,
  status: number,
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
