import React, { memo, useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { euCountries } from "../i18n/translations";
import { cityCoordinates } from "../data/cityCoordinates";
import { RotateCcw } from "lucide-react";

// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface EuropeMapProps {
  selectedCountry: string;
  selectedCity?: string;
  onSelectCountry: (country: string) => void;
  showHeatmap?: boolean;
}

const taxRates: Record<string, number> = {
  "Austria": 42, "Belgium": 45, "Bulgaria": 10, "Croatia": 20, "Cyprus": 15, "Czech Republic": 15,
  "Denmark": 45, "Estonia": 20, "Finland": 40, "France": 45, "Germany": 42, "Greece": 35,
  "Hungary": 15, "Ireland": 30, "Italy": 43, "Latvia": 23, "Lithuania": 20, "Luxembourg": 35,
  "Malta": 15, "Netherlands": 37, "Poland": 17, "Portugal": 35, "Romania": 10, "Slovakia": 19,
  "Slovenia": 25, "Spain": 35, "Sweden": 45
};

const countryColors: Record<string, string> = {
  "Austria": "#fecaca", "Belgium": "#fed7aa", "Bulgaria": "#fef08a", "Croatia": "#d9f99d",
  "Cyprus": "#bbf7d0", "Czech Republic": "#99f6e4", "Denmark": "#bae6fd", "Estonia": "#c7d2fe",
  "Finland": "#ddd6fe", "France": "#f5d0fe", "Germany": "#fecdd3", "Greece": "#fde68a",
  "Hungary": "#a7f3d0", "Ireland": "#6ee7b7", "Italy": "#93c5fd", "Latvia": "#a5b4fc",
  "Lithuania": "#c084fc", "Luxembourg": "#f472b6", "Malta": "#fb7185", "Netherlands": "#fbbf24",
  "Poland": "#34d399", "Portugal": "#60a5fa", "Romania": "#818cf8", "Slovakia": "#fb923c",
  "Slovenia": "#4ade80", "Spain": "#2dd4bf", "Sweden": "#38bdf8"
};

const getHeatmapColor = (rate: number) => {
  if (rate <= 15) return "#22c55e"; // Green
  if (rate <= 25) return "#84cc16"; // Lime
  if (rate <= 35) return "#eab308"; // Yellow
  if (rate <= 40) return "#f97316"; // Orange
  return "#ef4444"; // Red
};

const normalizeCountryName = (name: string) => {
  if (name === "Czechia") return "Czech Republic";
  return name;
};

// Component to handle map view changes
const ChangeView = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const EuropeMap = ({ selectedCountry, selectedCity, onSelectCountry, showHeatmap }: EuropeMapProps) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([50, 15]);
  const [mapZoom, setMapZoom] = useState(4);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  useEffect(() => {
    if (selectedCity && cityCoordinates[selectedCity]) {
      const coords = cityCoordinates[selectedCity];
      setMapCenter([coords[1], coords[0]]);
      setMapZoom(6);
    }
  }, [selectedCity]);

  const onEachCountry = (feature: any, layer: L.Layer) => {
    const name = normalizeCountryName(feature.properties.NAME || feature.properties.name);
    const isEU = euCountries.includes(name);
    const taxRate = taxRates[name] || 0;

    layer.on({
      click: () => {
        if (isEU) onSelectCountry(name);
      },
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({
          fillOpacity: 0.9,
          weight: 2,
          color: '#fff'
        });
        if (isEU) {
          const content = showHeatmap ? `${name}: ${taxRate}%` : name;
          layer.bindTooltip(content, { 
            sticky: true, 
            direction: 'top',
            className: 'custom-tooltip' 
          }).openTooltip();
        }
      },
      mouseout: (e: any) => {
        const layer = e.target;
        const isSelected = selectedCountry === name;
        
        // Re-calculate the original style
        const countryColor = countryColors[name] || "#334155";
        let fill = isEU ? countryColor : "#1e293b";
        if (isSelected) fill = "#3B82F6";
        else if (showHeatmap && isEU) fill = getHeatmapColor(taxRate);

        layer.setStyle({
          fillColor: fill,
          fillOpacity: isEU ? (showHeatmap ? 0.85 : 0.7) : 0.2,
          weight: isSelected ? 2 : 0.5,
          color: isSelected ? '#fff' : '#1e293b'
        });
      }
    });
  };

  const countryStyle = useCallback((feature: any) => {
    const name = normalizeCountryName(feature.properties.NAME || feature.properties.name);
    const isEU = euCountries.includes(name);
    const isSelected = selectedCountry === name;
    const taxRate = taxRates[name] || 0;
    const countryColor = countryColors[name] || "#334155";

    let fill = isEU ? countryColor : "#1e293b";
    if (isSelected) fill = "#3B82F6";
    else if (showHeatmap && isEU) fill = getHeatmapColor(taxRate);

    return {
      fillColor: fill,
      fillOpacity: isEU ? (showHeatmap ? 0.85 : 0.7) : 0.2,
      color: isSelected ? "#fff" : "#1e293b",
      weight: isSelected ? 2 : 0.5,
      opacity: 1
    };
  }, [selectedCountry, showHeatmap]);

  const resetView = () => {
    setMapCenter([50, 15]);
    setMapZoom(4);
  };

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 group shadow-2xl">
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
        zoomControl={false}
        attributionControl={false}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={countryStyle} 
            onEachFeature={onEachCountry}
            key={JSON.stringify(selectedCountry) + showHeatmap} // Force re-render on selection or heatmap toggle
          />
        )}
        {selectedCity && cityCoordinates[selectedCity] && (
          <Marker position={[cityCoordinates[selectedCity][1], cityCoordinates[selectedCity][0]]}>
            <Popup>
              <div className="font-bold text-slate-900">{selectedCity}</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Manual Reset Button */}
      <div className="absolute top-6 right-6 z-[1000]">
        <button 
          onClick={resetView}
          className="p-3 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-xl hover:bg-slate-700 text-white transition-all active:scale-90"
          title="Reset View"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Heatmap Legend */}
      {showHeatmap && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Avg. Tax Burden</p>
          <div className="flex flex-col gap-2">
            {[
              { color: "#22c55e", label: "0-15%", desc: "Low Tax" },
              { color: "#84cc16", label: "15-25%", desc: "Moderate" },
              { color: "#eab308", label: "25-35%", desc: "Average" },
              { color: "#f97316", label: "35-40%", desc: "High" },
              { color: "#ef4444", label: "40%+", desc: "Very High" }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white leading-none">{item.label}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Info Overlay */}
      <div className="absolute bottom-6 right-6 text-right pointer-events-none z-[1000]">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OpenSource EU Edition</p>
        <p className="text-[8px] font-bold text-slate-600 uppercase">Interactive Tax Visualization</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-tooltip {
          background: rgba(15, 23, 42, 0.9) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(51, 65, 85, 0.8) !important;
          border-radius: 12px !important;
          color: white !important;
          font-weight: bold !important;
          padding: 8px 12px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .leaflet-container {
          background: #0f172a !important;
        }
      `}} />
    </div>
  );
};

export default memo(EuropeMap);
