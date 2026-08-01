"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Flame,
  HeartPulse,
  LoaderCircle,
  LogIn,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  UserRound,
  Waves,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

const LocationMap = dynamic(
  () => import("@/components/location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading map...
        </div>
      </div>
    ),
  },
);

type EmergencyType = {
  value: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

type RequesterMode =
  | "loading"
  | "registered"
  | "guest";

type GuestSubmissionResponse = {
  message?: string;
  trackingCode?: string;
  expiresAt?: string;
  error?: string;
};

const emergencyTypes: EmergencyType[] = [
  {
    value: "Medical",
    label: "Medical Emergency",
    icon: HeartPulse,
  },
  {
    value: "Fire",
    label: "Fire",
    icon: Flame,
  },
  {
    value: "Crime",
    label: "Crime / Police Assistance",
    icon: ShieldAlert,
  },
  {
    value: "Vehicular Accident",
    label: "Vehicular Accident",
    icon: Car,
  },
  {
    value: "Flood",
    label: "Flood",
    icon: Waves,
  },
  {
    value: "Other",
    label: "Other Emergency",
    icon: ShieldAlert,
  },
];

const activeStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export default function EmergencyPage() {
  const router = useRouter();

  const [requesterMode, setRequesterMode] =
    useState<RequesterMode>("loading");

  const [profileId, setProfileId] =
    useState("");

  const [guestName, setGuestName] =
    useState("");

  const [guestPhone, setGuestPhone] =
    useState("");

  const [emergencyType, setEmergencyType] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [address, setAddress] =
    useState("");

  const [isLocating, setIsLocating] =
    useState(false);

  const [
    isLookingUpAddress,
    setIsLookingUpAddress,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    locationSuccess,
    setLocationSuccess,
  ] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function detectRequester() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isCancelled) {
        return;
      }

      if (!user) {
        setRequesterMode("guest");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (isCancelled) {
        return;
      }

      if (profileError || !profile) {
        /*
         * A signed-in account without a citizen profile can still submit as
         * a guest rather than being blocked during an emergency.
         */
        setRequesterMode("guest");

        if (profileError) {
          console.error(
            "Unable to load citizen profile:",
            profileError.message,
          );
        }

        return;
      }

      setProfileId(profile.id);
      setGuestName(
        [
          profile.first_name,
          profile.last_name,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setRequesterMode("registered");
    }

    void detectRequester();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function reverseGeocode(
    selectedLatitude: number,
    selectedLongitude: number,
  ) {
    setIsLookingUpAddress(true);

    const controller =
      new AbortController();

    const timeoutId = window.setTimeout(
      () => {
        controller.abort();
      },
      8000,
    );

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedLatitude}&lon=${selectedLongitude}`,
        {
          headers: {
            "Accept-Language": "en",
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to retrieve the address.",
        );
      }

      const result =
        (await response.json()) as {
          display_name?: unknown;
        };

      setAddress(
        typeof result.display_name ===
          "string"
          ? result.display_name
          : "",
      );
    } catch {
      setAddress("");

      setError(
        "Your GPS location was detected. Address lookup was unavailable, but you may enter the address manually and continue.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsLookingUpAddress(false);
    }
  }

  function getCurrentLocation() {
    setError("");
    setLocationSuccess(false);

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser.",
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLatitude =
          position.coords.latitude;

        const detectedLongitude =
          position.coords.longitude;

        setLatitude(detectedLatitude);
        setLongitude(detectedLongitude);
        setLocationSuccess(true);
        setIsLocating(false);

        await reverseGeocode(
          detectedLatitude,
          detectedLongitude,
        );
      },
      (locationError) => {
        setIsLocating(false);

        if (
          locationError.code ===
          locationError.PERMISSION_DENIED
        ) {
          setError(
            "Location permission was denied. Allow location access in your browser and try again.",
          );
          return;
        }

        if (
          locationError.code ===
          locationError.POSITION_UNAVAILABLE
        ) {
          setError(
            "Your location could not be determined. Please try again.",
          );
          return;
        }

        setError(
          "The location request timed out. Please try again.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  async function handleMapLocationChange(
    selectedLatitude: number,
    selectedLongitude: number,
  ) {
    setLatitude(selectedLatitude);
    setLongitude(selectedLongitude);
    setLocationSuccess(true);
    setError("");

    await reverseGeocode(
      selectedLatitude,
      selectedLongitude,
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!emergencyType) {
      setError(
        "Please select an emergency type.",
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Capture or select your current location before submitting.",
      );
      return;
    }

    if (
      requesterMode === "guest" &&
      !isValidPhone(guestPhone)
    ) {
      setError(
        "Enter a valid contact number containing 7 to 15 digits.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (
        requesterMode === "registered" &&
        profileId
      ) {
        await submitRegisteredRequest();
      } else {
        await submitGuestRequest();
      }
    } catch (submissionError) {
      setError(
        getErrorMessage(
          submissionError,
          "Unable to submit your emergency request. Check your connection and try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRegisteredRequest() {
    const {
      data: existingRequest,
      error: existingRequestError,
    } = await supabase
      .from("emergency_requests")
      .select("id, status")
      .eq("profile_id", profileId)
      .in("status", activeStatuses)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingRequestError) {
      throw existingRequestError;
    }

    if (existingRequest) {
      setError(
        "You already have an active emergency request. Track or cancel it before creating another request.",
      );

      window.setTimeout(() => {
        router.push("/requests");
      }, 1800);

      return;
    }

    const {
      data: insertedRequest,
      error: insertError,
    } = await supabase
      .from("emergency_requests")
      .insert({
        profile_id: profileId,
        request_source: "registered",
        emergency_type: emergencyType,
        description:
          description.trim() || null,
        latitude,
        longitude,
        address:
          address.trim() || null,
        status: "Pending",
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    if (!insertedRequest) {
      throw new Error(
        "The emergency request could not be confirmed.",
      );
    }

    router.push("/requests");
    router.refresh();
  }

  async function submitGuestRequest() {
    const response = await fetch(
      "/api/emergency/guest",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          guestName:
            guestName.trim() || null,
          guestPhone,
          emergencyType,
          description:
            description.trim() || null,
          latitude,
          longitude,
          address:
            address.trim() || null,
        }),
      },
    );

    const result =
      (await response.json()) as GuestSubmissionResponse;

    if (
      !response.ok ||
      !result.trackingCode
    ) {
      throw new Error(
        result.error ??
          "Unable to submit the guest emergency request.",
      );
    }

    window.sessionStorage.setItem(
      "sagip_guest_phone",
      guestPhone,
    );

    window.sessionStorage.setItem(
      "sagip_guest_tracking_code",
      result.trackingCode,
    );

    router.push(
      `/track?code=${encodeURIComponent(
        result.trackingCode,
      )}`,
    );
  }

  if (requesterMode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Preparing emergency request...
        </div>
      </main>
    );
  }

  const isGuest =
    requesterMode === "guest";

  const backHref = isGuest
    ? "/"
    : "/dashboard";

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href={backHref}
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
                Emergency Request
              </p>
            </div>
          </Link>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            {isGuest
              ? "Back to Home"
              : "Back to Dashboard"}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-8">
        <div className="rounded-3xl border border-red-200 bg-white p-7 shadow-xl sm:p-9">
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-700 text-white shadow-lg shadow-red-200">
              <ShieldAlert className="size-8" />
            </span>

            <h1 className="mt-5 text-3xl font-extrabold">
              Request Emergency Assistance
            </h1>

            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-500">
              Select the emergency type, confirm
              your location, and submit the request
              to SAGIP.
            </p>
          </div>

          {isGuest ? (
            <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 size-5 shrink-0 text-blue-700" />

                <div>
                  <p className="font-extrabold text-blue-900">
                    Continue without an account
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    You can submit immediately. A secure tracking code will be
                    provided after submission.
                  </p>

                  <Link
                    href="/login"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-blue-800 hover:text-blue-950"
                  >
                    <LogIn className="size-4" />
                    Sign in instead
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="size-5 shrink-0" />
              This request will be saved to your SAGIP account and incident
              history.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-9 space-y-8"
          >
            {isGuest && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-extrabold">
                  <Phone className="size-5 text-red-700" />
                  Guest Contact Information
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your contact number is required to retrieve this request
                  securely with the tracking code.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="guestName"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Name{" "}
                      <span className="font-normal text-slate-400">
                        (optional)
                      </span>
                    </label>

                    <input
                      id="guestName"
                      name="guestName"
                      type="text"
                      autoComplete="name"
                      maxLength={120}
                      value={guestName}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setGuestName(
                          event.target.value,
                        )
                      }
                      placeholder="Your name"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="guestPhone"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Contact Number
                    </label>

                    <input
                      id="guestPhone"
                      name="guestPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={30}
                      required
                      value={guestPhone}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setGuestPhone(
                          event.target.value,
                        )
                      }
                      placeholder="09XX XXX XXXX"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-extrabold">
                Emergency Type
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {emergencyTypes.map((type) => {
                  const Icon = type.icon;

                  const selected =
                    emergencyType ===
                    type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setEmergencyType(
                          type.value,
                        )
                      }
                      className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? "border-red-600 bg-red-50 ring-2 ring-red-100"
                          : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50"
                      }`}
                    >
                      <span
                        className={`flex size-11 items-center justify-center rounded-xl ${
                          selected
                            ? "bg-red-700 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="size-5" />
                      </span>

                      <p className="mt-4 font-extrabold">
                        {type.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <label
                htmlFor="description"
                className="block text-lg font-extrabold"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={1000}
                value={description}
                disabled={isSubmitting}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Describe what happened, injuries, hazards, or any important details."
                className="mt-3 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold">
                    <MapPin className="size-5 text-red-700" />
                    Emergency Location
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Use your GPS location, then drag the marker or click the map
                    to improve accuracy.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={
                    isLocating ||
                    isSubmitting
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocating ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <MapPin className="size-4" />
                  )}

                  {isLocating
                    ? "Getting location..."
                    : "Use My Location"}
                </button>
              </div>

              {locationSuccess && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="size-5 shrink-0" />
                  Location detected successfully. Confirm the marker position
                  below.
                </div>
              )}

              {latitude !== null &&
                longitude !== null && (
                  <div className="mt-5">
                    <LocationMap
                      latitude={latitude}
                      longitude={longitude}
                      onLocationChange={
                        handleMapLocationChange
                      }
                    />
                  </div>
                )}

              <div className="mt-5">
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Address
                </label>

                <div className="relative">
                  <input
                    id="address"
                    name="address"
                    type="text"
                    maxLength={500}
                    value={address}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setAddress(
                        event.target.value,
                      )
                    }
                    placeholder={
                      isLookingUpAddress
                        ? "Finding address..."
                        : "Address will appear after detecting your location"
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  {isLookingUpAddress && (
                    <LoaderCircle className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  You may edit this address if the automatically detected result
                  is incomplete.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="latitude"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Latitude
                  </label>

                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    readOnly
                    value={
                      latitude?.toFixed(6) ??
                      ""
                    }
                    placeholder="Not captured"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-sm text-slate-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="longitude"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Longitude
                  </label>

                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    readOnly
                    value={
                      longitude?.toFixed(
                        6,
                      ) ?? ""
                    }
                    placeholder="Not captured"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-sm text-slate-600"
                  />
                </div>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                latitude === null ||
                longitude === null
              }
              className="w-full rounded-2xl bg-red-700 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Sending Emergency Request..."
                : latitude === null ||
                    longitude === null
                  ? "Use Your Location First"
                  : isGuest
                    ? "Send Guest Emergency Request"
                    : "Send Emergency Request"}
            </button>

            <p className="text-center text-xs leading-5 text-slate-400">
              Prototype system only. Do not rely on SAGIP as an official
              emergency channel until connected to real emergency agencies.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}
