import { supabase } from "@/lib/supabase";

let watchId: number | null = null;

export function stopLocationSharing() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function startLocationSharing(
  responderId: string,
  emergencyRequestId: string,
) {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser.");
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const {
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
      } = position.coords;

      const { error } = await supabase
        .from("responder_locations")
        .upsert({
          responder_id: responderId,
          emergency_request_id: emergencyRequestId,
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error(error);
      }
    },
    (error) => {
      console.error(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    },
  );
}