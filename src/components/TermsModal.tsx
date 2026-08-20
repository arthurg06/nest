import React from "react";
import { X } from "lucide-react";
import { TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_SECTIONS } from "../../shared/terms";

interface TermsModalProps {
  onClose: () => void;
}

// Clean, readable Terms & Conditions view. Content lives in shared/terms.ts —
// the same module whose version the server stamps onto new accounts.
export default function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="NEST Terms & Conditions"
    >
      <div className="bg-card w-full max-w-lg max-h-[85vh] rounded-[28px] border border-border/70 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="font-sans font-black text-foreground text-base tracking-tight">NEST Terms &amp; Conditions</h3>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Last updated: {TERMS_LAST_UPDATED}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground p-2 -m-2 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5 text-xs font-sans leading-relaxed text-foreground select-text">
          <p>{TERMS_INTRO}</p>
          {TERMS_SECTIONS.map(section => (
            <div key={section.heading} className="space-y-2">
              <h4 className="font-sans font-bold text-[13px] text-foreground">{section.heading}</h4>
              {section.paragraphs.map(p => (
                <p key={p} className="text-muted-foreground">{p}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {section.bullets.map(b => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black py-2.5 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
