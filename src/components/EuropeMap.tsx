import React, { memo, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { euCountries } from "../i18n/translations";
import { cityCoordinates } from "../data/cityCoordinates";
import { TAX_RULES_2025 } from "../data/taxRules";
import europe from "../data/europe.json";

interface EuropeMapProps {
  selectedCountry: string;
  selectedCity?: string;
  onSelectCountry: (country: string) => void;
  showHeatmap?: boolean;
}

const W = 800, H = 520;

const heatColor = (rate: number) => {
  if (rate <= 15) return "#22c55e";
  if (rate <= 25) return "#84cc16";
  if (rate <= 35) return "#eab308";
  if (rate <= 40) return "#f97316";
  return "#ef4444";
};

const topRate = (c: string) => TAX_RULES_2025[c]?.effectiveTopRate ?? 30;

const EuropeMap = ({ selectedCountry, selectedCity, onSelectCountry, showHeatmap }: EuropeMapProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const { path, projection } = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [[8, 8], [W - 8, H - 8]],
      europe as unknown as GeoJSON.FeatureCollection,
    );
    return { path: geoPath(projection), projection };
  }, []);

  const cityPos = useMemo(() => {
    if (selectedCity && cityCoordinates[selectedCity] && projection) {
      const p = projection([cityCoordinates[selectedCity][0], cityCoordinates[selectedCity][1]]);
      return p ? { x: p[0], y: p[1] } : null;
    }
    return null;
  }, [selectedCity, projection]);

  const features = (europe as unknown as GeoJSON.FeatureCollection).features;

  return (
    <div className="relative w-full bg-gradient-to-br from-[#dfe9f5] via-[#eef3fa] to-[#e2eaf6] rounded-3xl overflow-hidden border border-slate-200">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block select-none" role="img" aria-label="Map of EU countries">
        <defs>
          <pattern id="eusea" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#b9c9e2" strokeWidth="0.6" opacity="0.55" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#eusea)" />
        {features.map((f) => {
          const name = (f.properties as { name: string }).name;
          const d = path(f as unknown as GeoJSON.Feature) ?? undefined;
          if (!d) return null;
          const isEU = euCountries.includes(name);
          const isSel = selectedCountry === name;
          const isHov = hovered === name;
          const fill = !isEU
            ? "#c3cede"
            : showHeatmap
              ? heatColor(topRate(name))
              : isSel
                ? "#0a1633"
                : "#ffffff";
          return (
            <path
              key={name}
              d={d}
              fill={fill}
              fillOpacity={showHeatmap && isEU ? 0.88 : 1}
              stroke={isSel ? "#c9a227" : "#0a1633"}
              strokeOpacity={isSel ? 1 : 0.28}
              strokeWidth={isSel ? 2.6 : isHov && isEU ? 1.8 : 0.9}
              style={{ transition: "fill .18s ease", cursor: isEU ? "pointer" : "default" }}
              onClick={() => { if (isEU) onSelectCountry(name); }}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${name}${showHeatmap && isEU ? ` — top rate ~${topRate(name)}%` : ""}`}</title>
            </path>
          );
        })}
        {selectedCountry && euCountries.includes(selectedCountry) && !hovered && (() => {
          const f = features.find((x) => (x.properties as { name: string }).name === selectedCountry);
          if (!f) return null;
          const [[x0, y0], [x1, y1]] = path.bounds(f as unknown as GeoJSON.Feature);
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={(x0 + x1) / 2 - 62} y={y0 - 32} width={124} height={24} rx={12} fill="#c9a227" opacity={0.95} />
              <text x={(x0 + x1) / 2} y={y0 - 15} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0a1633" fontFamily="Inter, sans-serif">
                {selectedCountry}
              </text>
            </g>
          );
        })()}
        {hovered && euCountries.includes(hovered) && (() => {
          const f = features.find((x) => (x.properties as { name: string }).name === hovered);
          if (!f) return null;
          const [[x0, y0], [x1, y1]] = path.bounds(f as unknown as GeoJSON.Feature);
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect x={(x0 + x1) / 2 - 62} y={y0 - 32} width={124} height={24} rx={12} fill="#0a1633" opacity={0.92} />
              <text x={(x0 + x1) / 2} y={y0 - 15} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff" fontFamily="Inter, sans-serif">
                {hovered}
              </text>
            </g>
          );
        })()}
        {cityPos && selectedCity && (
          <g style={{ pointerEvents: "none" }}>
            <circle cx={cityPos.x} cy={cityPos.y} r={10} fill="#c9a227" opacity={0.3} />
            <circle cx={cityPos.x} cy={cityPos.y} r={4.5} fill="#c9a227" stroke="#ffffff" strokeWidth={2} />
            <text x={cityPos.x + 10} y={cityPos.y - 8} fontSize={12} fontWeight={800} fill="#0a1633" fontFamily="Inter, sans-serif">
              {selectedCity}
            </text>
          </g>
        )}
      </svg>

      {showHeatmap && (
        <div className="absolute bottom-4 left-4 bg-white/92 backdrop-blur px-4 py-3 rounded-2xl border border-slate-200 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Top marginal rate</p>
          <div className="flex flex-col gap-1.5">
            {[
              ["#22c55e", "≤ 15%"], ["#84cc16", "15–25%"], ["#eab308", "25–35%"],
              ["#f97316", "35–40%"], ["#ef4444", "40%+"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-extrabold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(EuropeMap);
