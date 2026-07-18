import React, { useState, useEffect } from "react";
import { UserProfile, Match, Message, Community, Event, Recommendation, Plan, CommunityMessage } from "./types";
import { calculateCompatibility } from "./data";
import SwipeCard from "./components/SwipeCard";
import ChatWindow from "./components/ChatWindow";
import CityDiscovery from "./components/CityDiscovery";
import Communities from "./components/Communities";
import Events from "./components/Events";
import ProfileEditor from "./components/ProfileEditor";
import OnboardingSignUp from "./components/OnboardingSignUp";
import AdminDashboard from "./components/AdminDashboard";
import {
  Sparkles, MessageSquare, MapPin, Users, Calendar, User,
  ShieldAlert, Bell, Heart, Check, X, ShieldCheck, HelpCircle, RefreshCw, Key
} from "lucide-react";

export default function App() {
  // Navigation State: "swipe" | "chat" | "city" | "communities" | "events" | "profile"
  const [activeTab, setActiveTab] = useState<string>("swipe");

  // Auth & Profile state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nest_token"));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [accountUser, setAccountUser] = useState<any | null>(null);

  // Discovery & Matches
  const [swipeQueue, setSwipeQueue] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string>("");

  // Submissions, Outings, Spots
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // UI Match Alert Overlay Modal
  const [newMatchAlert, setNewMatchAlert] = useState<UserProfile | null>(null);
  
  // Search matches filter query
  const [searchMatchQuery, setSearchMatchQuery] = useState("");

  // Quick helper to fetch with Bearer token authentication
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const currentToken = token || localStorage.getItem("nest_token");
    const headers = {
      "Content-Type": "application/json",
      ...(currentToken ? { "Authorization": `Bearer ${currentToken}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Token expired or invalid
      handleSignOut();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  };

  // Log out or clear session
  const handleSignOut = () => {
    localStorage.removeItem("nest_token");
    localStorage.removeItem("nest_user");
    setToken(null);
    setCurrentUser(null);
    setAccountUser(null);
    setSwipeQueue([]);
    setMatches([]);
    setEvents([]);
    setRecommendations([]);
    setActiveTab("swipe");
  };

  // Auth success handler from Onboarding component
  const handleAuthSuccess = (newToken: string, user: any, profile: UserProfile) => {
    localStorage.setItem("nest_token", newToken);
    setToken(newToken);
    setAccountUser(user);
    setCurrentUser(profile);
  };

  // API loading functions
  const loadProfile = async () => {
    try {
      const res = await fetchWithAuth("/api/auth/me");
      const data = await res.json();
      if (res.ok) {
        setAccountUser(data.user);
        setCurrentUser(data.profile);
      }
    } catch (err: any) {
      console.error("Error loading profile:", err);
    }
  };

  const loadDiscoveryQueue = async () => {
    try {
      const res = await fetchWithAuth("/api/profiles");
      const data = await res.json();
      if (res.ok) {
        // Exclude self if present, sort with a slight random or compatibility score
        setSwipeQueue(data);
      }
    } catch (err) {
      console.error("Error loading swipe queue:", err);
    }
  };

  const loadMatches = async () => {
    try {
      const res = await fetchWithAuth("/api/matches");
      const data = await res.json();
      if (res.ok) {
        setMatches(data);
        if (data.length > 0 && !activeMatchId) {
          setActiveMatchId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading matches:", err);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await fetchWithAuth("/api/events");
      const data = await res.json();
      if (res.ok) {
        setEvents(data);
      }
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const res = await fetchWithAuth("/api/recommendations");
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data);
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetchWithAuth("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  // Initial trigger
  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token]);

  // Periodic polls and loader triggers when currentUser changes
  useEffect(() => {
    if (currentUser) {
      loadDiscoveryQueue();
      loadMatches();
      loadEvents();
      loadRecommendations();
      loadNotifications();

      // Setup a periodic poll for matches and messages every 5 seconds
      const timer = setInterval(() => {
        loadMatches();
        loadNotifications();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [currentUser]);

  // Swiping Actions with server persistence
  const handleSwipeLeft = async () => {
    const swiped = swipeQueue[0];
    if (!swiped) return;

    try {
      await fetchWithAuth("/api/swipe", {
        method: "POST",
        body: JSON.stringify({ toUserId: swiped.userId, action: "pass" })
      });
      setSwipeQueue(prev => prev.slice(1));
    } catch (err) {
      console.error("Pass error:", err);
    }
  };

  const handleSwipeRight = async () => {
    const swiped = swipeQueue[0];
    if (!swiped) return;

    try {
      const res = await fetchWithAuth("/api/swipe", {
        method: "POST",
        body: JSON.stringify({ toUserId: swiped.userId, action: "like" })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isMatch) {
          setNewMatchAlert(swiped);
          loadMatches();
        }
        setSwipeQueue(prev => prev.slice(1));
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  // Chat window: Send Direct Message
  const handleSendMessage = async (matchId: string, text: string) => {
    try {
      const res = await fetchWithAuth(`/api/chats/${matchId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        loadMatches();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Curate spots: Submit recommendation
  const handleAddRecommendation = async (recData: any) => {
    try {
      const res = await fetchWithAuth("/api/recommendations", {
        method: "POST",
        body: JSON.stringify({
          name: recData.name,
          category: recData.category,
          description: recData.description,
          address: recData.address,
          userTags: recData.userTags || [],
          locationCoords: recData.locationCoords,
          googleMapsUrl: recData.googleMapsUrl,
          imageUrl: recData.imageUrl
        })
      });
      if (res.ok) {
        loadRecommendations();
      } else {
        const data = await res.json();
        alert(data.error || "Could not save secret spot. Please verify your student profile first!");
      }
    } catch (err) {
      console.error("Error creating recommendation:", err);
    }
  };

  const handleDeleteRecommendation = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/recommendations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRecommendations(prev => prev.filter(r => r.id !== id));
        return true;
      } else {
        const data = await res.json();
        alert(data.error || "Could not delete recommendation. Please try again.");
        return false;
      }
    } catch (err) {
      console.error("Error deleting recommendation:", err);
      alert("An error occurred while deleting. Please try again.");
      return false;
    }
  };

  // Events: toggle RSVP on backend
  const handleToggleRsvp = async (eventId: string) => {
    try {
      const res = await fetchWithAuth(`/api/events/${eventId}/rsvp`, {
        method: "POST"
      });
      if (res.ok) {
        loadEvents();
      } else {
        const data = await res.json();
        alert(data.error || "Error updating RSVP.");
      }
    } catch (err) {
      console.error("Error RSVPing:", err);
    }
  };

  // Admin Outing Creator
  const handleAddEvent = async (title: string, description: string, date: string, time: string, location: string, category: string, price: string, maxParticipants?: number) => {
    try {
      const res = await fetchWithAuth("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title, description, date, time, location, category, price, maxParticipants
        })
      });
      if (res.ok) {
        loadEvents();
      } else {
        const data = await res.json();
        alert(data.error || "Only NEST Administrators can publish outings.");
      }
    } catch (err) {
      console.error("Error publishing event:", err);
    }
  };

  // Admin Outing Deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this official outing from the NEST Board?")) return;
    try {
      const res = await fetchWithAuth(`/api/events/${eventId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadEvents();
      }
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  // Toggle Verification state manually in editor
  const handleVerifyProfileManually = async () => {
    try {
      const res = await fetchWithAuth("/api/profiles/verify", {
        method: "POST"
      });
      if (res.ok) {
        loadProfile();
      }
    } catch (err) {
      console.error("Verification error:", err);
    }
  };

  // Profile Editor save profiles
  const handleSaveProfile = async (updated: UserProfile) => {
    try {
      const res = await fetchWithAuth("/api/profiles/update", {
        method: "POST",
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        loadProfile();
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  // Render auth screen if not logged in
  if (!token || !currentUser) {
    return <OnboardingSignUp onAuthSuccess={handleAuthSuccess} />;
  }

  const activeMatch = matches.find(m => m.id === activeMatchId);
  const isPremiumActive = accountUser?.isPremium || false;
  const isAdmin = accountUser?.isAdmin || false;

  return (
      <div className="min-h-screen text-slate-800 flex flex-col antialiased">
      
      {/* 1. TOP HEADER BANNER */}
      <header className="bg-white/30 backdrop-blur-xl border-b border-white/40 py-3 px-4 md:px-6 sticky top-0 z-30 select-none shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/nest-logo.png" alt="NEST Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-white/50" />
            <div>
              <span className="font-sans font-black tracking-tighter text-[#1F1E1D] text-lg uppercase">Nest</span>
              <span className="font-mono text-[9px] font-extrabold text-[#C85B49] tracking-widest block -mt-1 uppercase">Madrid Student Net</span>
            </div>
          </div>

          {/* Current City indicator & Verification badge */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="bg-stone-50 border border-stone-200 text-stone-600 font-sans text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              📍 Central Madrid 🇪🇸
            </span>

            {currentUser.isVerified ? (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 font-sans font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck size={14} className="text-amber-600 fill-amber-100" />
                <span>Verified Student</span>
              </span>
            ) : (
              <button 
                onClick={handleVerifyProfileManually}
                className="bg-stone-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 font-sans text-xs px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer"
                title="Click to instantly authenticate student account"
              >
                <ShieldAlert size={14} />
                <span>Click to Verify Student Profile 🛡️</span>
              </button>
            )}
          </div>

          {/* Right menu details: current user profile snippet and reset button */}
          <div className="flex items-center gap-3">
            
            {/* Sign out and create new profile */}
            <button 
              onClick={handleSignOut}
              className="font-sans text-[10px] bg-slate-900 text-rose-400 hover:bg-slate-800 font-extrabold px-3 py-1.5 rounded-xl border border-slate-800 tracking-wider shadow-sm transition active:scale-95 flex items-center gap-1 cursor-pointer"
              title="Sign Out of NEST"
            >
              Sign Out ✕
            </button>

            {/* Profile Avatar Trigger */}
            <button 
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 text-left bg-stone-50 p-1.5 rounded-xl border border-stone-200/50 hover:bg-stone-100/50 transition`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor || "from-rose-400 to-rose-600"} flex items-center justify-center text-white text-[11px] font-extrabold`}>
                {currentUser.name[0]}
              </div>
              <span className="hidden md:inline font-sans font-black text-xs text-stone-700">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB VIEWPORT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        
        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-[11px] mb-5 font-medium flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-600 fill-amber-100 animate-bounce" />
              <span><strong>NEST Notification</strong>: {notifications[0].text}</span>
            </div>
            <button 
              onClick={async () => {
                await fetchWithAuth("/api/notifications/read", { method: "POST" });
                loadNotifications();
              }}
              className="text-amber-900 hover:text-amber-950 hover:underline font-bold text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB CORRESPONDENCE PANEL RENDERING */}
        <div className="flex-1">
          {activeTab === "swipe" && (
            <div className="space-y-6">
              {/* Swipe Deck Header and Intro */}
              <div className="text-center max-w-sm mx-auto space-y-1">
                <h2 className="font-sans font-black text-2xl text-stone-900 tracking-tight">
                  Find Your Friends 🌸
                </h2>
                <p className="font-sans text-xs text-stone-500 leading-normal">
                  Swipe right to match! We match you based on shared Activities, Music tastes, Social preferences, and Lifestyle styles.
                </p>
              </div>

              {!currentUser.isVerified ? (
                <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-stone-200 p-8 shadow-xl text-center max-w-md mx-auto space-y-4 py-12 animate-fade-in">
                  <span className="text-5xl select-none block">🛡️</span>
                  <h3 className="font-sans font-black text-slate-800 text-base">Verify your student account first</h3>
                  <p className="font-sans text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    To maintain an authentic, girls-only environment in Madrid, you must verify your university student status before seeing or matching with other members.
                  </p>
                  <button
                    onClick={handleVerifyProfileManually}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-sans text-xs font-black px-6 py-2.5 rounded-xl shadow-lg transition"
                  >
                    Instantly Verify Student Profile
                  </button>
                </div>
              ) : swipeQueue.length > 0 ? (
                <SwipeCard 
                  profile={swipeQueue[0]} 
                  currentUser={currentUser} 
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                />
              ) : (
                <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 p-6 md:p-8 shadow-xl text-center max-w-md mx-auto space-y-6 py-10 animate-fade-in select-text">
                  <span className="text-5xl select-none block animate-pulse">✨🌸</span>
                  <div className="space-y-1">
                    <h3 className="font-sans font-black text-slate-800 text-base leading-snug">
                      There are no current profiles available in Madrid yet!
                    </h3>
                    <p className="font-sans text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                      NEST is a 100% verified, real student community starting empty. Fake profiles or simulated users are strictly prohibited.
                    </p>
                  </div>

                  {/* Sandbox helper instructions */}
                  <div className="border-t border-slate-200/50 pt-5 mt-4 text-left space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-mono font-extrabold uppercase text-rose-500 tracking-wider block">
                        🎓 How to test Match & Chat features?
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Since this is a real social network, you can simulate user growth simply by signing up on another account (e.g. from an Incognito tab or another browser) with some different names. Verify those accounts, and they'll show up right here in your swiping deck instantly!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[560px] md:h-[620px]">
              
              {/* LEFT COLUMN: Matches inbox lists */}
              <div className="md:col-span-4 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 p-4 flex flex-col overflow-hidden shadow-xl">
                <h3 className="font-sans font-black text-slate-900 text-base border-b border-rose-100 pb-2.5 flex items-center gap-2">
                  <MessageSquare size={18} className="text-rose-500" />
                  <span>Your Bestie Matches</span>
                </h3>

                {/* Search Bar for matches */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search matches by name..."
                    value={searchMatchQuery}
                    onChange={(e) => setSearchMatchQuery(e.target.value)}
                    className="w-full bg-white/50 border border-rose-100/60 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-2 mt-4 overflow-y-auto flex-1 select-none pr-1">
                  {matches.length > 0 ? (
                    (() => {
                      const filtered = matches.filter(m => 
                        m.profile.name.toLowerCase().includes(searchMatchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-slate-400 font-sans text-xs">
                            No matching besties found. 🌸
                          </div>
                        );
                      }
                      return filtered.map(m => {
                        const isSelected = m.id === activeMatchId;
                        const lastMsg = m.messages[m.messages.length - 1];
                        return (
                          <button
                            key={m.id}
                            onClick={() => setActiveMatchId(m.id)}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-white border-rose-400 shadow-md ring-1 ring-rose-400 scale-[1.02]"
                                : "bg-white/60 hover:bg-white/90 border-white/40"
                            }`}
                          >
                            <img
                              src={m.profile.photo}
                              alt={m.profile.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <h4 className="font-bold text-xs text-slate-800 leading-none truncate pr-1">
                                  {m.profile.name}
                                </h4>
                                <span className="text-[9px] bg-rose-50 text-rose-500 font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 border border-rose-100/50">
                                  {m.compatibilityRating}% Match
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate leading-tight font-mono">
                                {m.profile.university}
                              </p>
                              {lastMsg && (
                                <p className="text-[10px] text-slate-500 truncate mt-1.5 leading-snug font-sans">
                                  {lastMsg.senderId === accountUser?.id ? "You: " : ""}{lastMsg.text}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-8 text-slate-400 font-sans text-xs">
                      No matches yet. Keep swiping! ✨
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Chat box messages stages */}
              <div className="md:col-span-8 h-full">
                {activeMatch ? (
                  <ChatWindow
                    activeMatch={activeMatch}
                    currentUser={currentUser}
                    currentUserId={accountUser?.id || ""}
                    onSendMessage={(mId, txt) => handleSendMessage(mId, txt)}
                    plans={[]}
                    onRespondToPlan={() => {}}
                    onSuggestPlan={() => {}}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm flex flex-col items-center justify-center text-center h-full text-stone-400">
                    <MessageSquare size={36} className="text-stone-300 mb-2 animate-bounce" />
                    <p className="text-xs font-sans">Select a matched friend from the inbox to start planning outings!</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "city" && (
            <CityDiscovery 
              recommendations={recommendations} 
              onAddRecommendation={handleAddRecommendation} 
              onDeleteRecommendation={handleDeleteRecommendation}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === "communities" && (
            <Communities 
              communities={[]} 
              currentUser={currentUser} 
              onPostToCommunity={() => {}} 
            />
          )}

          {activeTab === "events" && (
            <Events
              events={events}
              onToggleRsvp={handleToggleRsvp}
              isSubscribed={isPremiumActive}
              isAdmin={isAdmin}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          )}

          {activeTab === "profile" && (
            <ProfileEditor 
              currentUser={currentUser} 
              onSaveProfile={handleSaveProfile} 
              onDeleteRecommendation={handleDeleteRecommendation}
            />
          )}

          {activeTab === "admin" && isAdmin && (
            <AdminDashboard onDeleteRecommendation={handleDeleteRecommendation} />
          )}
        </div>

      </main>

      {/* 3. DYNAMIC FULL-SCREEN MATCH ALERT POPUP */}
      {newMatchAlert && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative animate-scale-up">
            
            {/* Visual Header Matches Icon */}
            <div className="relative w-28 h-20 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-200 to-amber-200 flex items-center justify-center border-2 border-white shadow-md absolute -left-2 transform -rotate-12 z-10 font-bold text-[#C85B49] text-2xl select-none">
                {currentUser.name[0]}
              </div>
              <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${newMatchAlert.avatarColor || "from-rose-400 to-rose-600"} flex items-center justify-center border-2 border-white shadow-md absolute -right-2 transform rotate-12 z-10 font-bold text-white text-2xl select-none`}>
                {newMatchAlert.name[0]}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-stone-900 text-[#E78370] p-2 rounded-full shadow border border-stone-700 animate-pulse">
                <Heart size={18} fill="currentColor" stroke="none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-sans font-black text-2xl text-stone-900 uppercase tracking-tight">
                It's a NEST Match! 🎉
              </h3>
              <p className="font-sans text-xs text-stone-500 leading-relaxed">
                You and <strong className="text-stone-800">{newMatchAlert.name}</strong> swiped right on each other. Say hello and suggest a cool meetup in Madrid!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setNewMatchAlert(null);
                  setActiveTab("chat");
                }}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs font-black rounded-xl shadow-md transition"
              >
                Start Direct Message Chat
              </button>
              <button
                onClick={() => setNewMatchAlert(null)}
                className="w-full py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 font-sans text-xs font-black rounded-xl transition"
              >
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM NAVIGATION NAVIGATION BAR */}
      <nav className="bg-white/30 backdrop-blur-xl border-t border-white/45 py-3 px-4 sticky bottom-0 z-30 select-none shadow-lg shadow-rose-100/30 shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between gap-1 text-center">
          
          {/* Swipe */}
          <button
            onClick={() => setActiveTab("swipe")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "swipe" ? "text-[#C85B49] font-bold" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <Sparkles size={18} className={activeTab === "swipe" ? "scale-110" : ""} />
            <span className="text-[9px] font-sans">Swipes</span>
          </button>

          {/* Chat */}
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all relative ${
              activeTab === "chat" ? "text-[#C85B49] font-bold" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <MessageSquare size={18} className={activeTab === "chat" ? "scale-110" : ""} />
            <span className="text-[9px] font-sans">DM Chat</span>
            
            {/* Active notifications indicator badge */}
            {matches.length > 0 && (
              <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-[#C85B49] border border-white" />
            )}
          </button>

          {/* City Discovery */}
          <button
            onClick={() => setActiveTab("city")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "city" ? "text-[#C85B49] font-bold" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <MapPin size={18} className={activeTab === "city" ? "scale-110" : ""} />
            <span className="text-[9px] font-sans">City Guide</span>
          </button>

          {/* Events */}
          <button
            onClick={() => setActiveTab("events")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "events" ? "text-[#C85B49] font-bold" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <Calendar size={18} className={activeTab === "events" ? "scale-110" : ""} />
            <span className="text-[9px] font-sans">Events</span>
          </button>

          {/* Profile Settings */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "profile" ? "text-[#C85B49] font-bold" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <User size={18} className={activeTab === "profile" ? "scale-110" : ""} />
            <span className="text-[9px] font-sans">Profile</span>
          </button>

          {/* Admin Settings */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === "admin" ? "text-rose-600 font-bold" : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <ShieldCheck size={18} className={activeTab === "admin" ? "scale-110 text-rose-600 animate-pulse" : "text-slate-400"} />
              <span className="text-[9px] font-sans font-extrabold text-rose-600">Admin</span>
            </button>
          )}

        </div>
      </nav>

    </div>
  );
}
