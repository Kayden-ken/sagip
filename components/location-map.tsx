"use client";

import "leaflet/dist/leaflet.css";

import L, {
  type LeafletMouseEvent,
  type Marker as LeafletMarker,
} from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";

const defaultMarkerIcon = L.icon({
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

type LocationMapProps = {
  latitude: number;
  longitude: number;
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void;
};

export default function LocationMap({
  latitude,
  longitude,
  onLocationChange,
}: LocationMapProps) {
  const position = useMemo(
    () => [latitude, longitude] as [number, number],
    [latitude, longitude],
  );

  return (
    <MapContainer
      center={position}
      zoom={17}
      scrollWheelZoom
      className="h-[380px] w-full rounded-2xl border border-slate-200"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater
        latitude={latitude}
        longitude={longitude}
      />

      <LocationMarker
        latitude={latitude}
        longitude={longitude}
        onLocationChange={onLocationChange}
      />
    </MapContainer>
  );
}

type MapUpdaterProps = {
  latitude: number;
  longitude: number;
};

function MapUpdater({
  latitude,
  longitude,
}: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(
      [latitude, longitude],
      map.getZoom(),
    );
  }, [latitude, longitude, map]);

  return null;
}

type LocationMarkerProps = {
  latitude: number;
  longitude: number;
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void;
};

function LocationMarker({
  latitude,
  longitude,
  onLocationChange,
}: LocationMarkerProps) {
  const markerRef =
    useRef<LeafletMarker | null>(null);

  useMapEvents({
    click(event: LeafletMouseEvent) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng,
      );
    },
  });

  return (
    <Marker
      draggable
      icon={defaultMarkerIcon}
      position={[latitude, longitude]}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;

          if (!marker) {
            return;
          }

          const position = marker.getLatLng();

          onLocationChange(
            position.lat,
            position.lng,
          );
        },
      }}
    >
      <Popup>
        Your selected emergency location.
        <br />
        Drag the marker or click the map to adjust it.
      </Popup>
    </Marker>
  );
}