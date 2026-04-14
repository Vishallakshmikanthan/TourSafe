"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapStore } from "@/store/mapStore";
import { useSOSStore } from "@/store/sosStore";
import { analyticsApi, zoneApi } from "@/lib/api";
import { subscribeToLocations, subscribeToSOSEvents } from "@/lib/realtime";
import { zoneTypeColor } from "@/lib/utils";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: () => unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createTouristIcon(status: "safe" | "alert" | "sos" | "inactive") {
  const colors = {
    safe: "#046A38",
    alert: "#FF6B00",
    sos: "#C53030",
    inactive: "#4A5568",
  };
  const color = colors[status];
  const pulse = status === "sos" ? `
    <circle cx="12" cy="12" r="9" fill="${color}" opacity="0.3">
      <animate attributeName="r" from="9" to="18" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  ` : "";

  return L.divIcon({
    html: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      ${pulse}
      <circle cx="12" cy="12" r="7" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export default function AdminMapClient() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const heatLayerRef = useRef<L.Layer | null>(null);
  const zoneLayersRef = useRef<L.Layer[]>([]);

  const { markers, setMarkers, heatmapData, setHeatmapData, zones, setZones, selectMarker, showHeatmap, showMarkers, showZones } = useMapStore();
  const { addSOSEvent } = useSOSStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Load initial data
  useEffect(() => {
    Promise.all([
      analyticsApi.getHeatmapData().catch(() => ({ data: [] })),
      zoneApi.getAll().catch(() => ({ data: { items: [] } })),
    ]).then(([heatRes, zoneRes]) => {
      setHeatmapData(heatRes.data ?? []);
      setZones(zoneRes.data?.items ?? []);
    });
  }, [setHeatmapData, setZones]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showMarkers) {
      markersRef.current.forEach((m) => m.remove());
      return;
    }

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(markers.map((m) => m.tourist_id));

    // Remove stale
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    });

    // Add / update
    markers.forEach((m) => {
      const latlng: L.LatLngExpression = [m.latitude, m.longitude];
      const icon = createTouristIcon(m.status);

      if (markersRef.current.has(m.tourist_id)) {
        const existing = markersRef.current.get(m.tourist_id)!;
        existing.setLatLng(latlng);
        existing.setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon })
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;min-width:160px">
              <p style="font-weight:700;color:#1A3C6E;margin:0 0 4px">${m.name}</p>
              <p style="font-size:11px;color:#4A5568;margin:0">Status: <b>${m.status}</b></p>
              <p style="font-size:11px;color:#4A5568;margin:4px 0 0">Last seen: ${new Date(m.last_seen).toLocaleTimeString()}</p>
            </div>`
          )
          .on("click", () => selectMarker(m))
          .addTo(map);
        markersRef.current.set(m.tourist_id, marker);
      }
    });
  }, [markers, showMarkers, selectMarker]);

  // Render zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    zoneLayersRef.current.forEach((l) => l.remove());
    zoneLayersRef.current = [];

    if (!showZones) return;

    zones.forEach((zone) => {
      if (!zone.polygon?.coordinates) return;
      const color = zoneTypeColor(zone.type);
      const poly = L.geoJSON(zone.polygon as GeoJSON.GeoJsonObject, {
        style: {
          color,
          weight: 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.12,
          dashArray: zone.type === "danger" ? "6 4" : undefined,
        },
      })
        .bindTooltip(zone.name, { sticky: true })
        .addTo(map);
      zoneLayersRef.current.push(poly);
    });
  }, [zones, showZones]);

  // Subscribe to real-time location
  useEffect(() => {
    const sub = subscribeToLocations((locs) => {
      locs.forEach((loc) => {
        useMapStore.getState().updateMarker({
          tourist_id: loc.tourist_id,
          name: "Tourist",
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: "safe",
          last_seen: loc.recorded_at,
        });
      });
    });
    return () => { sub.unsubscribe(); };
  }, []);

  // Subscribe to SOS
  useEffect(() => {
    const sub = subscribeToSOSEvents((event) => {
      addSOSEvent(event);
      useMapStore.getState().updateMarker({
        tourist_id: event.tourist_id,
        name: event.tourist_name,
        latitude: event.latitude,
        longitude: event.longitude,
        status: "sos",
        last_seen: event.triggered_at,
      });
      // Pan to SOS
      mapRef.current?.flyTo([event.latitude, event.longitude], 14, {
        duration: 1.5,
      });
    });
    return () => { sub.unsubscribe(); };
  }, [addSOSEvent]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
