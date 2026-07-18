import React, { useState, useRef } from "react";
import { Upload, X, AlertCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { apiUrl } from "../lib/api";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
}

export function ImageUploader({ value, onChange, onRemove, label, className = "" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Only JPEG, PNG, and WEBP image formats are supported.");
      return;
    }

    // Validate size (8MB)
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image size exceeds the 8MB limit. Please choose a smaller photo.");
      return;
    }

    setIsUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const fileData = await base64Promise;

      // Send to server
      const token = localStorage.getItem("nest_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileData,
          fileName: file.name
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      onChange(data.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <span className="text-[10px] font-sans font-extrabold text-muted-foreground uppercase tracking-wider block">
          {label}
        </span>
      )}

      {error && (
        <div className="flex items-start gap-1.5 p-2.5 bg-destructive/10 border border-destructive/25 text-destructive rounded-xl text-[10px] font-sans font-semibold animate-fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {value ? (
          <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card aspect-video max-h-56 flex items-center justify-center group shadow-sm transition">
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-card/90 text-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-card hover:scale-105 transition active:scale-95 cursor-pointer shadow-sm"
              >
                Replace Photo
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={isUploading}
                  className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 hover:scale-105 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`w-full py-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 transition ${
              isUploading
                ? "bg-accent/25 border-border text-rose-400"
                : "bg-card/30 border-border/40 text-muted-foreground hover:bg-card/40 hover:border-rose-300 hover:text-rose-400"
            }`}
          >
            {isUploading ? (
              <Loader2 size={24} className="animate-spin text-primary" />
            ) : (
              <Upload size={24} className="group-hover:scale-110 transition" />
            )}
            <span className="text-[10px] font-sans font-bold">
              {isUploading ? "Uploading file..." : "Drop file here or tap to upload from gallery"}
            </span>
            <span className="text-[8px] text-muted-foreground">
              Supports JPG, PNG, WEBP (Max 8MB)
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

interface MultiImageUploaderProps {
  values: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  label?: string;
}

export function MultiImageUploader({ values = [], onChange, maxImages = 5, label }: MultiImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);

    if (values.length >= maxImages) {
      setError(`Maximum limit of ${maxImages} images reached.`);
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Only JPEG, PNG, and WEBP image formats are supported.");
      return;
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image size exceeds the 8MB limit.");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const fileData = await base64Promise;

      const token = localStorage.getItem("nest_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers,
        body: JSON.stringify({ fileData, fileName: file.name })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onChange([...values, data.url]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(values.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-[10px] font-sans font-extrabold text-muted-foreground uppercase tracking-wider block">
          {label}
        </span>
      )}

      {error && (
        <div className="flex items-start gap-1.5 p-2.5 bg-destructive/10 border border-destructive/25 text-destructive rounded-xl text-[10px] font-sans font-semibold animate-fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {values.map((url, idx) => (
          <div key={idx} className="relative rounded-xl overflow-hidden aspect-video border border-border bg-card shadow-sm group">
            <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow hover:bg-destructive/90 transition"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {values.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-xl border-2 border-dashed border-border hover:border-rose-300 flex flex-col items-center justify-center aspect-video text-muted-foreground hover:text-rose-400 bg-card/30 hover:bg-card/40 transition cursor-pointer"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <Upload size={16} />
            )}
            <span className="text-[9px] font-sans font-bold mt-1">
              {isUploading ? "Uploading..." : "Add Photo"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
