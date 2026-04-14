"use client";

import { useEffect, useRef } from "react";
import type { GeoZone } from "@/types";
import { zoneTypeColor } from "@/lib/utils";

interface Props {
  zones: GeoZone[];
  selectedZone?: GeoZone;
  drawMode: boolean;
  onPolygonDrawn: (coords: number[][][]) => void;
}

export default function ZoneDrawMapClient({ zones, selectedZone, drawMode, onPolygonDrawn }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;
    import("leaflet").then((L) => {
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Render existing zones
      zones.forEach((zone) => {
        if (zone.polygon?.coordinates) {
          const latlngs = zone.polygon.coordinates[0].map(
            ([lng, lat]: number[]) => [lat, lng] as [number, number]
          );
          const color =
            zone.type === "safe"
              ? "#046A38"
              : zone.type === "restricted"
              ? "#C53030"
              : zone.type === "emergency"
              ? "#FF6B00"
              : "#0D7680";

          L.polygon(latlngs, {
            color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2,
          })
            .bindTooltip(zone.name, { permanent: false })
            .addTo(map);
        }
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selectedZone) return;
    if (selectedZone.polygon?.coordinates) {
      const coords = selectedZone.polygon.coordinates[0];
      const bounds = coords.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [selectedZone]);

  return <div ref={containerRef} className="w-full h-full" />;
}
