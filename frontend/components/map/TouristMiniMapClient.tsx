"use client";

import { useEffect, useRef } from "react";

interface Props {
  lat?: number;
  lng?: number;
}

export default function TouristMiniMapClient({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const centerLat = lat ?? 20.5937;
  const centerLng = lng ?? 78.9629;

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      const map = L.map(containerRef.current!, {
        center: [centerLat, centerLng],
        zoom: lat ? 14 : 5,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO",
      }).addTo(map);
      if (lat && lng) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;background:#FF6B00;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(255,107,0,0.3)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      }
      mapRef.current = map;
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    mapRef.current.setView([lat, lng], 14);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full" />;
}
