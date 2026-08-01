"use client";

import "leaflet/dist/leaflet.css";

import * as L from "leaflet";
import {
  useEffect,
  useRef,
} from "react";

type CoordinateValue =
  | number
  | string
  | null;

type ResponderLocation = {
  latitude: CoordinateValue;
  longitude: CoordinateValue;
  updatedAt: string;
};

type GuestTrackingMapProps = {
  emergencyLatitude: CoordinateValue;
  emergencyLongitude: CoordinateValue;
  emergencyLabel: string;
  responderLocation:
    | ResponderLocation
    | null;
  responderName?: string | null;
};

const DEFAULT_CENTER: L.LatLngExpression = [
  12.8797,
  121.774,
];

const DEFAULT_ZOOM = 6;

export default function GuestTrackingMap({
  emergencyLatitude,
  emergencyLongitude,
  emergencyLabel,
  responderLocation,
  responderName,
}: GuestTrackingMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<L.Map | null>(null);

  const overlayLayerRef =
    useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      },
    ).addTo(map);

    const overlayLayer =
      L.layerGroup().addTo(map);

    mapRef.current = map;
    overlayLayerRef.current =
      overlayLayer;

    const resizeFrame =
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });

    return () => {
      window.cancelAnimationFrame(
        resizeFrame,
      );

      overlayLayer.clearLayers();
      map.remove();

      mapRef.current = null;
      overlayLayerRef.current = null;

      /*
       * Leaflet stores an internal ID on the element. Removing it prevents
       * development remount errors when React Strict Mode mounts twice.
       */
      const leafletContainer =
        container as HTMLDivElement & {
          _leaflet_id?: number;
        };

      delete leafletContainer._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const overlayLayer =
      overlayLayerRef.current;

    if (!map || !overlayLayer) {
      return;
    }

    overlayLayer.clearLayers();

    const emergencyCoordinate =
      readCoordinate(
        emergencyLatitude,
        emergencyLongitude,
      );

    const responderCoordinate =
      responderLocation
        ? readCoordinate(
            responderLocation.latitude,
            responderLocation.longitude,
          )
        : null;

    const visiblePoints:
      L.LatLngExpression[] = [];

    if (emergencyCoordinate) {
      visiblePoints.push([
        emergencyCoordinate.latitude,
        emergencyCoordinate.longitude,
      ]);

      const emergencyMarker =
        L.circleMarker(
          [
            emergencyCoordinate.latitude,
            emergencyCoordinate.longitude,
          ],
          {
            radius: 12,
            color: "#ffffff",
            weight: 4,
            fillColor: "#dc2626",
            fillOpacity: 1,
          },
        );

      emergencyMarker.bindPopup(
        createPopup([
          {
            label:
              emergencyLabel ||
              "Emergency location",
            strong: true,
          },
          {
            label:
              "Reported incident location",
          },
        ]),
      );

      emergencyMarker.addTo(
        overlayLayer,
      );
    }

    if (
      responderCoordinate &&
      responderLocation
    ) {
      visiblePoints.push([
        responderCoordinate.latitude,
        responderCoordinate.longitude,
      ]);

      const responderMarker =
        L.circleMarker(
          [
            responderCoordinate.latitude,
            responderCoordinate.longitude,
          ],
          {
            radius: 12,
            color: "#ffffff",
            weight: 4,
            fillColor: "#16a34a",
            fillOpacity: 1,
          },
        );

      responderMarker.bindPopup(
        createPopup([
          {
            label:
              responderName ||
              "Assigned responder",
            strong: true,
          },
          {
            label:
              "Live responder location",
          },
          {
            label: `Updated ${formatDateTime(
              responderLocation.updatedAt,
            )}`,
          },
        ]),
      );

      responderMarker.addTo(
        overlayLayer,
      );
    }

    if (
      emergencyCoordinate &&
      responderCoordinate
    ) {
      L.polyline(
        [
          [
            responderCoordinate.latitude,
            responderCoordinate.longitude,
          ],
          [
            emergencyCoordinate.latitude,
            emergencyCoordinate.longitude,
          ],
        ],
        {
          color: "#2563eb",
          weight: 5,
          opacity: 0.8,
          dashArray: "10 10",
        },
      ).addTo(overlayLayer);
    }

    if (visiblePoints.length === 0) {
      map.setView(
        DEFAULT_CENTER,
        DEFAULT_ZOOM,
      );
    } else if (
      visiblePoints.length === 1
    ) {
      map.setView(
        visiblePoints[0],
        16,
      );
    } else {
      map.fitBounds(
        L.latLngBounds(
          visiblePoints,
        ),
        {
          padding: [45, 45],
          maxZoom: 16,
        },
      );
    }

    const resizeFrame =
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });

    return () => {
      window.cancelAnimationFrame(
        resizeFrame,
      );
    };
  }, [
    emergencyLabel,
    emergencyLatitude,
    emergencyLongitude,
    responderLocation,
    responderName,
  ]);

  return (
    <div
      ref={containerRef}
      aria-label="Live emergency and responder location map"
      className="h-[460px] w-full rounded-2xl border border-slate-200"
    />
  );
}

type Coordinate = {
  latitude: number;
  longitude: number;
};

function readCoordinate(
  latitudeValue: CoordinateValue,
  longitudeValue: CoordinateValue,
): Coordinate | null {
  if (
    latitudeValue === null ||
    longitudeValue === null
  ) {
    return null;
  }

  const latitude =
    Number(latitudeValue);

  const longitude =
    Number(longitudeValue);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

type PopupLine = {
  label: string;
  strong?: boolean;
};

function createPopup(
  lines: PopupLine[],
) {
  const container =
    document.createElement("div");

  container.className = "space-y-1";

  lines.forEach((line) => {
    const row =
      document.createElement("div");

    if (line.strong) {
      const strong =
        document.createElement("strong");

      strong.textContent = line.label;
      row.appendChild(strong);
    } else {
      row.textContent = line.label;
    }

    container.appendChild(row);
  });

  return container;
}

function formatDateTime(
  dateValue: string,
) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "at an unknown time";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}
