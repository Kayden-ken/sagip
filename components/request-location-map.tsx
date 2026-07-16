"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";

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

type RequestLocationMapProps = {
  latitude: number;
  longitude: number;
  address?: string | null;
  responderLatitude?: number | null;
  responderLongitude?: number | null;
  responderUpdatedAt?: string | null;
};

export default function RequestLocationMap({
  latitude,
  longitude,
  address,
  responderLatitude = null,
  responderLongitude = null,
  responderUpdatedAt = null,
}: RequestLocationMapProps) {
  const citizenPosition: [number, number] = [
    latitude,
    longitude,
  ];

  const hasResponderLocation =
    responderLatitude !== null &&
    responderLongitude !== null &&
    Number.isFinite(responderLatitude) &&
    Number.isFinite(responderLongitude);

  const responderPosition:
    | [number, number]
    | null = hasResponderLocation
    ? [
        responderLatitude as number,
        responderLongitude as number,
      ]
    : null;

  return (
    <MapContainer
      center={citizenPosition}
      zoom={17}
      scrollWheelZoom
      className="h-[420px] w-full rounded-2xl border border-slate-200"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater
        citizenPosition={citizenPosition}
        responderPosition={responderPosition}
      />

      <Marker
        position={citizenPosition}
        icon={emergencyMarkerIcon}
      >
        <Popup>
          <strong>Your emergency location</strong>

          {address && (
            <>
              <br />
              {address}
            </>
          )}
        </Popup>
      </Marker>

      {responderPosition && (
        <>
          <CircleMarker
            center={responderPosition}
            radius={11}
            pathOptions={{
              color: "#ffffff",
              weight: 4,
              fillColor: "#16a34a",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>Responder live location</strong>

              {responderUpdatedAt && (
                <>
                  <br />
                  Updated{" "}
                  {formatUpdatedTime(
                    responderUpdatedAt,
                  )}
                </>
              )}
            </Popup>
          </CircleMarker>

          <Polyline
            positions={[
              responderPosition,
              citizenPosition,
            ]}
            pathOptions={{
              color: "#dc2626",
              weight: 4,
              opacity: 0.75,
              dashArray: "8 10",
            }}
          />
        </>
      )}
    </MapContainer>
  );
}

type MapUpdaterProps = {
  citizenPosition: [number, number];
  responderPosition: [number, number] | null;
};

function MapUpdater({
  citizenPosition,
  responderPosition,
}: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (responderPosition) {
      map.fitBounds(
        [
          citizenPosition,
          responderPosition,
        ],
        {
          padding: [55, 55],
          maxZoom: 17,
        },
      );

      return;
    }

    map.setView(
      citizenPosition,
      map.getZoom(),
    );
  }, [
    citizenPosition,
    responderPosition,
    map,
  ]);

  return null;
}

function formatUpdatedTime(
  dateValue: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    },
  ).format(new Date(dateValue));
}