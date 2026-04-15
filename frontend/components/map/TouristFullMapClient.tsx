"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  lat?: number;
  lng?: number;
  showZones?: boolean;
  onCenterMe?: () => void;
}

const ZONE_COLORS: Record<string, string> = {
  safe: "#046A38",
  warning: "#D97706",
  danger: "#C53030",
  restricted: "#4A5568",
};

export default function TouristFullMapClient({ lat, lng, showZones, onCenterMe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const zoneLayersRef = useRef<any[]>([]);
  const touristMarkersRef = useRef<any[]>([]);

  // Expose center-me trigger via imperative handle via effect
  const centerMe = useCallback(() => {
    if (!mapRef.current || !lat || !lng) return;
    mapRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
  }, [lat, lng]);

  // Attach centerMe to window for parent to call
  useEffect(() => {
    (window as any).__touristMapCenterMe = centerMe;
    return () => { delete (window as any).__touristMapCenterMe; };
  }, [centerMe]);

  useEffect(() => {
    let mounted = true;
    if (typeof window === "undefined" || mapRef.current) return;

    import("leaflet").then(async (L) => {
      if (!mounted || !containerRef.current) return;
      if ((containerRef.current as any)._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const center: [number, number] = lat && lng ? [lat, lng] : [10.2381, 77.4892]; // Kodaikanal default
      const map = L.map(containerRef.current!, {
        center,
        zoom: lat ? 13 : 9,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Load mock data
      const { MOCK_ZONES, MOCK_TOURISTS } = await import("@/lib/mockData");

      // ── Place / Zone markers & circles ───────────────────────────────
      if (showZones !== false) {
        MOCK_ZONES.forEach((zone: any) => {
          const color = ZONE_COLORS[zone.zone_type] ?? "#4A5568";
          const circle = L.circle([zone.center_lat, zone.center_lng], {
            color,
            weight: 2,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: zone.zone_type === "danger" || zone.zone_type === "restricted" ? 0.18 : 0.1,
            dashArray: zone.zone_type === "danger" ? "6 4" : undefined,
            radius: zone.radius_m,
          }).addTo(map);

          const typeLabel = zone.zone_type.charAt(0).toUpperCase() + zone.zone_type.slice(1);
          const typeColorHex: Record<string, string> = {
            safe: "#046A38", warning: "#D97706", danger: "#C53030", restricted: "#4A5568"
          };
          circle.bindPopup(
            `<div style="font-family:Inter,sans-serif;min-width:200px;max-width:260px">
              <p style="font-weight:700;color:#1A3C6E;margin:0 0 4px;font-size:13px">${zone.name}</p>
              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
                background:${typeColorHex[zone.zone_type] ?? "#4A5568"}22;color:${typeColorHex[zone.zone_type] ?? "#4A5568"};
                margin-bottom:6px;text-transform:uppercase">${typeLabel}</span>
              <p style="font-size:11px;color:#4A5568;margin:4px 0">${zone.alert_message_en}</p>
              <p style="font-size:10px;color:#718096;margin:4px 0 0">
                Tourists inside: <b>${zone.tourist_count}</b> &nbsp;|&nbsp;
                Active alerts: <b>${zone.active_alerts}</b>
              </p>
            </div>`,
            { maxWidth: 280 }
          );

          // Also add a small dot marker at zone center
          const dotIcon = L.divIcon({
            className: "",
            html: `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;opacity:0.9"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          L.marker([zone.center_lat, zone.center_lng], { icon: dotIcon }).addTo(map);

          zoneLayersRef.current.push(circle);
        });
      }

      // ── All tourists on map ──────────────────────────────────────────
      MOCK_TOURISTS.forEach((t: any) => {
        const statusColors: Record<string, string> = {
          sos: "#C53030",
          warning: "#FF6B00",
          safe: "#046A38",
          inactive: "#4A5568",
        };
        const color = statusColors[t.status] ?? "#046A38";
        const pulse = t.status === "sos" ? `
          <circle cx="12" cy="12" r="9" fill="${color}" opacity="0.3">
            <animate attributeName="r" from="9" to="22" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/>
          </circle>` : "";

        const icon = L.divIcon({
          className: "",
          html: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
            ${pulse}
            <circle cx="12" cy="12" r="7" fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });

        const statusLabel = t.status === "sos" ? `<span style="color:#C53030;font-weight:700">⚠ SOS ACTIVE</span>` :
          t.status === "warning" ? `<span style="color:#FF6B00;font-weight:700">⚠ WARNING</span>` :
          `<span style="color:#046A38;font-weight:700">✓ SAFE</span>`;

        const marker = L.marker([t.current_lat, t.current_lng], { icon })
          .bindPopup(
            `<div style="font-family:Inter,sans-serif;min-width:190px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;
                  justify-content:center;color:white;font-weight:700;font-size:14px;flex-shrink:0">${t.full_name.charAt(0)}</div>
                <div>
                  <p style="font-weight:700;color:#1A3C6E;margin:0;font-size:13px">${t.full_name}</p>
                  <p style="font-size:11px;color:#4A5568;margin:0">${t.nationality}</p>
                </div>
              </div>
              <p style="font-size:11px;color:#4A5568;margin:2px 0">Status: ${statusLabel}</p>
              ${t.blood_type ? `<p style="font-size:11px;color:#4A5568;margin:2px 0">Blood: <b>${t.blood_type}</b></p>` : ""}
              ${t.medical_conditions?.length ? `<p style="font-size:11px;color:#C53030;margin:2px 0">⚕ ${t.medical_conditions.join(", ")}</p>` : ""}
              <p style="font-size:11px;color:#4A5568;margin:4px 0 2px">Battery: <b>${t.battery_pct}%</b> &nbsp;|&nbsp; Anomaly: <b>${t.anomaly_score?.toFixed(2)}</b></p>
              <p style="font-size:10px;color:#718096;margin:2px 0">Last seen: ${t.last_seen}</p>
              ${t.emergency_contact_name ? `<p style="font-size:10px;color:#4A5568;margin:4px 0 0;border-top:1px solid #E2E8F0;padding-top:4px">
                Emergency: <b>${t.emergency_contact_name}</b> (${t.emergency_contact_relation})<br/>
                <a href="tel:${t.emergency_contact_phone}" style="color:#0D9488">${t.emergency_contact_phone}</a>
              </p>` : ""}
            </div>`,
            { maxWidth: 280 }
          )
          .addTo(map);

        touristMarkersRef.current.push(marker);
      });

      // ── My own location marker ──────────────────────────────────────
      if (lat && lng) {
        const myIcon = L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;background:#FF6B00;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(255,107,0,0.25)"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        myMarkerRef.current = L.marker([lat, lng], { icon: myIcon })
          .bindPopup("<b>You are here</b>")
          .addTo(map);
      }

      // ── Live drift simulation ──────────────────────────────────────
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        setInterval(() => {
          touristMarkersRef.current.forEach((m, i) => {
            const latlng = m.getLatLng();
            m.setLatLng([
              latlng.lat + (Math.random() - 0.5) * 0.001,
              latlng.lng + (Math.random() - 0.5) * 0.001,
            ]);
          });
        }, 4000);
      }
    });

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update zone visibility
  useEffect(() => {
    if (!mapRef.current) return;
    zoneLayersRef.current.forEach((l) => {
      if (showZones === false) {
        l.remove();
      } else {
        l.addTo(mapRef.current);
      }
    });
  }, [showZones]);

  // Update own position
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full" />;
}
