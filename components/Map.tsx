
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place, UserLocation } from '../types';

interface MapProps {
  places: Place[];
  userLocation: UserLocation | null;
  selectedPlace: Place | null;
  onPlaceSelect: (place: Place) => void;
  theme?: 'voyager' | 'dark' | 'positron';
}

const THEMES = {
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

const Map: React.FC<MapProps> = ({ places, userLocation, selectedPlace, onPlaceSelect, theme = 'voyager' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) {
      const initialLat = userLocation?.latitude || 20; 
      const initialLng = userLocation?.longitude || 0;
      const initialZoom = userLocation ? 14 : 2;
      
      mapRef.current = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
      }).setView([initialLat, initialLng], initialZoom);

      tileLayerRef.current = L.tileLayer(THEMES[theme], {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Theme
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(THEMES[theme]);
    }
  }, [theme]);

  // Handle User Location Marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-gps-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
            <div class="absolute w-12 h-12 bg-blue-400/10 rounded-full"></div>
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup('<div class="p-1 font-black text-[10px] uppercase text-blue-600">You are here</div>');
    }
  }, [userLocation]);

  // Sync Markers and Bounds for Places
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove all current markers from the map
    // Fixed: Cast Object.values to L.Marker[] to resolve 'unknown' type error in line 91
    (Object.values(markersRef.current) as L.Marker[]).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);
    let hasValidCoords = false;

    // Extend bounds with user location if available
    if (userLocation) {
      bounds.extend([userLocation.latitude, userLocation.longitude]);
      hasValidCoords = true;
    }

    places.forEach((place) => {
      if (!place.coordinates) return;
      
      const coords = place.coordinates;
      const isSelected = selectedPlace?.id === place.id;
      const markerColor = isSelected ? '#e11d48' : '#4f46e5'; 
      
      const markerHtml = `
        <div class="flex items-center justify-center transition-all duration-500">
          <div style="background-color: ${markerColor};" class="w-9 h-9 rounded-2xl border-4 border-white shadow-2xl flex items-center justify-center transform transition-all duration-300 ${isSelected ? 'scale-125 rotate-0 shadow-rose-200' : 'hover:scale-110 rotate-45'}">
            <svg class="${isSelected ? '' : '-rotate-45'}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(coords, { icon: markerIcon })
        .addTo(mapRef.current!)
        .on('click', () => onPlaceSelect(place));

      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-2 font-sans text-center min-w-[160px]';
      popupDiv.innerHTML = `
        <h5 class="font-black text-gray-900 leading-tight mb-1 text-sm">${place.name}</h5>
        <div class="flex items-center justify-center gap-1 mb-2">
           <span class="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">${place.vibe || 'Discovery'}</span>
        </div>
        <button class="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl w-full shadow-md hover:bg-indigo-700 transition-colors">Details</button>
      `;
      popupDiv.querySelector('button')?.addEventListener('click', () => onPlaceSelect(place));

      marker.bindPopup(popupDiv, { closeButton: false, className: 'marker-popup-clean' });
      markersRef.current[place.id] = marker;
      bounds.extend(coords);
      hasValidCoords = true;

      if (isSelected) {
        marker.openPopup();
        mapRef.current?.flyTo(coords, 16, { animate: true, duration: 1.5 });
      }
    });

    if (!selectedPlace && places.length > 0 && hasValidCoords) {
      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.2 });
      }, 100);
    }
  }, [places, userLocation, selectedPlace]);

  const centerOnUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.latitude, userLocation.longitude], 16, {
        animate: true,
        duration: 1.5
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      <style>{`
        .leaflet-container { font-family: inherit; background: #f8fafc; }
        .marker-popup-clean .leaflet-popup-content-wrapper {
          border-radius: 20px;
          padding: 4px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
        }
        .marker-popup-clean .leaflet-popup-content { margin: 8px; width: auto !important; }
        .leaflet-popup-tip-container { display: none; }
        .user-gps-marker { pointer-events: none; }
      `}</style>
      
      {/* Center on Me Button */}
      {userLocation && (
        <button 
          onClick={centerOnUser}
          className="absolute bottom-24 right-4 z-[400] bg-white p-3 rounded-2xl shadow-xl border border-gray-100 text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
          title="Center on me"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M12 3v3"/><path d="M12 18v3"/></svg>
        </button>
      )}

      <div id="map-container" className="h-full w-full" />
    </div>
  );
};

export default Map;
