"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapStore } from "@/store/mapStore";
import { useSOSStore } from "@/store/sosStore";
import { analyticsApi, zoneApi, touristApi } from "@/lib/api";
import { subscribeToLocations, subscribeToSOSEvents } from "@/lib/realtime";
import { zoneTypeColor } from "@/lib/utils";
import type { TouristMarker } from "@/types";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: () => unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createTouristIcon(status: "safe" | "alert" | "sos" | "inactive", inRestricted = false) {
  const colors = {
    safe: "#046A38",
    alert: "#FF6B00",
    sos: "#C53030",
    inactive: "#4A5568",
  };
  // Restricted zone tourists always render red with a distinct border
  const color = inRestricted ? "#C53030" : colors[status];
  const pulse = (status === "sos" || inRestricted) ? `
    <circle cx="12" cy="12" r="9" fill="${color}" opacity="0.35">
      <animate attributeName="r" from="9" to="20" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.35" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  ` : "";
  const border = inRestricted ? `stroke="#FF0000" stroke-width="2.5"` : `stroke="white" stroke-width="2"`;

  return L.divIcon({
    html: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
      ${pulse}
      <circle cx="12" cy="12" r="7" fill="${color}" ${border}/>
      <circle cx="12" cy="12" r="3" fill="white"/>
      ${inRestricted ? `<text x="12" y="8" text-anchor="middle" font-size="5" fill="white" font-weight="bold">!</text>` : ""}
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

  // Load initial data: heatmap, zones, and tourists together
  useEffect(() => {
    Promise.all([
      analyticsApi.getHeatmapData().catch(() => ({ data: [] })),
      zoneApi.getAll().catch(() => ({ data: [] })),
      touristApi.getAll().catch(() => ({ data: [] })),
    ]).then(([heatRes, zoneRes, touristRes]) => {
      setHeatmapData((heatRes.data as any[]) ?? []);

      // Mock returns array directly; real API may return { items: [] }
      const zoneData = Array.isArray(zoneRes.data)
        ? zoneRes.data
        : ((zoneRes.data as any)?.items ?? []);
      setZones(zoneData);

      // Build a zone-type lookup to determine tourist status
      const zoneTypeMap = new Map<string, string>(
        zoneData.map((z: any) => [z.id, z.type])
      );

      const touristItems: any[] = Array.isArray(touristRes.data)
        ? touristRes.data
        : ((touristRes.data as any)?.items ?? []);

      const tMarkers: TouristMarker[] = touristItems.map((t) => {
        const zoneType = t.current_zone_id ? zoneTypeMap.get(t.current_zone_id) : "";
        let status: TouristMarker["status"] = "safe";
        if (t.status === "sos") status = "sos";
        else if (zoneType === "restricted") status = "sos"; // red pulsing in restricted zones
        else if (zoneType === "danger" || t.status === "alert" || t.status === "warning") status = "alert";
        else if (t.status === "inactive") status = "inactive";

        const lat = t.current_location?.latitude ?? t.current_lat ?? 20.5937;
        const lng = t.current_location?.longitude ?? t.current_lng ?? 78.9629;
        return {
          tourist_id: t.id,
          name: t.full_name ?? t.name ?? "Tourist",
          latitude: lat,
          longitude: lng,
          status,
          last_seen: t.created_at ?? new Date().toISOString(),
          // Carry zone_type so popup can show "RESTRICTED ZONE" warning
          zone_type: zoneType,
        } as TouristMarker & { zone_type?: string };
      });
      setMarkers(tMarkers);
    });
  }, [setHeatmapData, setZones, setMarkers]);

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
      const ext = m as TouristMarker & { zone_type?: string };
      const inRestricted = ext.zone_type === "restricted";
      const icon = createTouristIcon(m.status, inRestricted);
      const statusLabel = inRestricted
        ? `<span style="color:#C53030;font-weight:700">⚠ RESTRICTED ZONE</span>`
        : `<b>${m.status.toUpperCase()}</b>`;

      if (markersRef.current.has(m.tourist_id)) {
        const existing = markersRef.current.get(m.tourist_id)!;
        existing.setLatLng(latlng);
        existing.setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon })
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;min-width:170px">
              <p style="font-weight:700;color:#1A3C6E;margin:0 0 4px">${m.name}</p>
              <p style="font-size:11px;color:#4A5568;margin:0">Status: ${statusLabel}</p>
              ${ext.zone_type ? `<p style="font-size:11px;color:#4A5568;margin:2px 0 0">Zone: <b>${ext.zone_type}</b></p>` : ""}
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
      const color = zoneTypeColor(zone.type);
      const style = {
        color,
        weight: 2,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: zone.type === "restricted" ? 0.2 : 0.12,
        dashArray: zone.type === "danger" || zone.type === "restricted" ? "6 4" : undefined,
      };

      const hasPolygon =
        zone.polygon?.coordinates?.[0] && zone.polygon.coordinates[0].length > 2;

      let layer: L.Layer | null = null;
      if (hasPolygon) {
        layer = L.geoJSON(zone.polygon as GeoJSON.GeoJsonObject, { style });
      } else {
        const z = zone as any;
        const clat = z.center_lat ?? z.latitude;
        const clng = z.center_lng ?? z.longitude;
        if (clat && clng) {
          layer = L.circle([clat, clng], {
            ...style,
            radius: z.radius_meters ?? z.radius ?? 1000,
          });
        }
      }

      if (!layer) return;
      (layer as any).bindTooltip(
        `<b>${zone.name}</b><br/><span style="text-transform:capitalize">${zone.type}</span>`,
        { sticky: true }
      ).addTo(map);
      zoneLayersRef.current.push(layer);
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

  // Mock live simulation — slowly drift every tourist marker every 3 s
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;
    const timer = setInterval(() => {
      const state = useMapStore.getState();
      state.markers.forEach((m) => {
        state.updateMarker({
          ...m,
          latitude: m.latitude + (Math.random() - 0.5) * 0.0018,
          longitude: m.longitude + (Math.random() - 0.5) * 0.0018,
          last_seen: new Date().toISOString(),
        });
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
}
