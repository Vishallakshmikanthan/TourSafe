import { create } from "zustand";
import type { TouristMarker, HeatmapPoint, GeoZone, MapViewState } from "@/types";

interface MapState {
  viewState: MapViewState;
  markers: TouristMarker[];
  heatmapData: HeatmapPoint[];
  zones: GeoZone[];
  selectedMarker: TouristMarker | null;
  selectedZone: GeoZone | null;
  showHeatmap: boolean;
  showMarkers: boolean;
  showZones: boolean;
  showTrails: boolean;
  isDrawingZone: boolean;
  setViewState: (vs: MapViewState) => void;
  setMarkers: (markers: TouristMarker[]) => void;
  updateMarker: (marker: TouristMarker) => void;
  setHeatmapData: (data: HeatmapPoint[]) => void;
  setZones: (zones: GeoZone[]) => void;
  selectMarker: (marker: TouristMarker | null) => void;
  selectZone: (zone: GeoZone | null) => void;
  toggleHeatmap: () => void;
  toggleMarkers: () => void;
  toggleZones: () => void;
  toggleTrails: () => void;
  setDrawingZone: (drawing: boolean) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  viewState: { center: [20.5937, 78.9629], zoom: 5 }, // India center
  markers: [],
  heatmapData: [],
  zones: [],
  selectedMarker: null,
  selectedZone: null,
  showHeatmap: true,
  showMarkers: true,
  showZones: true,
  showTrails: false,
  isDrawingZone: false,

  setViewState: (viewState) => set({ viewState }),
  setMarkers: (markers) => set({ markers }),
  updateMarker: (marker) => {
    const markers = get().markers.map((m) =>
      m.tourist_id === marker.tourist_id ? marker : m
    );
    if (!markers.find((m) => m.tourist_id === marker.tourist_id)) {
      markers.push(marker);
    }
    set({ markers });
  },
  setHeatmapData: (heatmapData) => set({ heatmapData }),
  setZones: (zones) => set({ zones }),
  selectMarker: (selectedMarker) => set({ selectedMarker }),
  selectZone: (selectedZone) => set({ selectedZone }),
  toggleHeatmap: () => set({ showHeatmap: !get().showHeatmap }),
  toggleMarkers: () => set({ showMarkers: !get().showMarkers }),
  toggleZones: () => set({ showZones: !get().showZones }),
  toggleTrails: () => set({ showTrails: !get().showTrails }),
  setDrawingZone: (isDrawingZone) => set({ isDrawingZone }),
}));
