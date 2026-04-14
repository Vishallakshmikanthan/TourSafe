"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapStore } from "@/store/mapStore";

export default function MiniMapClient() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const { markers } = useMapStore();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 4,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.forEach((m) => {
      const color = m.status === "sos" ? "#C53030" : m.status === "alert" ? "#FF6B00" : "#046A38";
      L.circleMarker([m.latitude, m.longitude], {
        radius: 4,
        fillColor: color,
        color: "white",
        weight: 1,
        fillOpacity: 0.9,
      }).addTo(map);
    });
  }, [markers]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
