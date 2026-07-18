import React, { useState } from "react";
import { UserProfile, Interests } from "../types";
import { PREDEFINED_INTEREST_OPTIONS } from "../data";
import { Sparkles, ShieldCheck, GraduationCap, Globe, MessageCircle, Heart, Film, ArrowRight, User, Check, Lock, Mail, Instagram, Search } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { searchCountries } from "../../shared/countries";
import { apiUrl } from "../lib/api";

interface OnboardingSignUpProps {
  onAuthSuccess: (token: string, user: any, profile: UserProfile) => void;
}

const PRESET_PHOTOS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80"
];

export default function OnboardingSignUp({ onAuthSuccess }: OnboardingSignUpProps) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup inputs
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [university, setUniversity] = useState("");
  const [friendshipType, setFriendshipType] = useState("");
  const [bio, setBio] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [otherSocial, setOtherSocial] = useState("");
  const [photo, setPhoto] = useState("");

  // Interactive Nationalities State (Multiple selection support)
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  // Interactive Languages State with Fluency level
  const [languagesList, setLanguagesList] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedFluency, setSelectedFluency] = useState("Native");
  const [customLanguage, setCustomLanguage] = useState("");


  const COMMON_LANGUAGES = ["English", "Spanish", "French", "Italian", "German", "Japanese", "Korean", "Portuguese", "Chinese", "Arabic", "Russian"];
  const FLUENCY_LEVELS = ["Native", "Fluent", "Conversational", "Learning / Beginner"];

  const handleTogglePresetNationality = (countryName: string, flag: string) => {
    const formatted = `${countryName} ${flag}`;
    setSelectedNationalities(prev => {
      if (prev.includes(formatted)) {
        return prev.filter(c => c !== formatted);
      } else {
        return [...prev, formatted];
      }
    });
  };

  const handleAddLanguage = () => {
    const lang = customLanguage.trim() || selectedLanguage;
    if (!lang) return;
    const formatted = `${lang} (${selectedFluency})`;
    if (!languagesList.includes(formatted)) {
      setLanguagesList(prev => [...prev, formatted]);
    }
    setCustomLanguage("");
  };

  const handleRemoveLanguage = (formattedLang: string) => {
    setLanguagesList(prev => prev.filter(l => l !== formattedLang));
  };

  const handleRemoveNationality = (formattedNat: string) => {
    setSelectedNationalities(prev => prev.filter(n => n !== formattedNat));
  };

  // Interests state
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [selectedSocial, setSelectedSocial] = useState<string[]>([]);
  const [selectedLifestyle, setSelectedLifestyle] = useState<string[]>([]);
  const [spendingStyle, setSpendingStyle] = useState("middle range baddie");

  const handleToggleActivity = (act: string) => {
    setSelectedActivities(prev =>
      prev.includes(act) ? prev.filter(x => x !== act) : [...prev, act]
    );
  };

  const handleToggleMusic = (mus: string) => {
    setSelectedMusic(prev =>
      prev.includes(mus) ? prev.filter(x => x !== mus) : [...prev, mus]
    );
  };

  const handleToggleSocial = (soc: string) => {
    setSelectedSocial(prev =>
      prev.includes(soc) ? prev.filter(x => x !== soc) : [...prev, soc]
    );
  };

  const handleToggleLifestyle = (life: string) => {
    setSelectedLifestyle(prev =>
      prev.includes(life) ? prev.filter(x => x !== life) : [...prev, life]
    );
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
      if (!email.trim() || !password.trim() || !name.trim() || !age.trim() || selectedNationalities.length === 0 || !university.trim()) {
        setError("Please fill out Email, Password, Name, Age, University and select at least one Nationality.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (Number(age) < 18 || Number(age) > 35) {
        setError("NEST is designed for university-aged students (18-35).");
        return;
      }
      if (languagesList.length === 0) {
        setError("Please add at least one language you speak with its fluency level.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!photo) {
        setError("A profile photo is mandatory! Please upload an image from your device.");
        return;
      }
      setStep(3);
    }
  };

  // Sign up submission
  const handleSubmitSignUp = async () => {
    setError("");
    if (!bio.trim()) {
      setError("Please write a short bio to introduce yourself to other students!");
      return;
    }

    const finalPhoto = photo;
    const finalNationality = selectedNationalities.join(", ");

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          age: Number(age) || 20,
          nationality: finalNationality,
          university: university.trim(),
          currentCity: "Madrid",
          languages: languagesList,
          personalityType: "",
          friendshipType: friendshipType.trim() || "Cafe & shopping companion",
          bio: bio.trim(),
          photo: finalPhoto,
          tiktok: tiktok.trim() || undefined,
          instagram: instagram.trim() || undefined,
          otherSocial: otherSocial.trim() || undefined,
          interests: {
            activities: selectedActivities.length > 0 ? selectedActivities : ["yoga", "art"],
            music: selectedMusic.length > 0 ? selectedMusic : ["pop", "indie"],
            social: selectedSocial.length > 0 ? selectedSocial : ["cafes", "brunch"],
            lifestyle: selectedLifestyle.length > 0 ? selectedLifestyle : ["wellness"],
            spendingStyle: spendingStyle
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sign Up failed");
      }

      onAuthSuccess(data.token, data.user, data.profile);
    } catch (err: any) {
      setError(err.message || "Error creating your student account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foreground/5 flex flex-col justify-between select-text px-4 py-8 relative">
      
      {/* Decorative ambient glow, contained in its own clipped layer so the
          oversized blur circles can never create horizontal page scroll */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-100/40 blur-3xl" />
      </div>

      {/* Header logo */}
      <div className="text-center max-w-md mx-auto mb-6 shrink-0 flex flex-col items-center">
        <div className="inline-flex items-center gap-2.5 mb-1.5">
          <img src="/icons/nest-192.png" alt="NEST logo" className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-border/25" />
          <div className="text-left">
            <span className="font-display font-semibold tracking-tight text-foreground text-3xl lowercase">nest</span>
            <span className="font-mono text-[9px] font-bold text-primary tracking-widest block -mt-1 uppercase">Madrid</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-sans mt-1">
          A private club for international women studying in Madrid.
        </p>
      </div>

      {/* Card container */}
      <div className="max-w-md w-full mx-auto bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/80 shadow-2xl overflow-hidden p-6 md:p-8 grow flex flex-col justify-between">
        
        {isLoginMode ? (
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
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
          // SIGN UP MULTI-STEP FLOW
          <div className="flex-1 flex flex-col justify-between">
            {/* Step indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60 shrink-0 select-none">
              <span className="font-mono text-[10px] font-black tracking-widest text-primary uppercase">
                Step {step} of 3
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(s => (
                  <span
                    key={s}
                    className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                      s === step ? "bg-primary w-10" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content body */}
            {/* Scrollable step body. overflow-y:auto forces horizontal
                clipping, so the scrollport is widened by the same amount as
                its padding (-mx-2 + px-2): content stays aligned with the
                header/footer while focus rings and borders keep 8px of
                painting room instead of being cut at the edge. */}
            <div className="py-6 grow overflow-y-auto max-h-[420px] md:max-h-[480px] -mx-2 px-2">
              {error && (
                <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3.5 rounded-2xl text-xs font-medium mb-5 animate-fade-in">
                  ⚠️ {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Create Your NEST Account</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Enter your student details to set up your private account.</p>
                  </div>

                  {/* Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Personal Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full bg-card/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                      <p className="text-[10px] text-muted-foreground leading-normal">Use the email you want to sign in with.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Password (Min 6 chars)</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-card/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">First & Last Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maya Sterling"
                      className="w-full bg-card/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                    />
                  </div>

                  {/* Age & University */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Age</label>
                      <input
                        type="number"
                        required
                        min={18}
                        max={35}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="20"
                        className="w-full bg-card/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Madrid University</label>
                      <input
                        type="text"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="e.g. IE University"
                        className="w-full bg-card/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-card"
                      />
                    </div>
                  </div>

                  {/* Nationalities Picker */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">
                      Nationalities 🗺️
                    </label>

                    {/* Single Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        const opening = !showNationalityDropdown;
                        setShowNationalityDropdown(opening);
                        // The panel opens inside the step scroller — bring the
                        // field to the top so the whole panel is in view.
                        if (opening) e.currentTarget.scrollIntoView({ block: "start", behavior: "smooth" });
                      }}
                      className="w-full bg-card/60 border border-border hover:border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground font-medium flex items-center justify-between transition"
                    >
                      <span>Select Nationalities</span>
                      <Globe size={14} className="text-muted-foreground" />
                    </button>

                    {/* Selected Nationalities Tags */}
                    {selectedNationalities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedNationalities.map(nat => (
                          <span key={nat} className="bg-slate-900 text-rose-400 font-sans text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <span>{nat}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveNationality(nat); }} className="text-white hover:text-rose-300 font-extrabold text-[10px] ml-0.5 p-2 -m-1.5 inline-flex items-center justify-center" aria-label="Remove">✕</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Searchable Pop-up / Modal / Dropdown */}
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

                        {/* Search Input inside the pop-up only */}
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

                        {/* Complete list of countries with flag emojis inside pop-up */}
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

                  {/* Languages Picker */}
                  <div className="space-y-1.5 bg-accent/20 p-3 rounded-2xl border border-border/30">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">
                      Languages & Fluency Levels 🗣️
                    </label>

                    {languagesList.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {languagesList.map(item => (
                          <span key={item} className="bg-primary text-primary-foreground font-sans text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>{item}</span>
                            <button type="button" onClick={() => handleRemoveLanguage(item)} className="text-white font-extrabold text-[8px] ml-0.5 p-2 -m-1.5 inline-flex items-center justify-center" aria-label="Remove">✕</button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic block mb-1">Add languages below:</span>
                    )}

                    <div className="grid grid-cols-3 gap-1.5">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          setSelectedLanguage(e.target.value);
                          setCustomLanguage("");
                        }}
                        className="bg-card border border-border rounded-lg px-1.5 py-1 text-[10px] text-foreground focus:outline-none"
                      >
                        {COMMON_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>

                      <select
                        value={selectedFluency}
                        onChange={(e) => setSelectedFluency(e.target.value)}
                        className="bg-card border border-border rounded-lg px-1.5 py-1 text-[10px] text-foreground focus:outline-none"
                      >
                        {FLUENCY_LEVELS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleAddLanguage}
                        className="bg-primary text-primary-foreground font-sans text-[10px] font-black py-1 rounded-lg hover:bg-primary/90 transition"
                      >
                        ＋ Add
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Or other language (e.g. Swedish)..."
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-2 py-1 text-[9px] mt-1.5 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 animate-fade-in text-center">
                  <div>
                    <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Upload Your Portrait</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Please upload a real portrait photo from your device. Placeholders are not allowed.</p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <ImageUploader
                      value={photo}
                      onChange={(url) => setPhoto(url)}
                      onRemove={() => setPhoto("")}
                      label="Your Profile Photo"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Introduce Yourself!</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">Let your future friends know who you are.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Short Student Bio (Mandatory)</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="e.g. Dual degree student at IE. Obsessed with art galleries, cute coffee shops, and looking for brunch buddies! xx"
                      className="w-full bg-card/60 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none resize-none"
                    />
                  </div>

                  {/* Social handles */}
                  <div className="bg-muted/40 p-3 rounded-2xl border border-border/60 space-y-3.5">
                    <span className="text-[10px] font-mono font-extrabold text-muted-foreground uppercase tracking-wider block">
                      Social Media Handles (Optional)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-extrabold text-muted-foreground block">Instagram Handle</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-[10px] text-muted-foreground font-bold">@</span>
                          <input
                            type="text"
                            placeholder="username"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-extrabold text-muted-foreground block">TikTok Handle</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-[10px] text-muted-foreground font-bold">@</span>
                          <input
                            type="text"
                            placeholder="username"
                            value={tiktok}
                            onChange={(e) => setTiktok(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-sans font-extrabold text-muted-foreground block">Other Social (Snapchat, Twitter, etc)</label>
                      <input
                        type="text"
                        placeholder="e.g. Snapchat: maya_madrid"
                        value={otherSocial}
                        onChange={(e) => setOtherSocial(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-sans font-extrabold text-muted-foreground block">Friendship style you seek</label>
                    <input
                      type="text"
                      placeholder="e.g. Brunch & pilates buddy"
                      value={friendshipType}
                      onChange={(e) => setFriendshipType(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  {/* Interests pickers */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase block">Select some interests & hobbies</span>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {PREDEFINED_INTEREST_OPTIONS.activities.slice(0, 10).map(act => {
                          const sel = selectedActivities.includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => handleToggleActivity(act)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {act}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer controls */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between shrink-0 select-none">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError("");
                  }}
                  className="text-xs font-bold text-primary hover:text-primary transition"
                >
                  Have an account? Log In
                </button>
              )}

              {step < 3 ? (
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
                  <span>{loading ? "Registering account..." : "Complete Student Sign Up"}</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

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
