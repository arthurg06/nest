import React, { useState, useEffect, useRef } from "react";
import { UserProfile, Interests } from "../types";
import { PREDEFINED_INTEREST_OPTIONS } from "../data";
import { ANIMAL_EMOJI } from "../../shared/compatibility";
import { ShieldCheck, User, Sparkles, Check, Mail, Upload, FileText, Globe, Search, Trash2, Edit, MapPin, ExternalLink, ShieldAlert, Eye, X } from "lucide-react";
import ProfilePreview from "./ProfilePreview";
import { PhotoGalleryEditor } from "./PhotoGalleryEditor";
import { ThemeToggle } from "./ThemeToggle";
import { searchCountries } from "../../shared/countries";
import { apiUrl } from "../lib/api";
import VerifiedBadge from "./VerifiedBadge";
import UniversitySelect from "./UniversitySelect";

interface ProfileEditorProps {
  currentUser: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onDeleteRecommendation?: (id: string) => Promise<boolean>;
  onSignOut: () => void;
  onRefreshProfile: () => void;
  /** Section to reveal on arrival, e.g. "verification". */
  focusSection?: string | null;
  onFocusHandled?: () => void;
}

export default function ProfileEditor({ currentUser, onSaveProfile, onDeleteRecommendation, onSignOut, onRefreshProfile, focusSection, onFocusHandled }: ProfileEditorProps) {
  // Bringing the member here from another screen must land her ON the
  // section she asked for: the verification card sits far down a long page,
  // and silently switching tabs looked like nothing had happened.
  const verificationRef = useRef<HTMLDivElement>(null);
  const [highlightVerification, setHighlightVerification] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (focusSection !== "verification") return;
    const node = verificationRef.current;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightVerification(true);
      window.setTimeout(() => setHighlightVerification(false), 2400);
    }
    onFocusHandled?.();
  }, [focusSection, onFocusHandled]);

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
      const res = await fetch(apiUrl("/api/recommendations"), {
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
        const res = await fetch(apiUrl(`/api/recommendations/${id}`), {
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
      const res = await fetch(apiUrl(`/api/recommendations/${editingRec.id}`), {
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
      const res = await fetch(apiUrl("/api/users/me"), {
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

  // Interactive Multiple Nationalities
  const initialNationalities = currentUser.nationality
    ? currentUser.nationality.split(", ").map(n => n.trim()).filter(Boolean)
    : [];
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>(initialNationalities);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);

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

  const handleRemoveNationality = (formattedNat: string) => {
    setSelectedNationalities(prev => prev.filter(n => n !== formattedNat));
  };
  
  // Photo State
  const [photo, setPhoto] = useState<string>(currentUser.photo || "");
  const [photos, setPhotos] = useState<string[]>(
    currentUser.photos?.length ? currentUser.photos : currentUser.photo ? [currentUser.photo] : []
  );

  // Interests state
  const [selectedActivities, setSelectedActivities] = useState<string[]>(currentUser.interests.activities);
  const [selectedMusic, setSelectedMusic] = useState<string[]>(currentUser.interests.music);
  const [selectedSocial, setSelectedSocial] = useState<string[]>(currentUser.interests.social);
  const [selectedLifestyle, setSelectedLifestyle] = useState<string[]>(currentUser.interests.lifestyle);
  const [spendingStyle, setSpendingStyle] = useState<string>(currentUser.interests.spendingStyle);
  const [animals, setAnimals] = useState<string>(currentUser.interests.animals || "");

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

  // Change password — the form stays collapsed behind one button so the
  // Account section keeps its calm look. Passwords are sent to the existing
  // secure endpoint and never stored or logged anywhere on the client.
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showFeedback("Please fill out all three password fields.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showFeedback("New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showFeedback("The new passwords do not match.", "error");
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not change password.");
      }
      closeChangePassword();
      showFeedback("Password changed successfully.", "success");
    } catch (err: any) {
      showFeedback(err.message || "Could not change password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // The profile exactly as saving would publish it. The preview renders this
  // same object, so what she checks is what other members will get — edits
  // she has not saved yet included.
  const draftProfile = (): UserProfile => ({
    ...currentUser,
    name: name.trim() || "User",
    age: Number(age) || 20,
    nationality: selectedNationalities.join(", "),
    // Falls back to the stored value (not a hardcoded university): the
    // selector can only produce approved names, so empty means "unchanged".
    university: university.trim() || currentUser.university,
    // Languages are no longer collected or edited; stored data is passed
    // through untouched so older profiles keep what they had.
    languages: currentUser.languages || [],
    personalityType: "",
    friendshipType: friendshipType.trim() || "Outing planner",
    bio: bio.trim() || "Moving to Madrid!",
    isVerified: currentUser.isVerified,
    photo: photos[0] || photo,
    photos,
    tiktok: tiktok.trim() || undefined,
    instagram: instagram.trim() || undefined,
    // No longer editable; stored data is passed through so nothing is lost.
    otherSocial: currentUser.otherSocial || undefined,
    interests: {
      activities: selectedActivities,
      music: selectedMusic,
      social: selectedSocial,
      lifestyle: selectedLifestyle,
      spendingStyle: spendingStyle,
      animals: animals || undefined
    }
  });

  // "Unsaved" means: different from the last state we know the server holds.
  // Captured once on mount, moved forward on every save.
  const draftJson = JSON.stringify(draftProfile());
  const savedSnapshot = useRef<string>(draftJson);
  const hasUnsavedChanges = savedSnapshot.current !== draftJson;

  // View/edit split: the profile opens read-only; Edit Profile switches the
  // same form on, Save commits through the existing path, Cancel throws the
  // draft away by resetting every field from the server-known profile.
  const [isEditing, setIsEditing] = useState(false);

  const resetDraft = () => {
    setName(currentUser.name);
    setAge(currentUser.age);
    setUniversity(currentUser.university);
    setSelectedNationalities(
      currentUser.nationality
        ? currentUser.nationality.split(", ").map(n => n.trim()).filter(Boolean)
        : []
    );
    setNationalitySearch("");
    setShowNationalityDropdown(false);
    setPhoto(currentUser.photo || "");
    setPhotos(currentUser.photos?.length ? currentUser.photos : currentUser.photo ? [currentUser.photo] : []);
    setBio(currentUser.bio);
    setTiktok(currentUser.tiktok || "");
    setInstagram(currentUser.instagram || "");
    setFriendshipType(currentUser.friendshipType);
    setSelectedActivities(currentUser.interests.activities);
    setSelectedMusic(currentUser.interests.music);
    setSelectedSocial(currentUser.interests.social);
    setSelectedLifestyle(currentUser.interests.lifestyle);
    setSpendingStyle(currentUser.interests.spendingStyle);
    setAnimals(currentUser.interests.animals || "");
  };

  const startEditing = () => {
    resetDraft();
    setIsEditing(true);
  };

  const cancelEditing = () => {
    resetDraft();
    setIsEditing(false);
  };

  // Leaving the edit pop-up with unsaved changes asks first. The baseline is
  // the draft as it stood when the pop-up opened (captured on the first
  // render after opening, i.e. after resetDraft has applied).
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const editBaseline = useRef<string | null>(null);

  useEffect(() => {
    if (isEditing && editBaseline.current === null) {
      editBaseline.current = draftJson;
    }
    if (!isEditing) {
      editBaseline.current = null;
    }
  }, [isEditing, draftJson]);

  const requestCloseEdit = () => {
    if (editBaseline.current !== null && draftJson !== editBaseline.current) {
      setShowDiscardConfirm(true);
    } else {
      cancelEditing();
    }
  };

  const discardAndClose = () => {
    setShowDiscardConfirm(false);
    cancelEditing();
  };

  const handleSave = () => {
    if (selectedNationalities.length === 0) {
      showFeedback("Please select or add at least one Nationality!", "error");
      return;
    }
    const updatedProfile = draftProfile();
    savedSnapshot.current = JSON.stringify(updatedProfile);
    onSaveProfile(updatedProfile);
    showFeedback("Profile saved.", "success");
    setIsEditing(false);
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
      const res = await fetch(apiUrl("/api/verification/submit"), {
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
            : "bg-primary/90 backdrop-blur-md border-ring text-primary-foreground"
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: "", type: null })} className="text-white hover:opacity-80 text-sm font-extrabold px-1.5 py-0.5">✕</button>
        </div>
      )}

      {/* Title — own identity row with verification badge beside the name.
          The preview sits up here so it is reachable the moment she opens her
          profile, rather than buried at the foot of a long form. */}
      <div className="animate-fade-in flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-display text-3xl text-foreground">
              Your profile
            </h2>
            <VerifiedBadge profile={currentUser} />
          </div>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            What you share here shapes your matches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="shrink-0 flex items-center gap-1.5 bg-card border border-border/70 text-foreground font-sans text-[11px] font-bold px-3.5 py-2.5 rounded-xl hover:bg-muted transition shadow-sm"
        >
          <Eye size={13} className="text-primary" />
          <span>How others see me</span>
          {hasUnsavedChanges && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              title="Includes changes you have not saved yet"
            />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Main Form details */}
        <div className="md:col-span-8 space-y-6 bg-card/40 backdrop-blur-xl p-5 md:p-6 rounded-[28px] border border-border/60 shadow-xl animate-fade-in">
          
              {/* READ-ONLY VIEW — nothing on this card can change until she
                  presses Edit Profile. */}
              <div className="border-b border-border/30 pb-3 flex items-center justify-between gap-2 text-foreground">
                <div className="flex items-center gap-1.5">
                  <User size={16} className="text-primary" />
                  <h3 className="font-sans font-bold text-sm">Primary Information</h3>
                </div>
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground font-sans text-[11px] font-black px-3.5 py-2 rounded-xl hover:bg-primary/90 transition shadow-sm cursor-pointer"
                >
                  <Edit size={12} />
                  <span>Edit Profile</span>
                </button>
              </div>

              {(currentUser.photos?.length ? currentUser.photos : currentUser.photo ? [currentUser.photo] : []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(currentUser.photos?.length ? currentUser.photos : [currentUser.photo]).map((url, i) => (
                    <img
                      key={url}
                      src={url}
                      alt={i === 0 ? `${currentUser.name}, main photo` : `${currentUser.name}, photo ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border border-border/60 shadow-sm"
                    />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Your Name</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Your Age</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.age}</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Nationalities</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.nationality || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">University in Madrid</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.university || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">TikTok</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.tiktok ? `@${currentUser.tiktok}` : "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Instagram</span>
                  <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.instagram ? `@${currentUser.instagram}` : "—"}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Friendship style you're looking for</span>
                <p className="text-sm font-sans font-semibold text-foreground mt-0.5">{currentUser.friendshipType || "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Bio</span>
                <p className="text-xs font-sans text-foreground leading-relaxed mt-0.5 italic">{currentUser.bio ? `"${currentUser.bio}"` : "—"}</p>
              </div>

              <div>
                <span className="text-[10px] font-sans font-extrabold text-muted-foreground block mb-1.5">Interests</span>
                {[...currentUser.interests.activities, ...currentUser.interests.social, ...currentUser.interests.music, ...currentUser.interests.lifestyle].length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[...currentUser.interests.activities, ...currentUser.interests.social, ...currentUser.interests.music, ...currentUser.interests.lifestyle].map(tag => (
                      <span key={tag} className="text-[10px] font-sans font-bold bg-muted/60 text-muted-foreground border border-border/40 px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                    <span className="text-[10px] font-sans font-bold bg-accent/40 text-accent-foreground border border-border/40 px-2.5 py-1 rounded-full">
                      👑 {currentUser.interests.spendingStyle}
                    </span>
                    {currentUser.interests.animals && (
                      <span className="text-[10px] font-sans font-bold bg-accent/40 text-accent-foreground border border-border/40 px-2.5 py-1 rounded-full">
                        {ANIMAL_EMOJI[currentUser.interests.animals] || "🐾"} {currentUser.interests.animals}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-sans">—</p>
                )}
              </div>

          {/* PERSONAL RECOMMENDATIONS SECTION */}
          <div className="bg-card/40 backdrop-blur-xl p-5 rounded-[28px] border border-border/60 shadow-xl space-y-4 mt-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <div className="flex items-center gap-1.5">
                <MapPin size={18} className="text-primary" />
                <h3 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">
                  My Secret Spots ({myRecs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchMyRecommendations}
                className="text-[9px] font-mono text-primary font-extrabold hover:underline"
              >
                Refresh ↺
              </button>
            </div>

            {isLoadingMyRecs ? (
              <p className="text-[10px] text-muted-foreground font-sans italic py-2">Loading your spots...</p>
            ) : myRecs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground font-sans italic leading-relaxed">
                You haven't posted any secret spots yet. Head to the City Guide tab to share your favorite Madrid locations!
              </p>
            ) : (
              <div className="space-y-2 select-none">
                {myRecs.map((rec) => (
                  <div key={rec.id} className="bg-card/65 p-3 rounded-xl border border-border/50 flex items-start justify-between gap-3 shadow-sm">
                    <div className="flex-1 truncate">
                      <h4 className="font-bold text-xs text-foreground truncate">{rec.name}</h4>
                      <p className="text-[9px] text-muted-foreground font-mono truncate">📍 {rec.address}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rec)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded transition cursor-pointer"
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


          {/* ACCOUNT ACTIONS — sign out is non-destructive; deletion is
              explicit, typed, and clearly separated */}
          <div className="mt-6 bg-card/40 backdrop-blur-md rounded-2xl border border-border/60 p-5 space-y-4">
            <h4 className="font-sans font-bold text-sm text-foreground">Account</h4>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Appearance</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Follows your device setting until you choose one.
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="border-t border-border/60" />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Password</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Change the password you sign in with.
                  </p>
                </div>
                {!showChangePassword && (
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(true)}
                    className="w-full sm:w-auto shrink-0 bg-card border border-border hover:bg-muted/60 text-foreground font-sans text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-center"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {showChangePassword && (
                <div className="bg-muted/30 border border-border/60 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label htmlFor="current-password" className="text-[10px] font-sans font-extrabold text-muted-foreground block">Current Password</label>
                    <input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="new-password" className="text-[10px] font-sans font-extrabold text-muted-foreground block">New Password (Min 6 chars)</label>
                      <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="confirm-new-password" className="text-[10px] font-sans font-extrabold text-muted-foreground block">Confirm New Password</label>
                      <input
                        id="confirm-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={closeChangePassword}
                      className="bg-card border border-border px-3.5 py-2 rounded-lg text-[11px] font-bold text-foreground hover:bg-muted/60 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-primary-foreground px-4 py-2 rounded-lg text-[11px] font-black transition cursor-pointer"
                    >
                      {isChangingPassword ? "Saving..." : "Save New Password"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/60" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Sign out</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ends this session on this device. Your profile, matches, and messages stay intact.
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full sm:w-auto shrink-0 bg-card border border-border hover:bg-muted/60 text-foreground font-sans text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                Sign out
              </button>
            </div>

            <div className="border-t border-border/60" />

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-red-700">Delete account</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
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
                    className="w-full bg-card border border-red-200 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="bg-card border border-border px-3.5 py-2 rounded-lg text-[11px] font-bold text-foreground hover:bg-muted/60 transition cursor-pointer"
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
              <div className="bg-card rounded-[28px] border border-border/50 p-6 max-w-md w-full space-y-4 shadow-2xl relative">
                <h3 className="font-sans font-black text-sm text-foreground uppercase tracking-tight">
                  Edit Secret Spot
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Update the details for your shared spot. They will be updated instantly on the City Guide map and boards.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Spot Name</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Address / Neighborhood</span>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Google Maps URL Link</span>
                    <input
                      type="text"
                      value={editGoogleMapsUrl}
                      onChange={(e) => setEditGoogleMapsUrl(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Category</span>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as any)}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      >
                        <option value="cafe">Café</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="study">Study Spot</option>
                        <option value="activity">Outdoors</option>
                        <option value="hidden_gem">Hidden Gem</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Tags</span>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-sans font-black text-muted-foreground uppercase">Description</span>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRec(null)}
                    className="bg-muted hover:bg-muted text-foreground font-sans text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="bg-primary text-primary-foreground font-sans text-xs font-black px-4 py-2 rounded-xl shadow-md hover:bg-primary/90 transition cursor-pointer"
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
          <div
            ref={verificationRef}
            className={`bg-card/40 backdrop-blur-xl p-5 rounded-[28px] border shadow-xl space-y-4 animate-fade-in transition-all duration-500 ${
              highlightVerification ? "border-primary ring-2 ring-ring" : "border-border/60"
            }`}
          >
            <div className="flex items-center gap-1.5 pb-2 border-b border-border/30">
              <ShieldCheck size={18} className="text-amber-500 fill-amber-100" />
              <h3 className="font-sans font-black text-xs text-foreground uppercase tracking-wider">
                Student Verification
              </h3>
            </div>

            <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
              Every member is reviewed by the NEST team before she can match. Submit your university details below.
            </p>

            {isVerified ? (
              <div className="bg-success-muted text-success p-3.5 rounded-xl border border-success-border text-center space-y-1.5 select-none">
                <ShieldCheck size={26} className="mx-auto" />
                <h4 className="font-sans font-bold text-xs">Verified Student</h4>
                <p className="font-sans text-[11px] leading-normal">
                  Your student status has been approved. You have full access to matching.
                </p>
              </div>
            ) : verificationStatus === "pending" ? (
              <div className="bg-card text-foreground p-3.5 rounded-xl border border-border text-center space-y-1.5 select-none">
                <span className="text-2xl block">⏳</span>
                <h4 className="font-sans font-bold text-xs">Under review</h4>
                <p className="font-sans text-[10px] text-muted-foreground leading-normal">
                  Submitted {currentUser.verification?.submittedAt ? new Date(currentUser.verification.submittedAt).toLocaleDateString() : "recently"}. We'll notify you once an admin has reviewed it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                {verificationStatus === "rejected" && (
                  <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-xl text-[11px] leading-normal">
                    <span className="font-bold block mb-0.5">Not approved</span>
                    {currentUser.verification?.rejectionReason || "Please review your details and resubmit."}
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-muted-foreground block">University</span>
                  <input
                    type="text"
                    placeholder="e.g. IE University"
                    value={verUniversity}
                    onChange={(e) => setVerUniversity(e.target.value)}
                    className="w-full bg-card/40 border border-border/50 rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-muted-foreground flex items-center gap-1">
                    <Mail size={12} />
                    <span>University email</span>
                  </span>
                  <input
                    type="email"
                    placeholder="e.g. name@student.ie.edu"
                    value={verEmail}
                    onChange={(e) => setVerEmail(e.target.value)}
                    className="w-full bg-card/40 border border-border/50 rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Used only to verify your student status. This won't change your NEST login email.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold text-muted-foreground block">Anything else we should know? (optional)</span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Exchange student, arriving in September"
                    value={verNote}
                    onChange={(e) => setVerNote(e.target.value)}
                    className="w-full bg-card/40 border border-border/50 rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVerification}
                  className="w-full py-2 bg-amber-500 text-foreground font-sans text-xs font-extrabold rounded-lg shadow-md shadow-amber-200/30 hover:bg-amber-600 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
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

                <p className="text-[10px] text-muted-foreground leading-normal">
                  Reviews are manual and usually quick. You'll keep signing in with your personal email.
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

            <p className="font-sans text-[11px] text-muted-foreground leading-relaxed select-text">
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

      {/* EDIT PROFILE POP-UP — a distinct editing screen over the profile.
          Full-screen sheet on mobile, contained modal on desktop. Nothing on
          the profile itself is editable; everything editable lives here, and
          only Save Changes commits it. */}
      {isEditing && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Edit your profile"
        >
          <div className="bg-background w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-[28px] md:border md:border-border/70 md:shadow-2xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="px-5 md:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3.5 border-b border-border/40 flex items-center justify-between gap-3 shrink-0 bg-card/70">
              <div className="flex items-center gap-2">
                <Edit size={15} className="text-primary" />
                <h3 className="font-sans font-black text-sm text-foreground">Edit Profile</h3>
              </div>
              <button
                type="button"
                onClick={requestCloseEdit}
                aria-label="Close without saving"
                className="text-muted-foreground hover:text-foreground p-2 -m-2"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-6 py-5 space-y-6">

          {/* Photos — up to four, the first one is the profile picture */}
          <div className="space-y-3 bg-accent/50 p-4 rounded-2xl border border-border/50">
            <span className="text-[10px] font-sans font-extrabold text-muted-foreground uppercase tracking-wider block">
              Your photos 📸
            </span>
            <PhotoGalleryEditor
              photos={photos}
              onChange={next => {
                setPhotos(next);
                setPhoto(next[0] || "");
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Your Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Age */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-primary block">Your Age</span>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Multiple Nationalities Selector */}
          <div className="space-y-2 bg-card/30 p-4 rounded-2xl border border-border/40 relative">
            <span className="text-[10px] font-sans font-extrabold text-muted-foreground uppercase tracking-wider block">
              Nationalities 🗺️
            </span>
            
            {/* Single Trigger Button */}
            <button
              type="button"
              onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
              className="w-full bg-card/60 border border-border hover:border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground font-medium flex items-center justify-between transition"
            >
              <span>Select Nationalities</span>
              <Globe size={14} className="text-muted-foreground" />
            </button>

            {/* Selected Nationalities badges */}
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
              <div className="absolute z-30 left-4 right-4 mt-1 bg-card border border-border rounded-2xl shadow-xl p-3.5 space-y-2 animate-fade-in">
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
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedNationalities(prev => [...prev, formatted]);
                          } else {
                            setSelectedNationalities(prev => prev.filter(c => c !== formatted));
                          }
                        }}
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

          <div className="grid grid-cols-1 gap-4">
            {/* University */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">University in Madrid</span>
              <UniversitySelect
                value={university}
                onChange={setUniversity}
                triggerClassName="w-full bg-card/40 border border-border/50 hover:border-border rounded-xl px-3.5 py-2 text-xs flex items-center justify-between transition"
              />
            </div>

          </div>

          {/* Friendship style */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Friendship style you're looking for</span>
            <input
              type="text"
              value={friendshipType}
              onChange={(e) => setFriendshipType(e.target.value)}
              placeholder="e.g. Travel companion, pilates & brunch buddy"
              className="w-full bg-card/40 border border-border/50 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Social Handles Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TikTok Handle */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">TikTok Handle (Optional) 🎵</span>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs text-muted-foreground font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="w-full bg-card/40 border border-border/50 rounded-xl pl-8 pr-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Instagram Handle */}
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Instagram Handle (Optional) 📸</span>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-xs text-muted-foreground font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-card/40 border border-border/50 rounded-xl pl-8 pr-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-extrabold text-muted-foreground block">Introduce yourself! (Bio)</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell girls who you are, when you're moving, what you love to do etc..."
              className="w-full bg-card/40 border border-border/50 rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* TAXONOMY INTERESTS PICKER SECTIONS */}
          <div className="pt-4 border-t border-border/30 space-y-6">
            
            <div className="flex items-center gap-1 text-foreground">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="font-sans font-bold text-sm">Predefined Friendship Interests</h3>
            </div>

            {/* Activities checkboxes */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
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
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
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
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
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
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
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
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
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
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
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
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
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
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
                      }`}
                    >
                      {life}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spending Style preferences (Radio) */}
            <div className="space-y-2 pt-1 border-t border-border/30">
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
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
                          ? "bg-primary text-primary-foreground border-rose-500 shadow-md"
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
                      }`}
                    >
                      👑 {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animals — single choice, easy conversation starter */}
            <div className="space-y-2 pt-1 border-t border-border/30">
              <span className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground tracking-widest block">
                Animals
              </span>
              <div className="flex flex-wrap gap-2 select-none pt-1">
                {PREDEFINED_INTEREST_OPTIONS.animals.map(option => {
                  const selected = animals === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnimals(selected ? "" : option)}
                      aria-pressed={selected}
                      className={`px-4 py-1.5 rounded-xl text-xs font-sans border font-black transition ${
                        selected
                          ? "bg-primary text-primary-foreground border-rose-500 shadow-md"
                          : "bg-card/40 text-muted-foreground border-border/40 hover:bg-card/60"
                      }`}
                    >
                      {ANIMAL_EMOJI[option]} {option}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
            </div>

            {/* Footer — the only way changes are committed */}
            <div className="px-5 md:px-6 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-border/40 shrink-0 bg-card/70 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={requestCloseEdit}
                className="w-full sm:w-auto bg-card border border-border text-foreground font-sans text-xs font-bold px-6 py-3 rounded-xl hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="w-full sm:w-auto bg-primary text-primary-foreground font-sans text-xs font-black px-8 py-3 rounded-xl shadow-pop hover:bg-primary/90 transition active:scale-95 cursor-pointer"
              >
                Save Changes
              </button>
            </div>

            {/* Discard confirmation */}
            {showDiscardConfirm && (
              <div className="absolute inset-0 z-10 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-6">
                <div className="bg-card rounded-2xl border border-border/70 shadow-2xl p-5 max-w-xs w-full space-y-2 animate-scale-up">
                  <p className="font-sans font-black text-sm text-foreground">Discard changes?</p>
                  <p className="font-sans text-xs text-muted-foreground">Your changes haven't been saved.</p>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setShowDiscardConfirm(false)}
                      className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-[11px] font-bold hover:bg-muted transition cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      onClick={discardAndClose}
                      className="px-3.5 py-2 rounded-xl bg-destructive text-destructive-foreground text-[11px] font-black hover:opacity-90 transition cursor-pointer"
                    >
                      Discard Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showPreview && (
        <ProfilePreview
          profile={draftProfile()}
          unsaved={hasUnsavedChanges}
          onClose={() => setShowPreview(false)}
        />
      )}

    </div>
  );
}
