"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect, useMemo } from "react";

type EmergencyMapItem = {
  id: string;
  emergency_type: string | null;
  description: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string | null;
  responder_id: string | null;
  created_at: string;
};

type ResponderLocationMapItem = {
  responder_id: string;
  emergency_request_id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
};

type ResponderMapItem = {
  id: string;
  full_name: string | null;
  agency: string | null;
  status: string | null;
  availability: string | null;
};

type AdminCommandMapProps = {
  emergencies: EmergencyMapItem[];
  responderLocations: ResponderLocationMapItem[];
  responders: ResponderMapItem[];
};

const emergencyMarkerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function AdminCommandMap({
  emergencies,
  responderLocations,
  responders,
}: AdminCommandMapProps) {
  const responderMap = useMemo(
    () =>
      Object.fromEntries(
        responders.map((responder) => [
          responder.id,
          responder,
        ]),
      ) as Record<string, ResponderMapItem>,
    [responders],
  );

  const validEmergencies = useMemo(
    () =>
      emergencies
        .map((emergency) => {
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

          return {
            ...emergency,
            latitude,
            longitude,
          };
        })
        .filter(
          (
            emergency,
          ): emergency is EmergencyMapItem & {
            latitude: number;
            longitude: number;
          } => emergency !== null,
        ),
    [emergencies],
  );

  const validResponderLocations =
    useMemo(
      () =>
        responderLocations
          .map((location) => {
            const latitude = Number(
              location.latitude,
            );

            const longitude = Number(
              location.longitude,
            );

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null;
            }

            return {
              ...location,
              latitude,
              longitude,
            };
          })
          .filter(
            (
              location,
            ): location is ResponderLocationMapItem & {
              latitude: number;
              longitude: number;
            } => location !== null,
          ),
      [responderLocations],
    );

  const defaultCenter:
    [number, number] =
    validEmergencies.length > 0
      ? [
          validEmergencies[0].latitude,
          validEmergencies[0].longitude,
        ]
      : validResponderLocations.length > 0
        ? [
            validResponderLocations[0]
              .latitude,
            validResponderLocations[0]
              .longitude,
          ]
        : [12.8797, 121.774];

  const allCoordinates = [
    ...validEmergencies.map(
      (emergency) =>
        [
          emergency.latitude,
          emergency.longitude,
        ] as [number, number],
    ),
    ...validResponderLocations.map(
      (location) =>
        [
          location.latitude,
          location.longitude,
        ] as [number, number],
    ),
  ];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      scrollWheelZoom
      className="h-[560px] w-full rounded-2xl border border-slate-200"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMapToMarkers
        coordinates={allCoordinates}
        fallbackCenter={defaultCenter}
      />

      {validEmergencies.map(
        (emergency) => {
          const assignedResponder =
            emergency.responder_id
              ? responderMap[
                  emergency.responder_id
                ]
              : null;

          return (
            <Marker
              key={emergency.id}
              position={[
                emergency.latitude,
                emergency.longitude,
              ]}
              icon={emergencyMarkerIcon}
            >
              <Popup>
                <div className="min-w-56">
                  <p className="font-bold">
                    {emergency.emergency_type ||
                      "Emergency Request"}
                  </p>

                  <p className="mt-1 text-sm">
                    Status:{" "}
                    {emergency.status ||
                      "Pending"}
                  </p>

                  <p className="mt-2 text-sm">
                    {emergency.address ||
                      "Address unavailable"}
                  </p>

                  {emergency.description && (
                    <p className="mt-2 text-sm">
                      {
                        emergency.description
                      }
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    Reported{" "}
                    {formatDateTime(
                      emergency.created_at,
                    )}
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    Responder:{" "}
                    {assignedResponder
                      ? assignedResponder.full_name ||
                        "Emergency Responder"
                      : "Not assigned"}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        },
      )}

      {validResponderLocations.map(
        (location) => {
          const responder =
            responderMap[
              location.responder_id
            ];

          return (
            <CircleMarker
              key={`${location.responder_id}-${location.emergency_request_id}`}
              center={[
                location.latitude,
                location.longitude,
              ]}
              radius={11}
              pathOptions={{
                color: "#ffffff",
                weight: 4,
                fillColor: "#16a34a",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div className="min-w-52">
                  <p className="font-bold">
                    {responder?.full_name ||
                      "Emergency Responder"}
                  </p>

                  <p className="mt-1 text-sm">
                    {responder?.agency ||
                      "Emergency Response Agency"}
                  </p>

                  <p className="mt-2 text-sm">
                    Status:{" "}
                    {responder?.status ||
                      "Unknown"}
                  </p>

                  <p className="mt-1 text-sm">
                    Availability:{" "}
                    {responder?.availability ||
                      "Unknown"}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    GPS updated{" "}
                    {formatDateTime(
                      location.updated_at,
                    )}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        },
      )}
    </MapContainer>
  );
}

type FitMapToMarkersProps = {
  coordinates: [number, number][];
  fallbackCenter: [number, number];
};

function FitMapToMarkers({
  coordinates,
  fallbackCenter,
}: FitMapToMarkersProps) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length === 0) {
      map.setView(fallbackCenter, 6);
      return;
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 16);
      return;
    }

    map.fitBounds(coordinates, {
      padding: [55, 55],
      maxZoom: 16,
    });
  }, [
    coordinates,
    fallbackCenter,
    map,
  ]);

  return null;
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