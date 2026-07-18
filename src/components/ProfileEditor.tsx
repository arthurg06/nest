import React, { useState, useEffect } from "react";
import { UserProfile, Interests } from "../types";
import { PREDEFINED_INTEREST_OPTIONS } from "../data";
import { ShieldCheck, User, Sparkles, Languages, Check, Mail, Upload, FileText, Globe, Search, Trash2, Edit, MapPin, ExternalLink, ShieldAlert } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

interface ProfileEditorProps {
  currentUser: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onDeleteRecommendation?: (id: string) => Promise<boolean>;
  onSignOut: () => void;
  onRefreshProfile: () => void;
}

export default function ProfileEditor({ currentUser, onSaveProfile, onDeleteRecommendation, onSignOut, onRefreshProfile }: ProfileEditorProps) {
  // Personal recommendations/spots management state
  const [myRecs, setMyRecs] = useState<any[]>([]);
  const [isLoadingMyRecs, setIsLoadingMyRecs] = useState(false);
  const [editingRec, setEditingRec] = useState<any | null>(null);

  // Form states for editing a recommendation
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCategory, setEditCategory] = useState<"cafe" | "restaurant" | "study" | "activity" | "hidden_gem">("cafe");
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState("");
  const [editTags, setEditTags] = useState("");

  // Account self-deletion state (requires typing DELETE to confirm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyRecommendations = async () => {
    setIsLoadingMyRecs(true);
    try {
      const res = await fetch("/api/recommendations", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter by authorId matching current user
        setMyRecs(data.filter((r: any) => r.authorId === currentUser.userId || r.authorId === currentUser.id));
      }
    } catch (err) {
      console.error("Error loading my spots:", err);
    } finally {
      setIsLoadingMyRecs(false);
    }
  };

  useEffect(() => {
    fetchMyRecommendations();
  }, [currentUser.id]);

  const handleDeleteMyRec = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete secret spot "${name}"?`)) {
      return;
    }
    if (onDeleteRecommendation) {
      const success = await onDeleteRecommendation(id);
      if (success) {
        alert("Recommendation deleted successfully!");
        fetchMyRecommendations();
      }
    } else {
      try {
        const res = await fetch(`/api/recommendations/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
          }
        });
        if (res.ok) {
          alert("Recommendation deleted successfully!");
          fetchMyRecommendations();
        } else {
          alert("Failed to delete recommendation.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStartEdit = (rec: any) => {
    setEditingRec(rec);
    setEditName(rec.name);
    setEditDesc(rec.description);
    setEditAddress(rec.address);
    setEditCategory(rec.category);
    setEditGoogleMapsUrl(rec.googleMapsUrl || "");
    setEditTags(rec.userTags.join(", "));
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editDesc.trim() || !editAddress.trim()) {
      alert("Please fill out name, description and address!");
      return;
    }
    try {
      const res = await fetch(`/api/recommendations/${editingRec.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          address: editAddress.trim(),
          category: editCategory,
          googleMapsUrl: editGoogleMapsUrl.trim(),
          userTags: editTags.split(",").map(t => t.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        alert("Secret Spot updated successfully!");
        setEditingRec(null);
        fetchMyRecommendations();
      } else {
        alert("Failed to update spot.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        alert("Your account and all associated data have been permanently deleted.");
        localStorage.removeItem("nest_token");
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete account. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during account deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Local states matching user profile
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState(currentUser.age);
  const [university, setUniversity] = useState(currentUser.university);
  const [friendshipType, setFriendshipType] = useState(currentUser.friendshipType);
  const [bio, setBio] = useState(currentUser.bio);
  const [tiktok, setTiktok] = useState(currentUser.tiktok || "");
  const [instagram, setInstagram] = useState(currentUser.instagram || "");
  const [otherSocial, setOtherSocial] = useState(currentUser.otherSocial || "");

  // Interactive Multiple Nationalities
  const initialNationalities = currentUser.nationality
    ? currentUser.nationality.split(", ").map(n => n.trim()).filter(Boolean)
    : [];
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>(initialNationalities);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

  // Interactive Languages with Fluency levels
  const [languagesList, setLanguagesList] = useState<string[]>(currentUser.languages || []);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedFluency, setSelectedFluency] = useState("Native");
  const [customLanguage, setCustomLanguage] = useState("");

  const ALL_COUNTRIES = [
    { name: "Afghanistan", flag: "🇦🇫" },
    { name: "Albania", flag: "🇦🇱" },
    { name: "Algeria", flag: "🇩🇿" },
    { name: "Andorra", flag: "🇦🇩" },
    { name: "Angola", flag: "🇦🇴" },
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Armenia", flag: "🇦🇲" },
    { name: "Australia", flag: "🇦🇺" },
    { name: "Austria", flag: "🇦🇹" },
    { name: "Azerbaijan", flag: "🇦🇿" },
    { name: "Bahamas", flag: "🇧🇸" },
    { name: "Bahrain", flag: "🇧🇭" },
    { name: "Bangladesh", flag: "🇧🇩" },
    { name: "Barbados", flag: "🇧🇧" },
    { name: "Belarus", flag: "🇧🇾" },
    { name: "Belgium", flag: "🇧🇪" },
    { name: "Belize", flag: "🇧🇿" },
    { name: "Benin", flag: "🇧🇯" },
    { name: "Bhutan", flag: "🇧🇹" },
    { name: "Bolivia", flag: "🇧🇴" },
    { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
    { name: "Botswana", flag: "🇧🇼" },
    { name: "Brazil", flag: "🇧🇷" },
    { name: "Brunei", flag: "🇧🇳" },
    { name: "Bulgaria", flag: "🇧🇬" },
    { name: "Burkina Faso", flag: "🇧🇫" },
    { name: "Burundi", flag: "🇧🇮" },
    { name: "Cabo Verde", flag: "🇨🇻" },
    { name: "Cambodia", flag: "🇰🇭" },
    { name: "Cameroon", flag: "🇨🇲" },
    { name: "Canada", flag: "🇨🇦" },
    { name: "Central African Republic", flag: "🇨🇫" },
    { name: "Chad", flag: "🇹🇩" },
    { name: "Chile", flag: "🇨🇱" },
    { name: "China", flag: "🇨🇳" },
    { name: "Colombia", flag: "🇨🇴" },
    { name: "Comoros", flag: "🇰🇲" },
    { name: "Congo", flag: "🇨🇬" },
    { name: "Costa Rica", flag: "🇨🇷" },
    { name: "Croatia", flag: "🇭🇷" },
    { name: "Cuba", flag: "🇨🇺" },
    { name: "Cyprus", flag: "🇨🇾" },
    { name: "Czechia", flag: "🇨🇿" },
    { name: "Denmark", flag: "🇩🇰" },
    { name: "Djibouti", flag: "🇩🇯" },
    { name: "Dominica", flag: "🇩🇲" },
    { name: "Dominican Republic", flag: "🇩🇴" },
    { name: "Ecuador", flag: "🇪🇨" },
    { name: "Egypt", flag: "🇪🇬" },
    { name: "El Salvador", flag: "🇸🇻" },
    { name: "Equatorial Guinea", flag: "🇬🇶" },
    { name: "Eritrea", flag: "🇪🇷" },
    { name: "Estonia", flag: "🇪🇪" },
    { name: "Eswatini", flag: "🇸🇿" },
    { name: "Ethiopia", flag: "🇪🇹" },
    { name: "Fiji", flag: "🇫🇯" },
    { name: "Finland", flag: "🇫🇮" },
    { name: "France", flag: "🇫🇷" },
    { name: "Gabon", flag: "🇬🇦" },
    { name: "Gambia", flag: "🇬🇲" },
    { name: "Georgia", flag: "🇬🇪" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "Ghana", flag: "🇬🇭" },
    { name: "Greece", flag: "🇬🇷" },
    { name: "Grenada", flag: "🇬🇩" },
    { name: "Guatemala", flag: "🇬🇹" },
    { name: "Guinea", flag: "🇬🇳" },
    { name: "Guyana", flag: "🇬🇾" },
    { name: "Haiti", flag: "🇭🇹" },
    { name: "Honduras", flag: "🇭🇳" },
    { name: "Hungary", flag: "🇭🇺" },
    { name: "Iceland", flag: "🇮🇸" },
    { name: "India", flag: "🇮🇳" },
    { name: "Indonesia", flag: "🇮🇩" },
    { name: "Iran", flag: "🇮🇷" },
    { name: "Iraq", flag: "🇮🇶" },
    { name: "Ireland", flag: "🇮🇪" },
    { name: "Israel", flag: "🇮🇱" },
    { name: "Italy", flag: "🇮🇹" },
    { name: "Jamaica", flag: "🇯🇲" },
    { name: "Japan", flag: "🇯🇵" },
    { name: "Jordan", flag: "🇯🇴" },
    { name: "Kazakhstan", flag: "🇰🇿" },
    { name: "Kenya", flag: "🇰🇪" },
    { name: "Korea, South", flag: "🇰🇷" },
    { name: "Kuwait", flag: "🇰🇼" },
    { name: "Latvia", flag: "🇱🇻" },
    { name: "Lebanon", flag: "🇱🇧" },
    { name: "Liberia", flag: "🇱🇷" },
    { name: "Libya", flag: "🇱🇾" },
    { name: "Liechtenstein", flag: "🇱🇮" },
    { name: "Lithuania", flag: "🇱🇹" },
    { name: "Luxembourg", flag: "🇱🇺" },
    { name: "Madagascar", flag: "🇲🇬" },
    { name: "Malawi", flag: "🇲🇼" },
    { name: "Malaysia", flag: "🇲🇾" },
    { name: "Maldives", flag: "🇲🇻" },
    { name: "Mali", flag: "🇲🇱" },
    { name: "Malta", flag: "🇲🇹" },
    { name: "Mauritania", flag: "🇲🇷" },
    { name: "Mauritius", flag: "🇲🇺" },
    { name: "Mexico", flag: "🇲🇽" },
    { name: "Moldova", flag: "🇲🇩" },
    { name: "Monaco", flag: "🇲🇨" },
    { name: "Mongolia", flag: "🇲🇳" },
    { name: "Montenegro", flag: "🇲🇪" },
    { name: "Morocco", flag: "🇲🇦" },
    { name: "Mozambique", flag: "🇲🇿" },
    { name: "Myanmar", flag: "🇲🇲" },
    { name: "Namibia", flag: "🇳🇦" },
    { name: "Nepal", flag: "🇳🇵" },
    { name: "Netherlands", flag: "🇳🇱" },
    { name: "New Zealand", flag: "🇳🇿" },
    { name: "Nicaragua", flag: "🇳🇮" },
    { name: "Niger", flag: "🇳🇪" },
    { name: "Nigeria", flag: "🇳🇬" },
    { name: "Norway", flag: "🇳🇴" },
    { name: "Oman", flag: "🇴🇲" },
    { name: "Pakistan", flag: "🇵🇰" },
    { name: "Panama", flag: "🇵🇦" },
    { name: "Paraguay", flag: "🇵🇾" },
    { name: "Peru", flag: "🇵🇪" },
    { name: "Philippines", flag: "🇵🇭" },
    { name: "Poland", flag: "🇵🇱" },
    { name: "Portugal", flag: "🇵🇹" },
    { name: "Qatar", flag: "🇶🇦" },
    { name: "Romania", flag: "🇷🇴" },
    { name: "Russia", flag: "🇷🇺" },
    { name: "Rwanda", flag: "🇷🇼" },
    { name: "Saudi Arabia", flag: "🇸🇦" },
    { name: "Senegal", flag: "🇸🇳" },
    { name: "Serbia", flag: "🇷🇸" },
    { name: "Singapore", flag: "🇸🇬" },
    { name: "Slovakia", flag: "🇸🇰" },
    { name: "Slovenia", flag: "🇸🇮" },
    { name: "Somalia", flag: "🇸🇴" },
    { name: "South Africa", flag: "🇿🇦" },
    { name: "Spain", flag: "🇪🇸" },
    { name: "Sri Lanka", flag: "🇱🇰" },
    { name: "Sudan", flag: "🇸🇩" },
    { name: "Sweden", flag: "🇸🇪" },
    { name: "Switzerland", flag: "🇨🇭" },
    { name: "Syria", flag: "🇸🇾" },
    { name: "Tajikistan", flag: "🇹🇯" },
    { name: "Tanzania", flag: "🇹🇿" },
    { name: "Thailand", flag: "🇹🇭" },
    { name: "Tunisia", flag: "🇹🇳" },
    { name: "Turkey", flag: "🇹🇷" },
    { name: "Uganda", flag: "🇺🇬" },
    { name: "Ukraine", flag: "🇺🇦" },
    { name: "United Arab Emirates", flag: "🇦🇪" },
    { name: "United Kingdom", flag: "🇬🇧" },
    { name: "United States", flag: "🇺🇸" },
    { name: "Uruguay", flag: "🇺🇾" },
    { name: "Uzbekistan", flag: "🇺🇿" },
    { name: "Venezuela", flag: "🇻🇪" },
    { name: "Vietnam", flag: "🇻🇳" },
    { name: "Yemen", flag: "🇾🇪" },
    { name: "Zambia", flag: "🇿🇲" },
    { name: "Zimbabwe", flag: "🇿🇼" }
  ];

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
  
  // Photo State
  const [photo, setPhoto] = useState<string>(currentUser.photo || "");

  // Interests state
  const [selectedActivities, setSelectedActivities] = useState<string[]>(currentUser.interests.activities);
  const [selectedMusic, setSelectedMusic] = useState<string[]>(currentUser.interests.music);
  const [selectedSocial, setSelectedSocial] = useState<string[]>(currentUser.interests.social);
  const [selectedLifestyle, setSelectedLifestyle] = useState<string[]>(currentUser.interests.lifestyle);
  const [spendingStyle, setSpendingStyle] = useState<string>(currentUser.interests.spendingStyle);

  // Verification state
  // Verification submission state. Status itself lives on the server —
  // submitting places the account in review; only an admin approves it.
  const verificationStatus = currentUser.verificationStatus || (currentUser.isVerified ? "approved" : "unsubmitted");
  const isVerified = verificationStatus === "approved";
  const [verUniversity, setVerUniversity] = useState(currentUser.verification?.university || currentUser.university || "");
  const [verEmail, setVerEmail] = useState(currentUser.verification?.universityEmail || "");
  const [verNote, setVerNote] = useState("");
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Toggle helpers
  const handleToggleActivity = (act: string) => {
    setSelectedActivities(prev => 
      prev.includes(act) ? prev.filter(item => item !== act) : [...prev, act]
    );
  };

  const handleToggleMusic = (mus: string) => {
    setSelectedMusic(prev => 
      prev.includes(mus) ? prev.filter(item => item !== mus) : [...prev, mus]
    );
  };

  const handleToggleSocial = (soc: string) => {
    setSelectedSocial(prev => 
      prev.includes(soc) ? prev.filter(item => item !== soc) : [...prev, soc]
    );
  };

  const handleToggleLifestyle = (life: string) => {
    setSelectedLifestyle(prev => 
      prev.includes(life) ? prev.filter(item => item !== life) : [...prev, life]
    );
  };

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });

  const showFeedback = (msg: string, type: "success" | "error") => {
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast({ message: "", type: null });
    }, 4000);
  };

  const handleSave = () => {
    if (selectedNationalities.length === 0) {
      showFeedback("Please select or add at least one Nationality!", "error");
      return;
    }
    if (languagesList.length === 0) {
      showFeedback("Please add at least one Language you speak!", "error");
      return;
    }

    const finalNationality = selectedNationalities.join(", ");

    const updatedProfile: UserProfile = {
      ...currentUser,
      name: name.trim() || "User",
      age: Number(age) || 20,
      nationality: finalNationality,
      university: university.trim() || "IE University",
      languages: languagesList,
      personalityType: "",
      friendshipType: friendshipType.trim() || "Outing planner",
      bio: bio.trim() || "Moving to Madrid!",
      isVerified: currentUser.isVerified,
      photo: photo,
      tiktok: tiktok.trim() || undefined,
      instagram: instagram.trim() || undefined,
      otherSocial: otherSocial.trim() || undefined,
      interests: {
        activities: selectedActivities,
        music: selectedMusic,
        social: selectedSocial,
        lifestyle: selectedLifestyle,
        spendingStyle: spendingStyle
      }
    };

    onSaveProfile(updatedProfile);
    showFeedback("Profile saved successfully! 🎉 Your bestie matches are recalculated.", "success");
  };

  // Submit details for manual admin review — this never verifies the
  // account by itself.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verUniversity.trim() || !verEmail.trim()) {
      showFeedback("Please provide your university and your university email address.", "error");
      return;
    }

    setIsSubmittingVerification(true);
    try {
      const res = await fetch("/api/verification/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        },
        body: JSON.stringify({
          university: verUniversity.trim(),
          universityEmail: verEmail.trim(),
          note: verNote.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not submit verification");
      }
      showFeedback("Verification submitted — an admin will review it shortly.", "success");
      onRefreshProfile();
    } catch (err: any) {
      showFeedback(err.message || "Could not submit verification.", "error");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Toast Alert Banner */}
      {toast.message && (
        <div className={`p-4 rounded-2xl border text-xs font-sans font-bold shadow-lg animate-fade-in flex items-center justify-between ${
          toast.type === "success"
            ? "bg-emerald-500/90 backdrop-blur-md border-emerald-400 text-white"
            : "bg-rose-500/90 backdrop-blur-md border-rose-400 text-white"
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: "", type: null })} className="text-white hover:opacity-80 text-sm font-extrabold px-1.5 py-0.5">✕</button>
        </div>
      )}

      {/* Title */}
      <div className="animate-fade-in">
        <h2 className="font-sans font-black text-2xl text-slate-900 tracking-tight">
          Create & Edit Your NEST Profile 🎨
        </h2>
        <p className="font-sans text-xs text-slate-500 mt-1">
          Your interests, lifestyle style, and university are analyzed by our friendship compatibility engine to match you with compatible girls in Madrid.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Main Form details */}
        <div className="md:col-span-8 space-y-6 bg-white/40 backdrop-blur-xl p-5 md:p-6 rounded-[28px] border border-white/60 shadow-xl animate-fade-in">
          
          <div className="border-b border-white/30 pb-3 flex items-center gap-1.5 text-slate-800">
            <User size={16} className="text-rose-500" />
            <h3 className="font-sans font-bold text-sm">Primary Information</h3>
          </div>

          {/* Profile Photo selector */}
          <div className="space-y-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
            <span className="text-[10px] font-sans font-extrabold text-slate-500 uppercase tracking-wider block">
              Profile Portrait Photo (Mandatory) 📸
            </span>
            <div className="max-w-md">
              <ImageUploader
                value={photo}
                onChange={(url) => setPhoto(url)}
                onRemove={() => setPhoto("")}
                label="Your Profile Photo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-slate-500 block">Your Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/40 border border-white/50 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>

            {/* Age */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-rose-500 block">Your Age</span>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-white/40 border border-white/50 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>
          </div>

          {/* Multiple Nationalities Selector */}
          <div className="space-y-2 bg-white/30 p-4 rounded-2xl border border-white/40 relative">
            <span className="text-[10px] font-sans font-extrabold text-slate-500 uppercase tracking-wider block">
              Nationalities 🗺️
            </span>
            
            {/* Single Trigger Button */}
            <button
              type="button"
              onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
              className="w-full bg-white/60 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium flex items-center justify-between transition"
            >
              <span>Select Nationalities</span>
              <Globe size={14} className="text-slate-400" />
            </button>

            {/* Selected Nationalities badges */}
            {selectedNationalities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedNationalities.map(nat => (
                  <span key={nat} className="bg-slate-900 text-rose-400 font-sans text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span>{nat}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveNationality(nat); }} className="text-white hover:text-rose-300 font-extrabold text-[10px] ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}

            {/* Searchable Pop-up / Modal / Dropdown */}
            {showNationalityDropdown && (
              <div className="absolute z-30 left-4 right-4 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Search Countries</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNationalityDropdown(false);
                      setNationalitySearch("");
                    }}
                    className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 uppercase"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none"
                  />
                  <Search size={12} className="text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Complete list of countries with flag emojis inside pop-up */}
                <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                  {ALL_COUNTRIES.filter(country =>
                    country.name.toLowerCase().includes(nationalitySearch.toLowerCase())
                  ).map(opt => {
                    const formatted = `${opt.name} ${opt.flag}`;
                    const isSelected = selectedNationalities.includes(formatted);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedNationalities(prev => [...prev, formatted]);
                          } else {
                            setSelectedNationalities(prev => prev.filter(c => c !== formatted));
                          }
                        }}
                        className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                          isSelected 
                            ? "bg-rose-50 text-rose-600 font-bold" 
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{opt.flag}</span>
                          <span>{opt.name}</span>
                        </span>
                        {isSelected && <Check size={12} className="text-rose-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* University */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-slate-500 block">University in Madrid</span>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. IE University, Complutense"
                className="w-full bg-white/40 border border-white/50 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>

            {/* Languages you speak & fluency level builder */}
            <div className="space-y-2 bg-rose-50/30 p-4 rounded-2xl border border-rose-100/40">
              <span className="text-[10px] font-sans font-extrabold text-slate-500 uppercase tracking-wider block">
                Languages you speak & Fluency Levels 🗣️
              </span>

              {/* Selected Languages list */}
              {languagesList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {languagesList.map(item => (
                    <span key={item} className="bg-rose-500 text-white font-sans text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span>{item}</span>
                      <button type="button" onClick={() => handleRemoveLanguage(item)} className="text-white hover:opacity-80 font-extrabold text-[9px] ml-1">✕</button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-sans italic block mb-2">No languages added yet. Add at least one!</span>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Select Language */}
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setCustomLanguage("");
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  {COMMON_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>

                {/* Select Fluency */}
                <select
                  value={selectedFluency}
                  onChange={(e) => setSelectedFluency(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  {FLUENCY_LEVELS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                {/* Add button */}
                <button
                  type="button"
                  onClick={handleAddLanguage}
                  className="bg-rose-500 text-white font-sans text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-rose-600 transition"
                >
                  ＋ Add Language
                </button>
              </div>

              {/* Custom language field */}
              <input
                type="text"
                placeholder="Or type custom language (e.g. Swedish)..."
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-800 mt-1.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Friendship style */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-extrabold text-slate-500 block">Friendship style you're looking for</span>
            <input
              type="text"
              value={friendshipType}
              onChange={(e) => setFriendshipType(e.target.value)}
              placeholder="e.g. Travel companion, pilates & brunch buddy"
              className="w-full bg-white/40 border border-white/50 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
            />
          </div>

          {/* Social Handles Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TikTok Handle */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-slate-500 block">TikTok Handle (Optional) 🎵</span>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs text-slate-400 font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="w-full bg-white/40 border border-white/50 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
                />
              </div>
            </div>

            {/* Instagram Handle */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-slate-500 block">Instagram Handle (Optional) 📸</span>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs text-slate-400 font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-white/40 border border-white/50 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
                />
              </div>
            </div>
          </div>

          {/* Other Social Handles */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-extrabold text-slate-500 block">Other Social Handles (Optional, e.g. Snapchat, Twitter) 🔗</span>
            <input
              type="text"
              placeholder="e.g. Snapchat: maya_madrid"
              value={otherSocial}
              onChange={(e) => setOtherSocial(e.target.value)}
              className="w-full bg-white/40 border border-white/50 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-extrabold text-slate-500 block">Introduce yourself! (Bio)</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell girls who you are, when you're moving, what you love to do etc..."
              className="w-full bg-white/40 border border-white/50 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300 resize-none"
            />
          </div>

          {/* TAXONOMY INTERESTS PICKER SECTIONS */}
          <div className="pt-4 border-t border-white/30 space-y-6">
            
            <div className="flex items-center gap-1 text-slate-800">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="font-sans font-bold text-sm">Predefined Friendship Interests</h3>
            </div>

            {/* Activities checkboxes */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                Activities & Hobbies
              </span>
              <div className="flex flex-wrap gap-1.5 select-none">
                {PREDEFINED_INTEREST_OPTIONS.activities.map(act => {
                  const selected = selectedActivities.includes(act);
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => handleToggleActivity(act)}
                      className={`px-3 py-1 rounded-full text-xs font-sans border font-semibold transition ${
                        selected
                          ? "bg-slate-900 text-rose-400 border-slate-900 shadow-sm"
                          : "bg-white/40 text-slate-600 border-white/40 hover:bg-white/60"
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Social Preferences */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                Social Plans
              </span>
              <div className="flex flex-wrap gap-1.5 select-none">
                {PREDEFINED_INTEREST_OPTIONS.social.map(soc => {
                  const selected = selectedSocial.includes(soc);
                  return (
                    <button
                      key={soc}
                      type="button"
                      onClick={() => handleToggleSocial(soc)}
                      className={`px-3 py-1 rounded-full text-xs font-sans border font-semibold transition ${
                        selected
                          ? "bg-slate-900 text-rose-400 border-slate-900 shadow-sm"
                          : "bg-white/40 text-slate-600 border-white/40 hover:bg-white/60"
                      }`}
                    >
                      {soc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Music preferences */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                Music Taste
              </span>
              <div className="flex flex-wrap gap-1.5 select-none">
                {PREDEFINED_INTEREST_OPTIONS.music.map(mus => {
                  const selected = selectedMusic.includes(mus);
                  return (
                    <button
                      key={mus}
                      type="button"
                      onClick={() => handleToggleMusic(mus)}
                      className={`px-3 py-1 rounded-full text-xs font-sans border font-semibold transition ${
                        selected
                          ? "bg-slate-900 text-rose-400 border-slate-900 shadow-sm"
                          : "bg-white/40 text-slate-600 border-white/40 hover:bg-white/60"
                      }`}
                    >
                      {mus}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lifestyle preferences */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                Lifestyle & Energy
              </span>
              <div className="flex flex-wrap gap-1.5 select-none">
                {PREDEFINED_INTEREST_OPTIONS.lifestyle.map(life => {
                  const selected = selectedLifestyle.includes(life);
                  return (
                    <button
                      key={life}
                      type="button"
                      onClick={() => handleToggleLifestyle(life)}
                      className={`px-3 py-1 rounded-full text-xs font-sans border font-semibold transition ${
                        selected
                          ? "bg-slate-900 text-rose-400 border-slate-900 shadow-sm"
                          : "bg-white/40 text-slate-600 border-white/40 hover:bg-white/60"
                      }`}
                    >
                      {life}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spending Style preferences (Radio) */}
            <div className="space-y-2 pt-1 border-t border-white/30">
              <span className="text-[10px] font-mono font-extrabold uppercase text-slate-400 tracking-widest block">
                Spending Style Preference
              </span>
              <div className="flex flex-wrap gap-2 select-none pt-1">
                {PREDEFINED_INTEREST_OPTIONS.spendingStyle.map(style => {
                  const selected = spendingStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSpendingStyle(style)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-sans border font-black transition ${
                        selected
                          ? "bg-rose-500 text-white border-rose-500 shadow-md"
                          : "bg-white/40 text-slate-600 border-white/40 hover:bg-white/60"
                      }`}
                    >
                      👑 {style}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* PERSONAL RECOMMENDATIONS SECTION */}
          <div className="bg-white/40 backdrop-blur-xl p-5 rounded-[28px] border border-white/60 shadow-xl space-y-4 mt-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/30">
              <div className="flex items-center gap-1.5">
                <MapPin size={18} className="text-rose-500" />
                <h3 className="font-sans font-black text-xs text-slate-800 uppercase tracking-wider">
                  My Secret Spots ({myRecs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchMyRecommendations}
                className="text-[9px] font-mono text-rose-500 font-extrabold hover:underline"
              >
                Refresh ↺
              </button>
            </div>

            {isLoadingMyRecs ? (
              <p className="text-[10px] text-slate-400 font-sans italic py-2">Loading your spots...</p>
            ) : myRecs.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-sans italic leading-relaxed">
                You haven't posted any secret spots yet. Head to the City Guide tab to share your favorite Madrid locations!
              </p>
            ) : (
              <div className="space-y-2 select-none">
                {myRecs.map((rec) => (
                  <div key={rec.id} className="bg-white/65 p-3 rounded-xl border border-white/50 flex items-start justify-between gap-3 shadow-sm">
                    <div className="flex-1 truncate">
                      <h4 className="font-bold text-xs text-slate-800 truncate">{rec.name}</h4>
                      <p className="text-[9px] text-slate-400 font-mono truncate">📍 {rec.address}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rec)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition cursor-pointer"
                        title="Edit spot"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMyRec(rec.id, rec.name)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                        title="Delete spot"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="pt-4 border-t border-white/30 flex justify-end">
            <button
              onClick={handleSave}
              className="w-full sm:w-auto bg-rose-500 text-white font-sans text-xs font-black px-6 py-3 rounded-xl shadow-lg shadow-rose-200/50 hover:bg-rose-600 transition active:scale-95 cursor-pointer"
            >
              Save profile
            </button>
          </div>

          {/* ACCOUNT ACTIONS — sign out is non-destructive; deletion is
              explicit, typed, and clearly separated */}
          <div className="mt-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 p-5 space-y-4">
            <h4 className="font-sans font-bold text-sm text-slate-800">Account</h4>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">Sign out</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ends this session on this device. Your profile, matches, and messages stay intact.
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full sm:w-auto shrink-0 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-sans text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                Sign out
              </button>
            </div>

            <div className="border-t border-slate-200/60" />

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-red-700">Delete account</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permanently removes your account, profile, matches, messages, posts, and RSVPs. This cannot be undone.
                </p>
              </div>

              {showDeleteConfirm ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3">
                  <label className="text-[11px] text-red-700 font-semibold leading-normal block">
                    Type <span className="font-black font-mono">DELETE</span> to confirm permanent deletion.
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                    className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="bg-white border border-slate-200 px-3.5 py-2 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || deleteConfirmText !== "DELETE"}
                      className="bg-red-600 text-white px-3.5 py-2 rounded-lg text-[11px] font-black hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isDeleting ? "Deleting…" : "Delete account"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-sans text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Delete account
                </button>
              )}
            </div>
          </div>

          {/* EDIT SPOT MODAL OVERLAY */}
          {editingRec && (
            <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in select-text">
              <div className="bg-white rounded-[28px] border border-stone-200/50 p-6 max-w-md w-full space-y-4 shadow-2xl relative">
                <h3 className="font-sans font-black text-sm text-slate-900 uppercase tracking-tight">
                  Edit Secret Spot
                </h3>
                <p className="text-[10px] text-slate-500">
                  Update the details for your shared spot. They will be updated instantly on the City Guide map and boards.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Spot Name</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Address / Neighborhood</span>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Google Maps URL Link</span>
                    <input
                      type="text"
                      value={editGoogleMapsUrl}
                      onChange={(e) => setEditGoogleMapsUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Category</span>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="cafe">Café</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="study">Study Spot</option>
                        <option value="activity">Outdoors</option>
                        <option value="hidden_gem">Hidden Gem</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Tags</span>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-slate-400 uppercase">Description</span>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRec(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="bg-rose-500 text-white font-sans text-xs font-black px-4 py-2 rounded-xl shadow-md hover:bg-rose-600 transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Verification Panel */}
        <div className="md:col-span-4 space-y-6">
          
          {/* VERIFICATION PANEL */}
          <div className="bg-white/40 backdrop-blur-xl p-5 rounded-[28px] border border-white/60 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-1.5 pb-2 border-b border-white/30">
              <ShieldCheck size={18} className="text-amber-500 fill-amber-100" />
              <h3 className="font-sans font-black text-xs text-slate-800 uppercase tracking-wider">
                Student Verification
              </h3>
            </div>

            <p className="font-sans text-[11px] text-slate-500 leading-relaxed">
              Every member is reviewed by the NEST team before she can match. Submit your university details below.
            </p>

            {isVerified ? (
              <div className="bg-amber-50/75 backdrop-blur-sm text-amber-800 p-3.5 rounded-xl border border-amber-200/50 text-center space-y-1.5 select-none shadow-sm">
                <ShieldCheck size={26} className="text-amber-600 fill-amber-200 mx-auto" />
                <h4 className="font-sans font-bold text-xs">Verified member</h4>
                <p className="font-sans text-[10px] text-slate-600 leading-normal">
                  Your student status has been approved. You have full access to matching.
                </p>
              </div>
            ) : verificationStatus === "pending" ? (
              <div className="bg-stone-50 text-stone-700 p-3.5 rounded-xl border border-stone-200 text-center space-y-1.5 select-none">
                <span className="text-2xl block">⏳</span>
                <h4 className="font-sans font-bold text-xs">Under review</h4>
                <p className="font-sans text-[10px] text-stone-500 leading-normal">
                  Submitted {currentUser.verification?.submittedAt ? new Date(currentUser.verification.submittedAt).toLocaleDateString() : "recently"}. We'll notify you once an admin has reviewed it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                {verificationStatus === "rejected" && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-[11px] leading-normal">
                    <span className="font-bold block mb-0.5">Not approved</span>
                    {currentUser.verification?.rejectionReason || "Please review your details and resubmit."}
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-slate-600 block">University</span>
                  <input
                    type="text"
                    placeholder="e.g. IE University"
                    value={verUniversity}
                    onChange={(e) => setVerUniversity(e.target.value)}
                    className="w-full bg-white/40 border border-white/50 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-slate-600 flex items-center gap-1">
                    <Mail size={12} />
                    <span>University email</span>
                  </span>
                  <input
                    type="email"
                    placeholder="e.g. name@student.ie.edu"
                    value={verEmail}
                    onChange={(e) => setVerEmail(e.target.value)}
                    className="w-full bg-white/40 border border-white/50 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-slate-600 block">Anything else we should know? (optional)</span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Exchange student, arriving in September"
                    value={verNote}
                    onChange={(e) => setVerNote(e.target.value)}
                    className="w-full bg-white/40 border border-white/50 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-300 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVerification}
                  className="w-full py-2 bg-amber-500 text-slate-950 font-sans text-xs font-extrabold rounded-lg shadow-md shadow-amber-200/30 hover:bg-amber-600 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVerification ? (
                    <span>Submitting…</span>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>{verificationStatus === "rejected" ? "Resubmit for review" : "Submit for review"}</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-400 leading-normal">
                  Reviews are manual and usually quick. Your email is used for verification only.
                </p>
              </form>
            )}
          </div>

          {/* COMMUNITY GUIDELINES & SAFETY CORNER */}
          <div className="bg-slate-950 text-white p-5 rounded-[28px] border border-slate-900 shadow-xl space-y-3.5 animate-fade-in">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Globe size={18} className="text-rose-400" />
              <h3 className="font-sans font-black text-xs text-rose-400 uppercase tracking-wider">
                Madrid Safety Hub
              </h3>
            </div>

            <p className="font-sans text-[11px] text-slate-400 leading-relaxed select-text">
              NEST is designed around a single guiding focus: ensuring moving abroad is safe, inclusive, and empowering.
            </p>

            <ul className="text-[10px] font-sans text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <Check size={12} className="text-rose-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Girls-Only Profiles</strong>: Men are strictly prohibited. Reporting flags are reviewed within 2 hours.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check size={12} className="text-rose-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Public Meetups</strong>: First meetups should always occur in popular public spots (Retiro, cafes) curated in our planner.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check size={12} className="text-rose-400 mt-0.5 shrink-0" />
                <span><strong className="text-white">Madrid Support Numbers</strong>: National Emergency: 112 • Ambulance: 061 • Police: 091.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
