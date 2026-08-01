"use client";

import "leaflet/dist/leaflet.css";

import * as L from "leaflet";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type EmergencyRequest = {
  id: string;
  emergency_type: string | null;
  description: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string | null;
  responder_id: string | null;
  profile_id: string;
  created_at: string;
  accepted_at: string | null;
};

type Responder = {
  id: string;
  full_name: string | null;
  agency: string | null;
  status: string | null;
  availability: string | null;
};

type ResponderLocation = {
  responder_id: string;
  emergency_request_id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
};

type ResponderPresenceLocation = {
  responder_id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
};

type AdminCommandMapProps = {
  emergencies: EmergencyRequest[];
  responderLocations: ResponderLocation[];
  presenceLocations: ResponderPresenceLocation[];
  responders: Responder[];
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

const DEFAULT_CENTER: L.LatLngExpression = [
  12.8797,
  121.774,
];

const DEFAULT_ZOOM = 6;

export default function AdminCommandMap({
  emergencies,
  responderLocations,
  presenceLocations,
  responders,
}: AdminCommandMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<L.Map | null>(null);

  const overlayLayerRef =
    useRef<L.LayerGroup | null>(null);


  // Map filters
  const [
    showEmergencies,
    setShowEmergencies,
  ] = useState(true);

  const [
    showPresence,
    setShowPresence,
  ] = useState(true);

  const [
    showResponders,
    setShowResponders,
  ] = useState(true);

  const [
    showRoutes,
    setShowRoutes,
  ] = useState(true);


  /*
   * Initialize Leaflet map once
   */
  useEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      mapRef.current
    ) {
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


    const resize =
      window.requestAnimationFrame(
        () => {
          map.invalidateSize();
        },
      );


    return () => {
      window.cancelAnimationFrame(
        resize,
      );

      overlayLayer.clearLayers();

      map.remove();

      mapRef.current = null;

      overlayLayerRef.current =
        null;


      const leafletContainer =
        container as HTMLDivElement & {
          _leaflet_id?: number;
        };

      delete leafletContainer._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer =
      overlayLayerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();


    const responderMap =
      new Map(
        responders.map((responder) => [
          responder.id,
          responder,
        ]),
      );


    const emergencyCoordinates =
      new Map<string, Coordinate>();


    const points: L.LatLngExpression[] =
      [];


    /*
     * EMERGENCY MARKERS
     */
    if (showEmergencies) {
      emergencies.forEach(
        (emergency) => {
          const coordinate =
            readCoordinate(
              emergency.latitude,
              emergency.longitude,
            );


          if (!coordinate) {
            return;
          }


          emergencyCoordinates.set(
            emergency.id,
            coordinate,
          );


          points.push([
            coordinate.latitude,
            coordinate.longitude,
          ]);


          L.circleMarker(
            [
              coordinate.latitude,
              coordinate.longitude,
            ],
            {
              radius: 10,
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            },
          )
            .bindPopup(
              createEmergencyPopup(
                emergency,
              ),
            )
            .addTo(layer);
        },
      );
    }


    /*
     * AVAILABLE RESPONDER COVERAGE
     */
    if (showPresence) {
      presenceLocations.forEach(
        (location) => {
          const coordinate =
            readCoordinate(
              location.latitude,
              location.longitude,
            );


          if (!coordinate) {
            return;
          }


          points.push([
            coordinate.latitude,
            coordinate.longitude,
          ]);


          L.circle(
            [
              coordinate.latitude,
              coordinate.longitude,
            ],
            {
              radius: 800,
              color: "#16a34a",
              weight: 2,
              fillColor: "#22c55e",
              fillOpacity: 0.22,
            },
          )
            .bindPopup(
              createPresencePopup(
                location,
              ),
            )
            .addTo(layer);
        },
      );
    }



    /*
     * ACTIVE RESPONDER LOCATIONS
     */
    const latestLocations =
      new Map<string, ResponderLocation>();


    responderLocations.forEach(
      (location) => {
        const key =
          `${location.responder_id}:${location.emergency_request_id}`;


        const current =
          latestLocations.get(key);


        if (
          !current ||
          new Date(
            location.updated_at,
          ).getTime() >
            new Date(
              current.updated_at,
            ).getTime()
        ) {
          latestLocations.set(
            key,
            location,
          );
        }
      },
    );



    if (showResponders) {
      latestLocations.forEach(
        (location) => {
          const coordinate =
            readCoordinate(
              location.latitude,
              location.longitude,
            );


          if (!coordinate) {
            return;
          }


          points.push([
            coordinate.latitude,
            coordinate.longitude,
          ]);


          const responder =
            responderMap.get(
              location.responder_id,
            ) ?? null;



          L.circleMarker(
            [
              coordinate.latitude,
              coordinate.longitude,
            ],
            {
              radius: 11,
              color: "#ffffff",
              weight: 4,
              fillColor: "#16a34a",
              fillOpacity: 1,
            },
          )
            .bindPopup(
              createResponderPopup(
                responder,
                location,
              ),
            )
            .addTo(layer);



          const emergencyLocation =
            emergencyCoordinates.get(
              location.emergency_request_id,
            );



          if (
            showRoutes &&
            emergencyLocation
          ) {
            L.polyline(
              [
                [
                  coordinate.latitude,
                  coordinate.longitude,
                ],
                [
                  emergencyLocation.latitude,
                  emergencyLocation.longitude,
                ],
              ],
              {
                color: "#dc2626",
                weight: 4,
                dashArray:
                  "8 10",
              },
            ).addTo(layer);
          }
        },
      );
    }



    /*
     * Auto zoom
     */
    if (points.length === 0) {
      map.setView(
        DEFAULT_CENTER,
        DEFAULT_ZOOM,
      );
    } else if (
      points.length === 1
    ) {
      map.setView(
        points[0],
        16,
      );
    } else {
      map.fitBounds(
        L.latLngBounds(points),
        {
          padding: [40, 40],
          maxZoom: 16,
        },
      );
    }


    window.requestAnimationFrame(
      () => {
        map.invalidateSize();
      },
    );


  }, [
    emergencies,
    responderLocations,
    presenceLocations,
    responders,
    showEmergencies,
    showPresence,
    showResponders,
    showRoutes,
  ]);



  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm font-bold">

        <label className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
          <input
            type="checkbox"
            checked={showEmergencies}
            onChange={(event) =>
              setShowEmergencies(
                event.target.checked,
              )
            }
          />
          Emergencies
        </label>


        <label className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-green-700">
          <input
            type="checkbox"
            checked={showPresence}
            onChange={(event) =>
              setShowPresence(
                event.target.checked,
              )
            }
          />
          Available Responders
        </label>


        <label className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
          <input
            type="checkbox"
            checked={showResponders}
            onChange={(event) =>
              setShowResponders(
                event.target.checked,
              )
            }
          />
          Active Responders
        </label>


        <label className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-red-700">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(event) =>
              setShowRoutes(
                event.target.checked,
              )
            }
          />
          Response Routes
        </label>

      </div>


      <div
        ref={containerRef}
        aria-label="SAGIP live command map"
        className="h-[560px] w-full rounded-2xl border border-slate-200"
      />
    </div>
  );
}



