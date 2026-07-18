import React, { useState } from "react";
import { MapSpot } from "../types";
import { MADRID_MAP_SPOTS } from "../data";
import { MapPin, Coffee, BookOpen, TreePine, Sparkles, Compass, Eye } from "lucide-react";

interface MapProps {
  selectedSpotId?: string;
  onSelectSpot?: (spot: MapSpot) => void;
  highlightedSpots?: string[]; // IDs to highlight based on interests
}

export default function Map({ selectedSpotId, onSelectSpot, highlightedSpots = [] }: MapProps) {
  const [hoveredSpot, setHoveredSpot] = useState<MapSpot | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "cafe":
        return "bg-amber-500 text-white border-amber-200";
      case "study":
        return "bg-indigo-500 text-white border-indigo-200";
      case "activity":
        return "bg-coral-500 text-white border-coral-200";
      case "hidden_gem":
        return "bg-rose-500 text-white border-rose-200";
      case "landmark":
        return "bg-sky-500 text-white border-sky-200";
      default:
        return "bg-gray-500 text-white border-gray-200";
    }
  };

  const getCategoryIcon = (category: string, size = 16) => {
    switch (category) {
      case "cafe":
        return <Coffee size={size} />;
      case "study":
        return <BookOpen size={size} />;
      case "activity":
        return <TreePine size={size} />;
      case "hidden_gem":
        return <Sparkles size={size} />;
      case "landmark":
        return <MapPin size={size} />;
      default:
        return <Compass size={size} />;
    }
  };

  return (
    <div className="relative w-full h-[320px] md:h-[400px] bg-[#FAF6F0] rounded-2xl border border-stone-200 overflow-hidden shadow-inner">
      {/* Grid background to represent map vibes */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: "radial-gradient(#C85B49 1px, transparent 1px)", 
          backgroundSize: "20px 20px" 
        }} 
      />

      {/* Styled Avenues in Central Madrid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {/* Gran Via */}
        <path d="M 10,130 Q 150,150 350,180 T 600,210" fill="none" stroke="#C85B49" strokeWidth="8" strokeLinecap="round" />
        <text x="120" y="135" fill="#8C7A6B" className="text-[10px] font-semibold font-sans uppercase tracking-wider">Gran Vía</text>
        
        {/* Paseo del Prado */}
        <path d="M 450,10 Q 500,200 550,390" fill="none" stroke="#C85B49" strokeWidth="10" strokeLinecap="round" />
        <text x="475" y="160" fill="#8C7A6B" className="text-[10px] font-semibold font-sans uppercase tracking-wider rotate-85" style={{ transformOrigin: "475px 160px" }}>Paseo del Prado</text>

        {/* Calle de Alcalá */}
        <path d="M 300,170 Q 420,150 550,140 T 750,130" fill="none" stroke="#C85B49" strokeWidth="6" strokeLinecap="round" />
        <text x="360" y="152" fill="#8C7A6B" className="text-[10px] font-semibold font-sans uppercase tracking-wider">Calle de Alcalá</text>

        {/* Calle de Atocha */}
        <path d="M 280,240 Q 380,270 510,310 T 600,350" fill="none" stroke="#C85B49" strokeWidth="5" strokeLinecap="round" />
        <text x="340" y="270" fill="#8C7A6B" className="text-[10px] font-semibold font-sans uppercase tracking-wider">Calle de Atocha</text>
      </svg>

      {/* Neighborhood Labels */}
      <div className="absolute top-10 left-[42%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none">
        Chueca
      </div>
      <div className="absolute top-8 left-[22%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none">
        Malasaña
      </div>
      <div className="absolute top-[48%] left-[10%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none">
        Palacio
      </div>
      <div className="absolute top-[43%] left-[42%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none bg-[#FAF6F0]/80 px-2.5 py-0.5 rounded-full shadow-sm border border-stone-200/50">
        Puerta del Sol
      </div>
      <div className="absolute top-[68%] left-[24%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none">
        La Latina
      </div>
      <div className="absolute top-[78%] left-[45%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none">
        Lavapiés
      </div>
      <div className="absolute top-[40%] right-[10%] text-[#B19B86] text-xs font-bold font-mono tracking-widest uppercase pointer-events-none select-none bg-emerald-50 text-emerald-700/70 border border-emerald-100 px-3 py-1 rounded-full shadow-sm">
        Retiro Park
      </div>

      {/* Map Spots / Pins */}
      {MADRID_MAP_SPOTS.map((spot) => {
        const isSelected = selectedSpotId === spot.id;
        const isHighlighted = highlightedSpots.includes(spot.id);
        const markerColor = getCategoryColor(spot.category);

        return (
          <button
            key={spot.id}
            id={`map-pin-${spot.id}`}
            onClick={() => onSelectSpot && onSelectSpot(spot)}
            onMouseEnter={() => setHoveredSpot(spot)}
            onMouseLeave={() => setHoveredSpot(null)}
            className="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 focus:outline-none z-10 hover:scale-125"
            style={{ 
              top: `${spot.lat}%`, 
              left: `${spot.lng}%` 
            }}
          >
            {/* Visual Ring for Selected or Highlighted Pins */}
            {isSelected && (
              <span className="absolute -inset-4 rounded-full bg-coral-500/20 border border-coral-500 animate-ping" />
            )}
            {isHighlighted && !isSelected && (
              <span className="absolute -inset-3 rounded-full bg-amber-400/30 border border-amber-400 animate-pulse" />
            )}

            {/* Main Pin Container */}
            <div className={`p-2 rounded-full shadow-md border-2 ${markerColor} ${
              isSelected ? "scale-110 ring-4 ring-[#E78370]/30 shadow-lg" : ""
            }`}>
              {getCategoryIcon(spot.category, 14)}
            </div>

            {/* Interest-overlap notification label above pin */}
            {isHighlighted && !isSelected && (
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-amber-50 text-[#8C5E2D] font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow border border-amber-200 uppercase tracking-widest whitespace-nowrap">
                Shared Interest
              </div>
            )}
          </button>
        );
      })}

      {/* Hover Information Overlay */}
      {hoveredSpot && (
        <div className="absolute bottom-3 left-3 right-3 md:left-4 md:right-auto md:w-80 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 shadow-xl z-20 transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1.5 rounded-lg ${getCategoryColor(hoveredSpot.category)}`}>
              {getCategoryIcon(hoveredSpot.category, 12)}
            </span>
            <h4 className="font-sans font-bold text-sm text-stone-800 leading-tight">
              {hoveredSpot.name}
            </h4>
          </div>
          <p className="font-sans text-xs text-stone-600 line-clamp-2">
            {hoveredSpot.description}
          </p>
          <div className="mt-1.5 text-[10px] font-mono text-stone-400">
            📍 {hoveredSpot.address}
          </div>
        </div>
      )}

      {/* Selection Details Panel */}
      {!hoveredSpot && selectedSpotId && (() => {
        const spot = MADRID_MAP_SPOTS.find(s => s.id === selectedSpotId);
        if (!spot) return null;
        return (
          <div className="absolute bottom-3 right-3 left-3 md:left-auto md:right-4 md:w-80 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xl z-20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-coral-600">
                Selected Destination
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-stone-100 text-stone-500 font-bold rounded-full">
                {spot.category.replace("_", " ")}
              </span>
            </div>
            <h4 className="font-sans font-extrabold text-stone-900 text-sm mb-1">
              {spot.name}
            </h4>
            <p className="font-sans text-xs text-stone-600 mb-2">
              {spot.description}
            </p>
            <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
              <span>📍 {spot.address}</span>
            </div>
          </div>
        );
      })()}

      {/* Map Legend */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-stone-200/80 shadow-sm flex flex-col gap-1 text-[9px] font-mono font-medium text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Cafés
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" /> Study Cafes
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-coral-500 block" /> Parks/Activities
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" /> Hidden Gems
        </div>
      </div>
    </div>
  );
}
