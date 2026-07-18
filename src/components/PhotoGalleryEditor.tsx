import React, { useState } from "react";
import { Plus, Star, Trash2, Loader2 } from "lucide-react";
import { apiUrl } from "../lib/api";

export const MAX_PROFILE_PHOTOS = 4;

interface PhotoGalleryEditorProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

// Up to four photos, the first one being the profile picture. Uploads reuse
// the hardened /api/upload endpoint (magic-byte sniffing, size cap,
// server-generated filenames).
export function PhotoGalleryEditor({ photos, onChange }: PhotoGalleryEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setError("");
    if (photos.length >= MAX_PROFILE_PHOTOS) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("That image is over 8MB. Please pick a smaller one.");
      return;
    }

    setUploading(true);
    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.readAsDataURL(file);
      });

      const res = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange([...photos, data.url].slice(0, MAX_PROFILE_PHOTOS));
    } catch (err: any) {
      setError(err.message || "Could not upload that photo.");
    } finally {
      setUploading(false);
    }
  };

  const remove = (index: number) => onChange(photos.filter((_, i) => i !== index));

  const makePrimary = (index: number) => {
    const next = [...photos];
    const [chosen] = next.splice(index, 1);
    onChange([chosen, ...next]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {photos.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative aspect-square rounded-2xl overflow-hidden border border-border/60 bg-muted group"
          >
            <img src={url} alt={index === 0 ? "Profile photo" : `Photo ${index + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />

            {index === 0 ? (
              <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-black px-2 py-1 rounded-full">
                Main
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makePrimary(index)}
                aria-label="Make this the main photo"
                title="Make this the main photo"
                className="absolute top-1.5 left-1.5 bg-card/90 text-foreground p-2 rounded-full hover:bg-card transition"
              >
                <Star size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground p-2 rounded-full hover:opacity-90 transition"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {photos.length < MAX_PROFILE_PHOTOS && (
          <label
            className={`aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition text-muted-foreground ${
              uploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-[10px] font-bold">{uploading ? "Uploading…" : "Add photo"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground leading-normal">
        {photos.length}/{MAX_PROFILE_PHOTOS} photos. The first one is what others see first — tap the star to promote another.
      </p>

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