function readCoordinate(
  latitudeValue:
    | number
    | string
    | null,
  longitudeValue:
    | number
    | string
    | null,
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
    !Number.isFinite(longitude)
  ) {
    return null;
  }


  return {
    latitude,
    longitude,
  };
}



function createEmergencyPopup(
  emergency: EmergencyRequest,
) {
  return `
    <strong>
      🚨 ${
        emergency.emergency_type ||
        "Emergency"
      }
    </strong>
    <br/>
    Status:
    ${emergency.status || "Pending"}
    <br/>
    Location:
    ${emergency.address || "Unknown"}
  `;
}



function createPresencePopup(
  location: ResponderPresenceLocation,
) {
  return `
    <strong>
      🟢 Available Responder Nearby
    </strong>
    <br/>
    Last update:
    ${formatDateTime(
      location.updated_at,
    )}
  `;
}



function createResponderPopup(
  responder: Responder | null,
  location: ResponderLocation,
) {
  return `
    <strong>
      🚑 ${
        responder?.full_name ||
        "Responder"
      }
    </strong>
    <br/>
    Agency:
    ${
      responder?.agency ||
      "Unknown"
    }
    <br/>
    Availability:
    ${
      responder?.availability ||
      "Unknown"
    }
    <br/>
    Status:
    ${
      responder?.status ||
      "Unknown"
    }
    <br/>
    Updated:
    ${formatDateTime(
      location.updated_at,
    )}
  `;
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
  ).format(
    new Date(dateValue),
  );
}