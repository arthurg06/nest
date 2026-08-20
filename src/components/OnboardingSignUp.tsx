import React, { useState, useRef } from "react";
import { UserProfile } from "../types";
import { PREDEFINED_INTEREST_OPTIONS } from "../data";
import { ANIMAL_EMOJI } from "../../shared/compatibility";
import { ShieldCheck, ArrowRight, Lock, Mail, Globe, Check, Search } from "lucide-react";
import UniversitySelect from "./UniversitySelect";
import { ImageUploader } from "./ImageUploader";
import { searchCountries } from "../../shared/countries";
import { apiUrl } from "../lib/api";
import { ForgotPassword, ResetPassword } from "./PasswordRecovery";

interface OnboardingSignUpProps {
  onAuthSuccess: (token: string, user: any, profile: UserProfile) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Unauthenticated experience: a minimal welcome page that branches into
// Log In or the four-page sign-up flow (account → about you → interests →
// profile setup). The last page collects what a complete NEST profile
// requires — photo, bio, nationalities — so nobody enters the deck empty.
// All steps live in one component so entered data survives Back/Continue.
export default function OnboardingSignUp({ onAuthSuccess }: OnboardingSignUpProps) {
  const [view, setView] = useState<"welcome" | "login" | "signup">("welcome");

  // A reset link lands on "/?reset=<token>", so recovery is reachable without
  // a session and without a second app.
  const resetToken = new URLSearchParams(window.location.search).get("reset");
  const [recoveryView, setRecoveryView] = useState<"none" | "forgot" | "reset">(resetToken ? "reset" : "none");

  const leaveRecovery = () => {
    setRecoveryView("none");
    setView("login");
    if (resetToken) {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stepBodyRef = useRef<HTMLDivElement>(null);

  // The error banner lives at the top of the scrolling step body while the
  // buttons are in a fixed footer, so without this the member sees nothing
  // happen when a rule blocks her.
  const reportError = (message: string) => {
    setError(message);
    window.setTimeout(() => stepBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup inputs — kept in component state across steps so nothing is lost
  // when she navigates backward.
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [university, setUniversity] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [animals, setAnimals] = useState("");
  const [spendingStyle] = useState("middle range baddie");

  // Profile setup (step 4) — required before the account is created
  const [photo, setPhoto] = useState("");
  const [bio, setBio] = useState("");
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  const handleToggleActivity = (act: string) => {
    setSelectedActivities(prev =>
      prev.includes(act) ? prev.filter(x => x !== act) : [...prev, act]
    );
  };

  const handleTogglePresetNationality = (countryName: string, flag: string) => {
    const formatted = `${countryName} ${flag}`;
    setSelectedNationalities(prev =>
      prev.includes(formatted) ? prev.filter(c => c !== formatted) : [...prev, formatted]
    );
  };

  const handleRemoveNationality = (formattedNat: string) => {
    setSelectedNationalities(prev => prev.filter(n => n !== formattedNat));
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      onAuthSuccess(data.token, data.user, data.profile);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!name.trim() || !email.trim() || !password) {
        reportError("Please fill out your Name, Email and Password.");
        return;
      }
      if (!EMAIL_RE.test(email.trim())) {
        reportError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        reportError("Password must be at least 6 characters.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!age.trim() || Number(age) < 18 || Number(age) > 35) {
        reportError("NEST is designed for university-aged students (18-35).");
        return;
      }
      if (!university.trim()) {
        reportError("Please select your university from the list.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Interests stay optional, exactly as before.
      setStep(4);
    }
  };

  const goBack = () => {
    setError("");
    if (step > 1) setStep(prev => prev - 1);
    else setView("welcome");
  };

  // The profile half of the sign-up request. Social handles remain optional
  // and are added afterwards from the profile page — the account is created
  // once, here, with the existing secure endpoint.
  const profileFields = () => ({
    name: name.trim(),
    age: Number(age) || 20,
    university: university.trim(),
    currentCity: "Madrid",
    nationality: selectedNationalities.join(", "),
    bio: bio.trim(),
    photo,
    interests: {
      // Only what she actually picked. Inventing tastes here meant her card
      // advertised music and habits she never chose, and compatibility
      // scored on them.
      activities: selectedActivities,
      music: [],
      social: [],
      lifestyle: [],
      spendingStyle: spendingStyle,
      animals: animals || undefined
    }
  });

  // Sign up submission. The profile-setup requirements gate account
  // creation: she cannot enter NEST with an empty card.
  const handleSubmitSignUp = async () => {
    setError("");
    if (!photo) {
      reportError("A profile photo is mandatory! Please upload an image from your device.");
      return;
    }
    if (!bio.trim()) {
      reportError("Please write a short bio to introduce yourself to other students!");
      return;
    }
    if (selectedNationalities.length === 0) {
      reportError("Please select at least one Nationality.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...profileFields()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sign Up failed");
      }

      onAuthSuccess(data.token, data.user, data.profile);
    } catch (err: any) {
      reportError(err.message || "Error creating your student account.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-card/60 border border-border rounded-xl px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card";

  const showWelcome = view === "welcome" && recoveryView === "none";

  return (
    <div className="min-h-screen bg-foreground/5 flex flex-col justify-between select-text px-4 py-8 relative">

      {/* Decorative ambient glow, contained in its own clipped layer so the
          oversized blur circles can never create horizontal page scroll */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-100/40 blur-3xl" />
      </div>

      {showWelcome ? (
        // WELCOME — identity plus the two actions, nothing else.
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in select-none">
          <img
            src="/icons/nest-logo.png"
            alt="NEST logo"
            className="w-28 h-28 rounded-[32px] shadow-xl mb-6"
          />
          <h1 className="font-display font-semibold tracking-tight text-foreground text-5xl lowercase">nest</h1>
          <span className="font-mono text-[10px] font-bold text-primary tracking-widest uppercase mt-1">Madrid</span>
          <p className="text-sm text-muted-foreground font-sans mt-5 max-w-xs leading-relaxed">
            A private club for international women studying in Madrid.
          </p>

          <div className="w-full max-w-xs mt-10 space-y-3">
            <button
              type="button"
              onClick={() => { setView("signup"); setError(""); }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-sm font-black py-3.5 rounded-2xl transition shadow-pop cursor-pointer"
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setView("login"); setError(""); }}
              className="w-full bg-card/60 border border-border hover:bg-card text-foreground font-sans text-sm font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header logo */}
          <div className="text-center max-w-md mx-auto mb-6 shrink-0 flex flex-col items-center">
            <button
              type="button"
              onClick={() => { setView("welcome"); setError(""); }}
              className="inline-flex items-center gap-2.5 mb-1.5 cursor-pointer"
              aria-label="Back to the welcome page"
            >
              <img src="/icons/nest-logo.png" alt="NEST logo" className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-border/25" />
              <div className="text-left">
                <span className="font-display font-semibold tracking-tight text-foreground text-3xl lowercase">nest</span>
                <span className="font-mono text-[9px] font-bold text-primary tracking-widest block -mt-1 uppercase">Madrid</span>
              </div>
            </button>
          </div>

          {/* Card container */}
          <div className="max-w-md w-full mx-auto bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/80 shadow-2xl overflow-hidden p-6 md:p-8 grow flex flex-col justify-between">

            {recoveryView !== "none" ? (
              recoveryView === "reset" && resetToken ? (
                <ResetPassword token={resetToken} onDone={leaveRecovery} />
              ) : (
                <ForgotPassword onBack={leaveRecovery} />
              )
            ) : view === "login" ? (
              // LOGIN SCREEN
              <form onSubmit={handleLoginSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Log In to Your NEST Account</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Welcome back! Access your private student profile.</p>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3.5 rounded-2xl text-xs font-medium animate-fade-in">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Personal Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-card/60 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-card/60 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:shadow-none text-primary-foreground font-sans text-xs font-black py-3 rounded-xl transition shadow-pop flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? "Authenticating..." : "Log In to NEST"}
                    <ArrowRight size={13} />
                  </button>

                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryView("forgot");
                        setError("");
                      }}
                      className="block w-full text-xs text-muted-foreground hover:text-foreground font-semibold py-2"
                    >
                      Forgot your password?
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setView("signup");
                        setError("");
                      }}
                      className="text-xs text-primary hover:text-primary font-semibold"
                    >
                      New to NEST? Create a student account
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              // SIGN UP — four simple pages: account, about you, interests,
              // profile setup.
              <div className="flex-1 flex flex-col justify-between">
                {/* Minimal progress indicator */}
                <div className="flex items-center justify-between pb-4 border-b border-border/60 shrink-0 select-none">
                  <span className="font-mono text-[10px] font-black tracking-widest text-primary uppercase">
                    {step} / 4
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(s => (
                      <span
                        key={s}
                        className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                          s === step ? "bg-primary w-10" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Scrollable step body. overflow-y:auto forces horizontal
                    clipping, so the scrollport is widened by the same amount as
                    its padding (-mx-2 + px-2): content stays aligned with the
                    header/footer while focus rings and borders keep 8px of
                    painting room instead of being cut at the edge. */}
                <div ref={stepBodyRef} className="py-6 grow overflow-y-auto max-h-[420px] md:max-h-[480px] -mx-2 px-2">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3.5 rounded-2xl text-xs font-medium mb-5 animate-fade-in">
                      ⚠️ {error}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Create your account</h3>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">Just the basics — you can complete your profile later.</p>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-name" className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Name</label>
                        <input
                          id="signup-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Maya Sterling"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-email" className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Personal Email</label>
                        <input
                          id="signup-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="yourname@domain.com"
                          className={inputClass}
                        />
                        <p className="text-[10px] text-muted-foreground leading-normal">Use the email you want to sign in with.</p>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-password" className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Create Password (Min 6 chars)</label>
                        <input
                          id="signup-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">About you</h3>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">Your age and where you study in Madrid.</p>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-age" className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Age</label>
                        <input
                          id="signup-age"
                          type="number"
                          required
                          min={18}
                          max={35}
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="20"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Madrid University</label>
                        <UniversitySelect value={university} onChange={setUniversity} />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Your interests</h3>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">Pick a few things you love — they power your matches.</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {PREDEFINED_INTEREST_OPTIONS.activities.slice(0, 10).map(act => {
                          const sel = selectedActivities.includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => handleToggleActivity(act)}
                              aria-pressed={sel}
                              className={`px-3 py-2 rounded-full text-[11px] font-bold transition ${
                                sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {act}
                            </button>
                          );
                        })}
                      </div>

                      {/* Animals — one pick, easy to answer */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">
                          Animals
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PREDEFINED_INTEREST_OPTIONS.animals.map(option => {
                            const sel = animals === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setAnimals(sel ? "" : option)}
                                aria-pressed={sel}
                                className={`px-3 py-2 rounded-full text-[11px] font-bold transition ${
                                  sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {ANIMAL_EMOJI[option]} {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Set up your profile</h3>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">A photo, a few words, and where you're from — then you're in.</p>
                      </div>

                      <div className="max-w-xs mx-auto">
                        <ImageUploader
                          value={photo}
                          onChange={(url) => setPhoto(url)}
                          onRemove={() => setPhoto("")}
                          label="Your Profile Photo"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-bio" className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Short Student Bio (Mandatory)</label>
                        <textarea
                          id="signup-bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          placeholder="e.g. Dual degree student at IE. Obsessed with art galleries, cute coffee shops, and looking for brunch buddies! xx"
                          className="w-full bg-card/60 border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                      </div>

                      {/* Nationalities Picker */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">
                          Nationalities 🗺️
                        </label>

                        <button
                          type="button"
                          onClick={(e) => {
                            const opening = !showNationalityDropdown;
                            setShowNationalityDropdown(opening);
                            // The panel opens inside the step scroller — bring
                            // the field to the top so the whole panel is in view.
                            if (opening) e.currentTarget.scrollIntoView({ block: "start", behavior: "smooth" });
                          }}
                          className="w-full bg-card/60 border border-border hover:border-border rounded-xl px-3.5 py-3 text-sm text-foreground font-medium flex items-center justify-between transition"
                        >
                          <span>Select Nationalities</span>
                          <Globe size={14} className="text-muted-foreground" />
                        </button>

                        {selectedNationalities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedNationalities.map(nat => (
                              <span key={nat} className="bg-slate-900 text-rose-300 font-sans text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <span>{nat}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveNationality(nat); }} className="text-white hover:text-rose-200 font-extrabold text-[10px] ml-0.5 p-2 -m-1.5 inline-flex items-center justify-center" aria-label="Remove">✕</button>
                              </span>
                            ))}
                          </div>
                        )}

                        {showNationalityDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border/60 rounded-2xl shadow-xl p-3.5 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Search Countries</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNationalityDropdown(false);
                                  setNationalitySearch("");
                                }}
                                className="text-[10px] font-extrabold text-primary hover:text-primary uppercase"
                              >
                                Close
                              </button>
                            </div>

                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Type to search country..."
                                value={nationalitySearch}
                                onChange={(e) => setNationalitySearch(e.target.value)}
                                className="w-full bg-card border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none"
                              />
                              <Search size={12} className="text-muted-foreground absolute left-2.5 top-2.5" />
                            </div>

                            <div className="max-h-40 overflow-y-auto space-y-0.5 -mx-1.5 px-1.5">
                              {searchCountries(nationalitySearch).map(opt => {
                                const formatted = `${opt.name} ${opt.flag}`;
                                const isSelected = selectedNationalities.includes(formatted);
                                return (
                                  <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => handleTogglePresetNationality(opt.name, opt.flag)}
                                    className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                                      isSelected
                                        ? "bg-accent/30 text-primary font-bold"
                                        : "hover:bg-muted/60 text-foreground"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span>{opt.flag}</span>
                                      <span>{opt.name}</span>
                                    </span>
                                    {isSelected && <Check size={12} className="text-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer controls */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between shrink-0 select-none">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                  >
                    Back
                  </button>

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-slate-900 hover:bg-slate-800 text-rose-300 font-sans text-xs font-black px-5 py-2.5 rounded-xl transition shadow-pop flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitSignUp}
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:shadow-none text-primary-foreground font-sans text-xs font-black px-6 py-2.5 rounded-xl transition shadow-pop flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                      <span>{loading ? "Registering account..." : "Complete Sign Up"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* Safety Badge */}
      <div className="max-w-md mx-auto text-center mt-6 select-none shrink-0">
        <div className="inline-flex items-center gap-1.5 text-primary bg-accent/30 border border-border/50 px-3.5 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
          <ShieldCheck size={12} className="fill-rose-100" />
          <span>Women only · Every member verified</span>
        </div>
      </div>
    </div>
  );
}
