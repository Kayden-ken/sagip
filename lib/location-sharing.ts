"use client";

import { supabase } from "@/lib/supabase";

let watchId: number | null = null;

let lastSentAt = 0;
let lastLatitude: number | null = null;
let lastLongitude: number | null = null;

const MIN_UPDATE_INTERVAL_MS = 5000;
const MIN_DISTANCE_METERS = 8;


/**
 * Stop all GPS sharing
 */
export function stopLocationSharing() {
  if (
    typeof window !== "undefined" &&
    watchId !== null
  ) {
    navigator.geolocation.clearWatch(
      watchId,
    );
  }

  watchId = null;

  lastSentAt = 0;
  lastLatitude = null;
  lastLongitude = null;
}


/**
 * ACTIVE EMERGENCY LOCATION
 *
 * Used when responder has an assigned emergency.
 *
 * Saves:
 * responder_locations
 *
 * Used for:
 * - Admin live map
 * - Citizen tracking
 * - Guest tracking
 */
export function startLocationSharing(
  responderId: string,
  emergencyRequestId: string,
) {
  startTracking(async (position) => {
    const {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
    } = position;


    const {
      error,
    } = await supabase
      .from("responder_locations")
      .upsert(
        {
          responder_id:
            responderId,

          emergency_request_id:
            emergencyRequestId,

          latitude,
          longitude,

          accuracy:
            Number.isFinite(
              accuracy,
            )
              ? accuracy
              : null,

          heading:
            heading !== null &&
            Number.isFinite(
              heading,
            )
              ? heading
              : null,

          speed:
            speed !== null &&
            Number.isFinite(
              speed,
            )
              ? speed
              : null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "responder_id,emergency_request_id",
        },
      );


    if (error) {
      console.error(
        "Unable to update emergency location:",
        error.message,
      );
    }
  });
}


/**
 * AVAILABLE RESPONDER LOCATION
 *
 * Used when responder is:
 * - Logged in
 * - Available
 * - Waiting for emergency
 *
 * Saves:
 * responder_presence_locations
 *
 * Used for:
 * - Nearby responder indicator
 * - Coverage map
 */
export function startPresenceSharing(
  responderId: string,
) {
  startTracking(async (position) => {
    const {
      latitude,
      longitude,
      accuracy,
    } = position;


    const {
      error,
    } = await supabase
      .from(
        "responder_presence_locations",
      )
      .upsert(
        {
          responder_id:
            responderId,

          latitude,
          longitude,

          accuracy:
            Number.isFinite(
              accuracy,
            )
              ? accuracy
              : null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "responder_id",
        },
      );


    if (error) {
      console.error(
        "Unable to update responder presence:",
        error.message,
      );
    }
  });
}


/**
 * Shared GPS watcher
 */
function startTracking(
  callback: (
    position: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      heading: number | null;
      speed: number | null;
    },
  ) => Promise<void>,
) {
  if (
    typeof window === "undefined" ||
    !navigator.geolocation
  ) {
    console.error(
      "Geolocation is not supported by this browser.",
    );

    return;
  }


  stopLocationSharing();


  watchId =
    navigator.geolocation.watchPosition(
      async (position) => {
        const {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
        } =
          position.coords;


        const now = Date.now();


        const movedEnough =
          lastLatitude === null ||
          lastLongitude === null ||
          calculateDistanceMeters(
            lastLatitude,
            lastLongitude,
            latitude,
            longitude,
          ) >=
            MIN_DISTANCE_METERS;


        const enoughTimePassed =
          now - lastSentAt >=
          MIN_UPDATE_INTERVAL_MS;


        if (
          !movedEnough &&
          !enoughTimePassed
        ) {
          return;
        }


        await callback({
          latitude,
          longitude,

          accuracy:
            Number.isFinite(
              accuracy,
            )
              ? accuracy
              : null,

          heading:
            heading !== null &&
            Number.isFinite(
              heading,
            )
              ? heading
              : null,

          speed:
            speed !== null &&
            Number.isFinite(
              speed,
            )
              ? speed
              : null,
        });


        lastLatitude = latitude;
        lastLongitude = longitude;
        lastSentAt = now;
      },

      (error) => {
        console.error(
          "Responder GPS error:",
          error.message,
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      },
    );
}


/**
 * Calculate distance between two GPS points
 */
function calculateDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters =
    6371000;


  const latitudeDelta =
    degreesToRadians(
      latitudeB - latitudeA,
    );


  const longitudeDelta =
    degreesToRadians(
      longitudeB - longitudeA,
    );


  const firstLatitude =
    degreesToRadians(
      latitudeA,
    );


  const secondLatitude =
    degreesToRadians(
      latitudeB,
    );


  const haversine =
    Math.sin(
      latitudeDelta / 2,
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDelta / 2,
      ) ** 2;


  return (
    2 *
    earthRadiusMeters *
    Math.asin(
      Math.sqrt(haversine),
    )
  );
}


function degreesToRadians(
  degrees: number,
) {
  return (
    (degrees * Math.PI) /
    180
  );
}