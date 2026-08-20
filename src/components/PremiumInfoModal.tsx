import React from "react";
import { X, Check, Crown, Sparkles } from "lucide-react";
import { PREMIUM_PLAN_OPTIONS, GUEST_PASS_POLICY, activePartnerPerks, PREMIUM_RENEWAL_NOTE } from "../../shared/subscription";

interface PremiumInfoModalProps {
  onClose: () => void;
  /** Dormant Stripe checkout — shown only when payments are configured. */
  stripeReady: boolean;
  onStartCheckout: () => void;
  isRedirecting: boolean;
  paymentError: string;
}

// The dedicated NEST Premium page: plans (display-only until payments are
// connected), what membership includes, guest pass rules, partner perks, and
// the community voice. Copy lives here; entitlement lives on the server.
export default function PremiumInfoModal({ onClose, stripeReady, onStartCheckout, isRedirecting, paymentError }: PremiumInfoModalProps) {
  const perks = activePartnerPerks();

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-950/75 backdrop-blur-md flex items-stretch md:items-center justify-center md:p-6 animate-fade-in select-text"
      role="dialog"
      aria-modal="true"
      aria-label="About NEST Premium"
    >
      <div className="bg-card w-full h-full md:h-auto md:max-h-[88vh] md:max-w-lg md:rounded-[32px] md:border md:border-border/70 shadow-2xl flex flex-col overflow-hidden">
        {/* Brand header */}
        <div className="bg-slate-950 text-white px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 text-center relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 text-white/70 hover:text-white p-2.5 rounded-full transition"
          >
            <X size={18} />
          </button>
          <img src="/icons/nest-logo.png" alt="NEST logo" className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-lg" />
          <h3 className="font-sans font-black text-xl tracking-tight">NEST Premium</h3>
          <p className="text-rose-300 font-sans text-xs font-bold mt-1">Exclusive outings, curated by the NEST team.</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {/* Plans — display-only until payments are connected */}
          <div className="space-y-2">
            <h4 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">Membership</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PREMIUM_PLAN_OPTIONS.map(plan => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-3 text-center relative ${
                    plan.bestValue
                      ? "border-primary/60 bg-accent/30 shadow-sm"
                      : "border-border/60 bg-card/60"
                  }`}
                >
                  {plan.bestValue && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                      Best value
                    </span>
                  )}
                  <div className="font-sans font-black text-sm text-foreground mt-1">{plan.label.split(" / ")[0]}</div>
                  <div className="text-[10px] text-muted-foreground font-sans mt-0.5">/ {plan.label.split(" / ")[1]}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Membership options open soon — no payment details are collected yet.
            </p>
          </div>

          {/* What Premium includes */}
          <div className="space-y-2">
            <h4 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">Unlimited access to NEST-hosted outings</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Premium members get access to exclusive NEST experiences, including:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {[
                "🍽️ Group dinners",
                "✈️ Planned trips",
                "☕ Coffee meetups",
                "📚 Group study sessions",
                "🪩 Club guestlists through NEST's club collaborators",
                "✨ VIP tables at selected clubs",
                "🧘‍♀️ Fitness & wellness events"
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <Check size={13} className="text-success shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground leading-normal bg-muted/40 border border-border/40 rounded-xl p-2.5">
              Premium covers access to the NEST outing itself. Personal expenses — food, drinks, transport,
              accommodation, tickets and similar — are separate and each attendee's own responsibility, unless
              a specific outing says otherwise.
            </p>
          </div>

          {/* Beyond the RSVP */}
          <div className="space-y-2">
            <h4 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">Meet your people beyond the RSVP</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <Check size={13} className="text-success shrink-0 mt-0.5" />
                <span>Private event WhatsApp / Instagram groups — connect with the other attendees and see who else is joining.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={13} className="text-success shrink-0 mt-0.5" />
                <span>Dedicated photo albums for the NEST outings you attend.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={13} className="text-success shrink-0 mt-0.5" />
                <span>
                  A Guest Pass to bring one non-Premium friend along — {GUEST_PASS_POLICY.guestsPerOuting} guest
                  per outing, up to {GUEST_PASS_POLICY.usesPerMonth} times a month. Your guest is your
                  responsibility.
                </span>
              </li>
            </ul>
          </div>

          {/* Partner perks */}
          <div className="space-y-2">
            <h4 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">NEST Partner Perks</h4>
            {perks.length > 0 ? (
              <ul className="text-xs text-muted-foreground space-y-1.5">
                {perks.map(perk => (
                  <li key={perk.id} className="flex items-start gap-2">
                    <span className="shrink-0">{perk.emoji || "🎁"}</span>
                    <span><span className="font-bold text-foreground">{perk.partner}</span> — {perk.offer}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exclusive offers from NEST partner businesses around Madrid — the first ones are on their way.
              </p>
            )}
          </div>

          {/* Community */}
          <div className="bg-accent/30 border border-border/50 rounded-2xl p-4 text-center space-y-1.5">
            <Sparkles size={16} className="text-primary mx-auto" />
            <p className="font-display text-base text-foreground">Be part of your own little corner of Madrid.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Meet new girls, make plans, discover new places, and become part of an exclusive NEST community.
            </p>
          </div>

          {paymentError && (
            <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-xl text-[11px] leading-normal">
              {paymentError}
            </div>
          )}
        </div>

        {/* Footer — the dormant checkout stays exactly as before payments */}
        <div className="px-6 py-4 border-t border-border/40 shrink-0 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {stripeReady ? (
            <>
              <button
                onClick={onStartCheckout}
                disabled={isRedirecting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 rounded-2xl transition shadow-pop disabled:opacity-60 disabled:shadow-none"
              >
                {isRedirecting ? "Opening secure checkout…" : "Continue to secure checkout"}
              </button>
              <p className="text-[10px] text-muted-foreground text-center leading-normal">
                {PREMIUM_RENEWAL_NOTE} Payment is handled by Stripe on a secure page — card details never touch NEST.
              </p>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold py-3 rounded-2xl transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Crown size={13} className="text-rose-300" />
              <span>Got it — see you at an outing</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
