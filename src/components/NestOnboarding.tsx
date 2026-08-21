import React, { useState } from "react";
import { Share, MoreVertical, MonitorDown, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import {
  isIOS,
  isAndroid,
  isStandalone,
  enablePushNotifications,
  promptNativeInstall,
  canPromptNativeInstall
} from "../lib/push";

interface NestOnboardingProps {
  /** Which steps still need showing (the parent gates on the stored flags). */
  startAt: "install" | "notify";
  onFinished: () => void;
}

export const ONBOARD_INSTALL_KEY = "nest_onboard_install";
export const ONBOARD_NOTIFY_KEY = "nest_onboard_notify";

type Platform = "ios" | "android" | "desktop";

const detectPlatform = (): Platform => (isIOS() ? "ios" : isAndroid() ? "android" : "desktop");

// Numbered, scannable installation steps per platform. Only what the
// platform's browser actually offers — nothing generic.
const PLATFORM_STEPS: Record<Platform, { label: string; steps: React.ReactNode[] }> = {
  ios: {
    label: "iPhone / iPad — Safari",
    steps: [
      <>Tap the <strong className="text-foreground">Share</strong> button <Share size={12} className="inline text-primary -mt-0.5" /> at the bottom of Safari</>,
      <>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></>,
      <>Tap <strong className="text-foreground">"Add"</strong></>,
      <>NEST now lives on your Home Screen 🪺</>
    ]
  },
  android: {
    label: "Android — Chrome",
    steps: [
      <>Tap the <strong className="text-foreground">⋮ menu</strong> <MoreVertical size={12} className="inline text-primary -mt-0.5" /> in the top-right corner of Chrome</>,
      <>Tap <strong className="text-foreground">"Add to Home screen"</strong> or <strong className="text-foreground">"Install app"</strong></>,
      <>Tap <strong className="text-foreground">"Add"</strong> or <strong className="text-foreground">"Install"</strong></>,
      <>NEST now lives on your Home Screen 🪺</>
    ]
  },
  desktop: {
    label: "Computer — Chrome / Edge",
    steps: [
      <>Open NEST in a supported browser (Chrome or Edge)</>,
      <>Look for the <strong className="text-foreground">Install icon</strong> <MonitorDown size={12} className="inline text-primary -mt-0.5" /> in the address bar, if available</>,
      <>Click it and select <strong className="text-foreground">"Install"</strong></>,
      <>NEST opens as its own app on your computer</>
    ]
  }
};

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="text-left bg-muted/40 border border-border/50 rounded-2xl p-4 space-y-2.5">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-accent/50 text-primary border border-border/60 flex items-center justify-center shrink-0 font-sans text-[11px] font-black select-none">
            {i + 1}
          </span>
          <span className="font-sans text-xs text-muted-foreground leading-snug pt-1">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// First-open onboarding: one calm step inviting her to put NEST on her Home
// Screen — numbered instructions for the detected device, the browser's own
// install sheet when it offers one, other platforms behind a small
// expander — then one step asking about notifications, whose real browser
// permission dialog appears only after she taps Enable. Each step is
// remembered per device and never nags again. (The parent never renders
// this at all when NEST is already running as an installed app.)
export default function NestOnboarding({ startAt, onFinished }: NestOnboardingProps) {
  const [step, setStep] = useState<"install" | "notify">(startAt);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  const platform = detectPlatform();
  const others = (Object.keys(PLATFORM_STEPS) as Platform[]).filter(p => p !== platform);

  const finishInstall = () => {
    localStorage.setItem(ONBOARD_INSTALL_KEY, "done");
    setStep("notify");
  };

  const finishAll = () => {
    localStorage.setItem(ONBOARD_INSTALL_KEY, "done");
    localStorage.setItem(ONBOARD_NOTIFY_KEY, "done");
    onFinished();
  };

  const handleNativeInstall = async () => {
    await promptNativeInstall();
    // Whether she installed or closed the browser's sheet, the step is done.
    finishInstall();
  };

  const handleEnableNotifications = async () => {
    setBusy(true);
    const result = await enablePushNotifications();
    setBusy(false);
    if (result.ok) {
      setNotifyResult("You're all set — NEST will keep you posted 💌");
    } else if (result.reason === "denied") {
      setNotifyResult("Notifications are blocked for NEST in your browser settings. You can change that anytime.");
    } else if (result.reason === "unconfigured") {
      setNotifyResult("Notifications aren't switched on for NEST just yet — check back soon.");
    } else if (result.reason === "unsupported") {
      setNotifyResult("This browser doesn't support notifications. They'll work from your phone's Home Screen app.");
    } else {
      setNotifyResult("Something went wrong — you can try again later from your profile settings.");
    }
  };

  const iosNotStandalone = isIOS() && !isStandalone();

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={step === "install" ? "Add NEST to your Home Screen" : "NEST notifications"}
    >
      <div className="bg-card w-full md:max-w-sm max-h-[92vh] rounded-t-[32px] md:rounded-[32px] border-t md:border border-border/70 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 text-center">
          {step === "install" ? (
            <>
              <img src="/icons/nest-logo.png" alt="NEST" className="w-16 h-16 rounded-2xl mx-auto shadow-lg" />
              <div className="space-y-1">
                <h3 className="font-sans font-black text-lg text-foreground leading-tight">
                  Add NEST to your Home Screen 🪺
                </h3>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  NEST feels best as an app — your nest, one tap away.
                </p>
              </div>

              {canPromptNativeInstall() ? (
                <>
                  {/* The browser offers its real install sheet — one tap,
                      no manual steps needed. */}
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
                  >
                    Add NEST
                  </button>
                  <p className="font-sans text-[10px] text-muted-foreground leading-normal">
                    Your browser will ask to install NEST — that's all it takes.
                  </p>
                </>
              ) : (
                <StepList steps={PLATFORM_STEPS[platform].steps} />
              )}

              {/* Other platforms, tucked away until asked for */}
              <button
                type="button"
                onClick={() => setShowOthers(v => !v)}
                className="inline-flex items-center gap-1 font-sans text-[11px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <Smartphone size={12} />
                <span>Other devices</span>
                {showOthers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showOthers && (
                <div className="space-y-3 animate-fade-in">
                  {(canPromptNativeInstall() ? (Object.keys(PLATFORM_STEPS) as Platform[]) : others).map(p => (
                    <div key={p} className="space-y-1.5">
                      <p className="font-mono text-[9px] font-black uppercase tracking-widest text-primary text-left">
                        {PLATFORM_STEPS[p].label}
                      </p>
                      <StepList steps={PLATFORM_STEPS[p].steps} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {!canPromptNativeInstall() && (
                  <button
                    type="button"
                    onClick={finishInstall}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
                  >
                    Done — NEST is on my Home Screen
                  </button>
                )}
                <button
                  type="button"
                  onClick={finishInstall}
                  className="w-full font-sans text-xs font-bold text-muted-foreground hover:text-foreground py-2.5 transition cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-4xl block select-none">💌</span>
              <div className="space-y-1">
                <h3 className="font-sans font-black text-lg text-foreground leading-tight">Stay in the loop 💌</h3>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  Get notified when you get a new message, match, like, or when your next NEST outing is coming up.
                </p>
              </div>

              {notifyResult ? (
                <>
                  <p className="font-sans text-xs text-foreground bg-accent/30 border border-border/50 rounded-2xl p-3.5 leading-relaxed">
                    {notifyResult}
                  </p>
                  <button
                    type="button"
                    onClick={finishAll}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
                  >
                    Enter NEST
                  </button>
                </>
              ) : iosNotStandalone ? (
                <>
                  <p className="font-sans text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-2xl p-3.5 leading-relaxed text-left">
                    On iPhone, notifications work once NEST lives on your Home Screen. Add NEST first, then turn
                    notifications on anytime from your profile settings.
                  </p>
                  <button
                    type="button"
                    onClick={finishAll}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
                  >
                    Got it
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={busy}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
                  >
                    {busy ? "One moment…" : "Enable Notifications"}
                  </button>
                  <button
                    type="button"
                    onClick={finishAll}
                    className="w-full font-sans text-xs font-bold text-muted-foreground hover:text-foreground py-2.5 transition cursor-pointer"
                  >
                    Maybe later
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
