import React, { useState, useEffect } from "react";
import { Recommendation, UserProfile } from "../types";
import { 
  Coffee, Utensils, BookOpen, TreePine, Sparkles, Plus, Star, 
  Heart, MapPin, Search, Image as ImageIcon, Camera, ExternalLink, Trash2
} from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { apiUrl } from "../lib/api";
import { avatarGradient } from "../../shared/avatar";

interface CityDiscoveryProps {
  recommendations: Recommendation[];
  onAddRecommendation: (rec: Omit<Recommendation, "id" | "authorName" | "authorAvatarSeed" | "authorAvatarColor" | "likes" | "userLiked">) => void;
  onDeleteRecommendation?: (id: string) => Promise<boolean>;
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

export default function CityDiscovery({ 
  recommendations, 
  onAddRecommendation,
  onDeleteRecommendation,
  currentUser,
  isAdmin
}: CityDiscoveryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [placeName, setPlaceName] = useState("");
  const [placeCategory, setPlaceCategory] = useState<"cafe" | "restaurant" | "study" | "activity" | "hidden_gem">("cafe");
  const [placeRating, setPlaceRating] = useState(5);
  const [placeTagsString, setPlaceTagsString] = useState("");
  const [placeImageUrl, setPlaceImageUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [formError, setFormError] = useState("");

  const categories = [
    { id: "all", label: "All Spots", icon: <Sparkles size={13} /> },
    { id: "cafe", label: "Cafés", icon: <Coffee size={13} /> },
    { id: "restaurant", label: "Restaurants", icon: <Utensils size={13} /> },
    { id: "study", label: "Study spots", icon: <BookOpen size={13} /> },
    { id: "activity", label: "Outdoors", icon: <TreePine size={13} /> },
    { id: "hidden_gem", label: "Hidden Gems", icon: <Sparkles size={13} /> },
  ];

  // Likes state handler
  const [recs, setRecs] = useState<Recommendation[]>(recommendations);
  useEffect(() => {
    setRecs(recommendations);
  }, [recommendations]);

  const handleToggleLike = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/recommendations/${id}/like`), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(prev => prev.map(rec => {
          if (rec.id === id) {
            return {
              ...rec,
              userLiked: data.userLiked,
              likes: data.likes
            };
          }
          return rec;
        }));
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      setFormError("Please enter a place name!");
      return;
    }

    const tags = placeTagsString
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    // Ensure the Google Maps URL has a valid protocol
    let formattedUrl = googleMapsUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    // Pass default values for address & description since those fields are removed from form but required by DB/server
    onAddRecommendation({
      name: placeName.trim(),
      category: placeCategory,
      description: "Excellent secret spot recommended by verified students!",
      rating: placeRating,
      address: "Madrid, Spain",
      userTags: tags.length > 0 ? tags : [placeCategory],
      locationCoords: { lat: 40.4167, lng: -3.7037 },
      imageUrl: placeImageUrl,
      googleMapsUrl: formattedUrl
    });

    // Reset Form
    setPlaceName("");
    setPlaceTagsString("");
    setPlaceImageUrl("");
    setGoogleMapsUrl("");
    setPlaceRating(5);
    setShowForm(false);
    setFormError("");
  };

  // Filter recommendations
  const filteredRecs = recs.filter(rec => {
    const matchesCategory = activeCategory === "all" || rec.category === activeCategory;
    const matchesSearch = rec.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.userTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "cafe": return "bg-amber-100/60 text-amber-800 border-amber-200/30";
      case "restaurant": return "bg-orange-100/60 text-orange-800 border-orange-200/30";
      case "study": return "bg-indigo-100/60 text-indigo-800 border-indigo-200/30";
      case "activity": return "bg-emerald-100/60 text-emerald-800 border-emerald-200/30";
      case "hidden_gem": return "bg-accent/50 text-accent-foreground border-border/30";
      default: return "bg-muted/60 text-foreground border-border/30";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="font-display text-3xl text-foreground">
            City guide
          </h2>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Secret spots across Madrid, shared by verified members.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-sans text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-200/50 hover:bg-primary/90 transition md:self-end active:scale-95 shrink-0 cursor-pointer animate-fade-in"
        >
          <Plus size={14} />
          <span>Share a spot</span>
        </button>
      </div>

      {/* Simplified, Map-free Recommendation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card/45 backdrop-blur-xl p-5 rounded-2xl border border-border/60 shadow-lg animate-fade-in space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border/30">
            <h4 className="font-sans font-bold text-sm text-foreground flex items-center gap-1.5">
              <Camera size={16} className="text-primary" />
              <span>Share your Madrid Secret! 💖</span>
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-muted-foreground font-bold hover:text-foreground p-2 -m-2">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spot Name */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Place Name</span>
              <input
                type="text"
                placeholder="e.g. Acid Café"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Category</span>
              <select
                value={placeCategory}
                onChange={(e) => setPlaceCategory(e.target.value as any)}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="cafe">Coffee / Cafés</option>
                <option value="restaurant">Dinner / Restaurants</option>
                <option value="study">Quiet Study Spots</option>
                <option value="activity">Outdoors / Gyms / Pilates</option>
                <option value="hidden_gem">Hidden Gems / Sightseeing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Maps URL Link */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Google Maps Link (URL)</span>
              <input
                type="text"
                placeholder="e.g. https://maps.google.com/?q=..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Tags (comma separated)</span>
              <input
                type="text"
                placeholder="e.g. brunch, pastry, study session, aesthetic"
                value={placeTagsString}
                onChange={(e) => setPlaceTagsString(e.target.value)}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Photo File Direct Device Upload */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Photo Upload (from gallery/files) 📸</span>
            <ImageUploader
              value={placeImageUrl}
              onChange={(url) => setPlaceImageUrl(url)}
              onRemove={() => setPlaceImageUrl("")}
              label=""
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground">Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPlaceRating(num)}
                    className="p-0.5 text-amber-400 focus:outline-none cursor-pointer"
                  >
                    <Star size={16} fill={num <= placeRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            {formError && <span className="text-primary font-sans text-[10px] font-bold">{formError}</span>}

            <button
              type="submit"
              className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold font-sans shadow-lg hover:bg-primary/90 transition active:scale-95 cursor-pointer"
            >
              Post Secret Spot
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search controls bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/30 backdrop-blur-md p-3.5 rounded-2xl border border-border/50 shrink-0 shadow-sm">
        
        {/* Categories sliders */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 select-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 rounded-xl font-sans text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-card/50 text-foreground border-border/40 hover:bg-card/70"
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:w-64 shrink-0">
          <input
            type="text"
            placeholder="Search venue or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card/40 border border-border/50 rounded-xl pl-9 pr-4 py-1.5 text-xs font-sans text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Search size={14} className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

      </div>

      {/* Recommendations Feed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecs.length > 0 ? (
          filteredRecs.map((rec) => (
            <div
              key={rec.id}
              id={`discovery-rec-${rec.id}`}
              className="bg-card/40 backdrop-blur-md rounded-[24px] border border-border/60 p-5 shadow-sm flex flex-col justify-between hover:shadow-xl hover:bg-card/50 transition-all duration-300"
            >
              <div>
                {/* Spot visual Image if present */}
                {rec.imageUrl && (
                  <div className="h-44 w-full rounded-2xl overflow-hidden mb-4 border border-border/20 relative shadow-sm group">
                    <img
                      src={rec.imageUrl}
                      alt={rec.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}

                {/* Spot Header Row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-sans font-extrabold uppercase border tracking-wider ${getCategoryColor(rec.category)}`}>
                      {rec.category.replace("_", " ")}
                    </span>
                    <h3 className="font-sans font-black text-foreground text-sm mt-1.5 leading-tight">
                      {rec.name}
                    </h3>
                  </div>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-200/40 shrink-0">
                    <Star size={11} fill="currentColor" className="text-amber-500" />
                    <span>{rec.rating}</span>
                  </div>
                </div>

                {/* Sub tags board */}
                <div className="flex flex-wrap gap-1 mb-4 select-none">
                  {rec.userTags.map(tag => (
                    <span key={tag} className="bg-card/50 text-muted-foreground font-mono text-[9px] px-2 py-0.5 rounded border border-border/40">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Metadata & Like feedback bar */}
              <div className="pt-3 border-t border-border/30 flex items-center justify-between text-[11px] font-sans gap-2 flex-wrap">
                
                {/* Author profile tag */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${avatarGradient({ avatarColor: rec.authorAvatarColor, avatarSeed: rec.authorAvatarSeed })} flex items-center justify-center text-white text-[10px] font-extrabold`}>
                    {(rec.authorName || "N")[0]}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shared by </span>
                    <span className="font-bold text-foreground">{rec.authorName}</span>
                  </div>
                </div>

                {/* Like Count controls & Google Maps Pin */}
                <div className="flex items-center gap-2 ml-auto">
                  {rec.googleMapsUrl && (
                    <a
                      href={rec.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition flex items-center gap-1 font-bold text-[10px]"
                      title="Open in Google Maps"
                    >
                      <span className="bg-accent/30 hover:bg-accent/60 border border-border/70 px-2 py-0.5 rounded-full text-[9px] text-primary flex items-center gap-1 font-extrabold transition">
                        🗺️ Google Maps ↗
                      </span>
                    </a>
                  )}

                  <button
                    onClick={() => handleToggleLike(rec.id)}
                    className={`flex items-center gap-1 font-bold font-sans transition cursor-pointer ${
                      rec.userLiked 
                        ? "text-primary scale-105" 
                        : "text-muted-foreground hover:text-rose-400"
                    }`}
                  >
                    <Heart size={14} fill={rec.userLiked ? "currentColor" : "none"} />
                    <span className="font-mono text-[10px]">{rec.likes}</span>
                  </button>

                  {(isAdmin || (currentUser && (rec.authorId === currentUser.userId || rec.authorId === currentUser.id))) && onDeleteRecommendation && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you absolutely sure you want to delete secret spot "${rec.name}"?`)) {
                          await onDeleteRecommendation(rec.id);
                        }
                      }}
                      className="transition flex items-center gap-1 font-sans font-bold text-[9px] bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:border-red-200 transition-colors"
                      title="Delete secret spot"
                    >
                      <Trash2 size={11} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-card/40 backdrop-blur-md border border-dashed border-border/60 rounded-[28px] max-w-sm mx-auto p-6 space-y-3">
            <span className="text-3xl select-none">🗺️☕</span>
            <h4 className="font-sans font-bold text-sm text-foreground">No spots found in City Guide</h4>
            <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              The City Guide is empty until verified students share their secret spots around Madrid. Why not post a recommendation above?
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
