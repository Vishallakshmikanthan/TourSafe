"use client";

import { useEffect, useRef } from "react";

interface Props {
  lat?: number;
  lng?: number;
  showZones?: boolean;
}

export default function TouristFullMapClient({ lat, lng, showZones }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      const center: [number, number] = lat && lng ? [lat, lng] : [20.5937, 78.9629];
      const map = L.map(containerRef.current!, {
        center,
        zoom: lat ? 14 : 5,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO",
        maxZoom: 19,
      }).addTo(map);
      if (lat && lng) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;background:#FF6B00;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(255,107,0,0.25)"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        markerRef.current = L.marker([lat, lng], { icon })
          .bindPopup("You are here")
          .addTo(map);
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
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full" />;
}
