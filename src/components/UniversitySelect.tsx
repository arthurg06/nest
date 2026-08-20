import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { searchUniversities } from "../../shared/universities";

interface UniversitySelectProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  /** Trigger styling override so the control matches its host form's inputs. */
  triggerClassName?: string;
}

// Single-select searchable dropdown for the approved Madrid universities.
// Mirrors the nationalities picker: a trigger styled like the text inputs and
// an absolutely-positioned panel with a search box and a scrollable list.
// A legacy value stored before the list existed still displays on the trigger;
// the options themselves only ever offer canonical names.
export default function UniversitySelect({
  value,
  onChange,
  placeholder = "Select your university",
  triggerClassName = "w-full bg-card/60 border border-border hover:border-border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between transition",
}: UniversitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const results = searchUniversities(search);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  };

  const select = (name: string) => {
    onChange(name);
    close();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) select(results[activeIndex].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          if (open) return close();
          setOpen(true);
          // The panel opens inside the step scroller — bring the field to the
          // top so the whole panel is in view (same as the nationality picker).
          e.currentTarget.scrollIntoView({ block: "start", behavior: "smooth" });
        }}
        className={`${triggerClassName} ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}
      >
        <span className="truncate text-left">{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {value && <Check size={13} className="text-primary" />}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border/60 rounded-2xl shadow-xl p-3.5 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Madrid Universities</span>
            <button
              type="button"
              onClick={close}
              className="text-[10px] font-extrabold text-primary hover:text-primary uppercase"
            >
              Close
            </button>
          </div>

          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
              aria-label="Search universities"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-card border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none"
            />
            <Search size={12} className="text-muted-foreground absolute left-2.5 top-2.5" />
          </div>

          <div ref={listRef} id={listboxId} role="listbox" aria-label="Madrid universities" className="max-h-40 overflow-y-auto space-y-0.5 -mx-1.5 px-1.5">
            {results.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 px-2.5">No Madrid university matches that search.</p>
            )}
            {results.map((uni, index) => {
              const isSelected = value === uni.name;
              return (
                <button
                  key={uni.name}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(uni.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                    isSelected
                      ? "bg-accent/30 text-primary font-bold"
                      : index === activeIndex
                        ? "bg-muted/60 text-foreground"
                        : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span>{uni.name}</span>
                  {isSelected && <Check size={12} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
