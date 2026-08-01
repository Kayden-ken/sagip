import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

const ALLOWED_EMERGENCY_TYPES = new Set([
  "Medical",
  "Fire",
  "Crime",
  "Vehicular Accident",
  "Flood",
  "Other",
]);

const MAX_REQUEST_BYTES = 20_000;
const TRACKING_VALIDITY_DAYS = 30;

type GuestEmergencyBody = {
  guestName?: unknown;
  guestPhone?: unknown;
  emergencyType?: unknown;
  description?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  address?: unknown;
};

export async function POST(request: Request) {
  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return jsonError(
      "The request is too large.",
      413,
    );
  }

  let body: GuestEmergencyBody;

  try {
    body = (await request.json()) as GuestEmergencyBody;
  } catch {
    return jsonError(
      "Invalid request body.",
      400,
    );
  }

  const guestName = cleanOptionalText(
    body.guestName,
    120,
  );

  const guestPhone = normalizePhone(
    body.guestPhone,
  );

  const emergencyType = cleanRequiredText(
    body.emergencyType,
    50,
  );

  const description = cleanOptionalText(
    body.description,
    1_000,
  );

  const address = cleanOptionalText(
    body.address,
    500,
  );

  const latitude = readCoordinate(
    body.latitude,
    -90,
    90,
  );

  const longitude = readCoordinate(
    body.longitude,
    -180,
    180,
  );

  if (!guestPhone) {
    return jsonError(
      "Enter a valid contact number containing 7 to 15 digits.",
      400,
    );
  }

  if (
    !emergencyType ||
    !ALLOWED_EMERGENCY_TYPES.has(
      emergencyType,
    )
  ) {
    return jsonError(
      "Select a valid emergency type.",
      400,
    );
  }

  if (
    latitude === null ||
    longitude === null
  ) {
    return jsonError(
      "A valid emergency location is required.",
      400,
    );
  }

  /*
   * Prevent the same guest phone number from creating another active
   * incident while one is already open.
   */
  const {
    data: existingRequest,
    error: existingRequestError,
  } = await supabaseAdmin
    .from("emergency_requests")
    .select("id, status, created_at")
    .eq("request_source", "guest")
    .eq("guest_phone", guestPhone)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingRequestError) {
    console.error(
      "Guest duplicate-request check failed:",
      existingRequestError,
    );

    return jsonError(
      "Unable to verify existing emergency requests.",
      500,
    );
  }

  if (existingRequest) {
    return NextResponse.json(
      {
        error:
          "This contact number already has an active emergency request. Use the original tracking code to monitor it.",
        hasActiveRequest: true,
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const expiresAt = new Date(
    Date.now() +
      TRACKING_VALIDITY_DAYS *
        24 *
        60 *
        60 *
        1000,
  ).toISOString();

  /*
   * A unique database index protects against the extremely unlikely event
   * of two generated tracking codes producing the same hash.
   */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const trackingCode =
      createTrackingCode();

    const trackingHash =
      hashTrackingCode(trackingCode);

    const {
      data: insertedRequest,
      error: insertError,
    } = await supabaseAdmin
      .from("emergency_requests")
      .insert({
        profile_id: null,
        responder_id: null,
        request_source: "guest",
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_tracking_hash:
          trackingHash,
        guest_tracking_expires_at:
          expiresAt,
        emergency_type:
          emergencyType,
        description,
        latitude,
        longitude,
        address,
        status: "Pending",
      })
      .select(
        `
          id,
          status,
          created_at
        `,
      )
      .single();

    if (!insertError && insertedRequest) {
      return NextResponse.json(
        {
          message:
            "Your emergency request was submitted successfully.",
          trackingCode,
          status:
            insertedRequest.status,
          createdAt:
            insertedRequest.created_at,
          expiresAt,
        },
        {
          status: 201,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (insertError?.code === "23505") {
      continue;
    }

    console.error(
      "Guest emergency insertion failed:",
      insertError,
    );

    return jsonError(
      insertError?.message ??
        "Unable to submit the emergency request.",
      500,
    );
  }

  return jsonError(
    "Unable to generate a tracking code. Please try again.",
    500,
  );
}

function createTrackingCode() {
  const year =
    new Date().getFullYear();

  const randomPart = randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `SGP-${year}-${randomPart}`;
}

function hashTrackingCode(
  trackingCode: string,
) {
  return createHash("sha256")
    .update(
      trackingCode
        .trim()
        .toUpperCase(),
      "utf8",
    )
    .digest("hex");
}

function cleanRequiredText(
  value: unknown,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function cleanOptionalText(
  value: unknown,
  maximumLength: number,
) {
  const cleaned = cleanRequiredText(
    value,
    maximumLength,
  );

  return cleaned || null;
}

function normalizePhone(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  /*
   * Normalize common Philippine mobile formats:
   * 09171234567 -> 639171234567
   * +639171234567 -> 639171234567
   */
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

function readCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < minimum ||
    numberValue > maximum
  ) {
    return null;
  }

  return numberValue;
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
