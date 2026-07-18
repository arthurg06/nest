import React, { useState, useEffect } from "react";
import { UserProfile, Match, Message, Community, Event, Recommendation, Plan, CommunityMessage } from "./types";
import { calculateCompatibility } from "./data";
import SwipeCard from "./components/SwipeCard";
import ChatWindow from "./components/ChatWindow";
import type { OutingDraft } from "./components/OutingPlanner";
import CityDiscovery from "./components/CityDiscovery";
import Communities from "./components/Communities";
import Events from "./components/Events";
import ProfileEditor from "./components/ProfileEditor";
import OnboardingSignUp from "./components/OnboardingSignUp";
import AdminDashboard from "./components/AdminDashboard";
import {
  Sparkles, MessageSquare, MapPin, Users, Calendar, User,
  Bell, Heart, Check, X, ShieldCheck, HelpCircle, RefreshCw, Key
} from "lucide-react";
import { apiUrl } from "./lib/api";

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
  // Set when another screen sends the member to a specific part of her
  // profile (e.g. "Verify my status" → the verification card).
  const [profileFocus, setProfileFocus] = useState<string | null>(null);

  // Submissions, Outings, Spots
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string>("");

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

  // Sign out: invalidate the session server-side, then clear local state.
  // Account data is preserved — deletion is a separate, explicit action in
  // the profile settings.
  const handleSignOut = () => {
    const currentToken = token || localStorage.getItem("nest_token");
    if (currentToken) {
      // Plain fetch (not fetchWithAuth) to avoid sign-out recursion on 401,
      // and fire-and-forget so a network failure never blocks local sign-out.
      fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentToken}` }
      }).catch(() => {});
    }
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
  const loadProfile = async (): Promise<boolean> => {
    try {
      const res = await fetchWithAuth("/api/auth/me");
      const data = await res.json();
      if (res.ok) {
        setAccountUser(data.user);
        setCurrentUser(data.profile);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Error loading profile:", err);
      return false;
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
        // Preselect a conversation on wide screens only: on phones the list
        // is the first thing she should see.
        if (data.length > 0 && !activeMatchId && window.innerWidth >= 768) {
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

  // Only unread notifications drive the banner. The endpoint returns the full
  // history (read included), so filtering here is what makes "Dismiss" stick.
  const loadNotifications = async () => {
    try {
      const res = await fetchWithAuth("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        setNotifications(Array.isArray(data) ? data.filter((n: any) => !n.read) : []);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  const dismissNotifications = async () => {
    setNotifications([]); // clear immediately; the write is confirmation only
    try {
      await fetchWithAuth("/api/notifications/read", { method: "POST" });
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
    loadNotifications();
  };

  const loadSubscription = async () => {
    try {
      const res = await fetchWithAuth("/api/subscription/status");
      const data = await res.json();
      if (res.ok) {
        setSubscription(data);
      }
    } catch (err) {
      console.error("Error loading subscription status:", err);
    }
  };

  // Returning from Stripe Checkout: refresh entitlement (webhooks are the
  // source of truth) and show a lightweight, truthful banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setCheckoutBanner("Thanks! Your payment is being confirmed by Stripe — Premium activates as soon as the confirmation arrives.");
    } else if (checkout === "cancelled") {
      setCheckoutBanner("Checkout was cancelled. You have not been charged.");
    }
    if (checkout) {
      params.delete("checkout");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, []);

  // Initial trigger. If the stored session can't be restored (expired token
  // or unreachable server), fall back to the sign-in screen instead of an
  // endless splash.
  useEffect(() => {
    if (token) {
      loadProfile().then(ok => {
        if (!ok) handleSignOut();
      });
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
      loadSubscription();

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

  // Outing proposals. Both handlers resolve to an error message (or null on
  // success) so the planner can show exactly what the server said.
  const handleSuggestPlan = async (matchId: string, draft: OutingDraft): Promise<string | null> => {
    try {
      const res = await fetchWithAuth(`/api/chats/${matchId}/plans`, {
        method: "POST",
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Could not send this invite.";
      await loadMatches();
      return null;
    } catch (err) {
      console.error("Error sending outing proposal:", err);
      return "Could not send this invite. Please try again.";
    }
  };

  const handleRespondToPlan = async (planId: string, status: "accepted" | "declined"): Promise<string | null> => {
    try {
      const res = await fetchWithAuth(`/api/plans/${planId}/respond`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Could not answer this invite.";
      await loadMatches();
      return null;
    } catch (err) {
      console.error("Error answering outing proposal:", err);
      return "Could not answer this invite. Please try again.";
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

  // Branded splash while an existing session is being restored
  if (token && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 select-none">
        <img
          src="/icons/nest-512.png"
          alt="NEST logo"
          className="w-24 h-24 rounded-[28px] shadow-xl animate-pulse"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Madrid Student Net
        </span>
      </div>
    );
  }

  // Render auth screen if not logged in
  if (!token || !currentUser) {
    return <OnboardingSignUp onAuthSuccess={handleAuthSuccess} />;
  }

  const activeMatch = matches.find(m => m.id === activeMatchId);
  const isPremiumActive = accountUser?.isPremium || false;
  const isAdmin = accountUser?.isAdmin || false;

  // App shell: exactly one viewport tall, with the tab panel as the only
  // scrolling region — the bottom navigation is a flex row here, so it can
  // never float over the content the way a sticky bar does.
  return (
      <div className="h-[100dvh] overflow-hidden text-foreground flex flex-col antialiased">
      
      {/* 1. TOP HEADER BANNER — brand identity only; personal status lives
          beside the member's name on her profile, not in the global header */}
      <header className="bg-sidebar/85 backdrop-blur-xl border-b border-sidebar-border py-3 px-4 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0 z-30 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/icons/nest-192.png" alt="NEST logo" className="w-9 h-9 rounded-xl object-cover shadow-sm border border-border/50" />
            <div>
              <span className="font-display font-semibold tracking-tight text-foreground text-lg lowercase">nest</span>
              <span className="font-mono text-[9px] font-bold text-primary tracking-widest block -mt-1 uppercase">Madrid</span>
            </div>
          </div>

          {/* Right menu details: current user profile snippet and reset button */}
          <div className="flex items-center gap-3">
            
            {/* Sign out (non-destructive; account data is kept) */}
            <button
              onClick={handleSignOut}
              className="font-sans text-[11px] text-muted-foreground hover:text-foreground font-bold px-2.5 py-3 -my-1.5 rounded-lg transition cursor-pointer"
              title="Sign out of NEST"
            >
              Sign out
            </button>

            {/* Profile Avatar Trigger */}
            <button 
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 text-left bg-card p-1.5 rounded-xl border border-border/50 hover:bg-muted/50 transition`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor || "from-rose-400 to-rose-600"} flex items-center justify-center text-white text-[11px] font-extrabold`}>
                {currentUser.name[0]}
              </div>
              <span className="hidden md:inline font-sans font-black text-xs text-foreground">
                {currentUser.name.split(" ")[0]}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB VIEWPORT CONTAINER */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col">
        
        {/* Checkout return banner */}
        {checkoutBanner && (
          <div className="bg-card border border-border text-foreground p-3 rounded-2xl text-[11px] mb-5 font-medium flex items-center justify-between shadow-sm animate-fade-in">
            <span>{checkoutBanner}</span>
            <button
              onClick={() => setCheckoutBanner("")}
              className="text-muted-foreground hover:text-foreground font-bold text-[10px] ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-[11px] mb-5 font-medium flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-600 fill-amber-100" />
              <span>{notifications[0].text}</span>
            </div>
            <button
              onClick={dismissNotifications}
              className="text-amber-900 hover:text-amber-950 hover:underline font-bold text-[10px] px-2 py-2 -my-1 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB PANELS — the chat manages its own internal scrolling; every
            other tab scrolls as a normal page inside this region. */}
        <div className={`flex-1 min-h-0 ${activeTab === "chat" ? "overflow-hidden" : "overflow-y-auto -mx-1 px-1"}`}>
          {activeTab === "swipe" && (
            <div className="space-y-6">
              {/* Swipe Deck Header and Intro */}
              <div className="text-center max-w-sm mx-auto space-y-1">
                <h2 className="font-display text-3xl text-foreground">
                  Find your people
                </h2>
                <p className="font-sans text-xs text-muted-foreground leading-normal">
                  Matched by shared interests, lifestyle, and languages.
                </p>
              </div>

              {/* Verification nudge — informative, never a wall: members can
                  browse and match while their review is in progress. */}
              {currentUser.verificationStatus !== "approved" && (
                <div className="max-w-2xl mx-auto bg-card/50 border border-border/70 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-bold text-xs text-foreground">
                      {currentUser.verificationStatus === "pending"
                        ? "Your student verification is under review"
                        : currentUser.verificationStatus === "rejected"
                        ? "Your verification wasn't approved"
                        : "Get your Verified Student badge"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                      {currentUser.verificationStatus === "pending"
                        ? "We'll let you know as soon as an admin has reviewed it."
                        : currentUser.verificationStatus === "rejected"
                        ? currentUser.verification?.rejectionReason || "Update your details and send it again."
                        : "It takes a minute and shows others you're a real student here."}
                    </p>
                  </div>
                  {currentUser.verificationStatus !== "pending" && (
                    <button
                      onClick={() => {
                        setProfileFocus("verification");
                        setActiveTab("profile");
                      }}
                      className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[11px] font-black px-4 py-2.5 rounded-xl shadow-pop transition"
                    >
                      {currentUser.verificationStatus === "rejected" ? "Update & resubmit" : "Verify my status"}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* LEFT — your circle: everyone you already matched with */}
                <aside className="md:col-span-4 order-2 md:order-1 bg-card/40 backdrop-blur-xl rounded-2xl border border-border/60 p-4 shadow-sm">
                  <h3 className="font-sans font-black text-foreground text-sm flex items-center gap-2">
                    <Heart size={15} className="text-primary" />
                    <span>Your circle</span>
                    {matches.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">({matches.length})</span>
                    )}
                  </h3>

                  {matches.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground leading-normal mt-3">
                      Nobody yet. When you and someone else both say yes, she shows up here.
                    </p>
                  ) : (
                    <div className="mt-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:max-h-[420px] md:overflow-y-auto -mx-2 px-2 pb-1">
                      {matches.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveMatchId(m.id);
                            setActiveTab("chat");
                          }}
                          className="shrink-0 md:shrink w-20 md:w-auto flex flex-col md:flex-row md:items-center gap-2 p-2 rounded-xl border border-border/40 bg-card/60 hover:bg-card transition text-center md:text-left"
                        >
                          <img
                            src={m.profile.photo}
                            alt={m.profile.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 md:w-10 md:h-10 rounded-xl object-cover mx-auto md:mx-0 shrink-0"
                          />
                          <span className="min-w-0 md:flex-1">
                            <span className="block text-[11px] font-bold text-foreground truncate">
                              {m.profile.name.split(" ")[0]}
                            </span>
                            <span className="hidden md:block text-[10px] text-muted-foreground truncate">
                              {m.messages.length > 0 ? m.messages[m.messages.length - 1].text : "Say hi"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>

                {/* RIGHT — new people to meet */}
                <div className="md:col-span-8 order-1 md:order-2">
                  {swipeQueue.length > 0 ? (
                    <SwipeCard
                      profile={swipeQueue[0]}
                      currentUser={currentUser}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                    />
                  ) : (
                    <div className="bg-card/40 backdrop-blur-xl rounded-[32px] border border-border/60 p-6 md:p-8 shadow-xl text-center space-y-5 py-10 animate-fade-in select-text">
                      <span className="text-5xl select-none block">✨🌸</span>
                      <div className="space-y-1">
                        <h3 className="font-sans font-black text-foreground text-base leading-snug">
                          You're all caught up
                        </h3>
                        <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                          You've seen everyone for now. New members show up here as they join.
                        </p>
                      </div>
                      {events.length > 0 && (
                        <button
                          onClick={() => setActiveTab("events")}
                          className="bg-card border border-border text-foreground font-sans text-[11px] font-bold px-4 py-2.5 rounded-xl hover:bg-muted transition"
                        >
                          See what's coming up
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full min-h-0">

              {/* LEFT COLUMN: Matches inbox. On phones it gives way to the
                  open conversation instead of splitting the small screen. */}
              <div className={`md:col-span-4 bg-card/40 backdrop-blur-xl rounded-2xl border border-border/60 p-4 flex-col overflow-hidden shadow-xl min-h-0 ${
                activeMatch ? "hidden md:flex" : "flex"
              }`}>
                <h3 className="font-sans font-black text-foreground text-base border-b border-border/70 pb-2.5 flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary" />
                  <span>Your matches</span>
                </h3>

                {/* Search Bar for matches */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search matches by name..."
                    value={searchMatchQuery}
                    onChange={(e) => setSearchMatchQuery(e.target.value)}
                    className="w-full bg-card/50 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2 mt-4 overflow-y-auto flex-1 select-none -mx-2 px-2">
                  {matches.length > 0 ? (
                    (() => {
                      const filtered = matches.filter(m => 
                        m.profile.name.toLowerCase().includes(searchMatchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground font-sans text-xs">
                            No matches found.
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
                                ? "bg-card border-rose-400 shadow-md ring-1 ring-ring scale-[1.02]"
                                : "bg-card/60 hover:bg-card/90 border-border/40"
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
                                <h4 className="font-bold text-xs text-foreground leading-none truncate pr-1">
                                  {m.profile.name}
                                </h4>
                                <span className="text-[9px] bg-accent/30 text-primary font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 border border-border/50">
                                  {m.compatibilityRating}% Match
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate leading-tight font-mono">
                                {m.profile.university}
                              </p>
                              {lastMsg && (
                                <p className="text-[10px] text-muted-foreground truncate mt-1.5 leading-snug font-sans">
                                  {lastMsg.senderId === accountUser?.id ? "You: " : ""}{lastMsg.text}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground font-sans text-xs">
                      No matches yet.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: the open conversation */}
              <div className={`md:col-span-8 h-full min-h-0 flex-col gap-2 ${activeMatch ? "flex" : "hidden md:flex"}`}>
                {activeMatch ? (
                  <>
                    {/* Back to the inbox — phones only */}
                    <button
                      onClick={() => setActiveMatchId("")}
                      className="md:hidden self-start text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-2 -ml-2 shrink-0"
                    >
                      ← All chats
                    </button>
                    <div className="flex-1 min-h-0">
                      <ChatWindow
                        activeMatch={activeMatch}
                        currentUser={currentUser}
                        currentUserId={accountUser?.id || ""}
                        recommendations={recommendations}
                        onSendMessage={(mId, txt) => handleSendMessage(mId, txt)}
                        onSuggestPlan={handleSuggestPlan}
                        onRespondToPlan={handleRespondToPlan}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-card/40 rounded-2xl border border-border/60 p-8 shadow-sm flex flex-col items-center justify-center text-center h-full text-muted-foreground">
                    <MessageSquare size={32} className="text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-sans">Pick a conversation to start planning something.</p>
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
              subscription={subscription}
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
              onSignOut={handleSignOut}
              onRefreshProfile={loadProfile}
              focusSection={profileFocus}
              onFocusHandled={() => setProfileFocus(null)}
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
          <div className="bg-card rounded-3xl border border-border p-6 md:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative animate-scale-up">
            
            {/* Visual Header Matches Icon */}
            <div className="relative w-28 h-20 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-200 to-amber-200 flex items-center justify-center border-2 border-white shadow-md absolute -left-2 transform -rotate-12 z-10 font-bold text-primary text-2xl select-none">
                {currentUser.name[0]}
              </div>
              <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${newMatchAlert.avatarColor || "from-rose-400 to-rose-600"} flex items-center justify-center border-2 border-white shadow-md absolute -right-2 transform rotate-12 z-10 font-bold text-white text-2xl select-none`}>
                {newMatchAlert.name[0]}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-stone-900 text-rose-300 p-2 rounded-full shadow border border-stone-700 animate-pulse">
                <Heart size={18} fill="currentColor" stroke="none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display text-3xl text-foreground">
                It's a match
              </h3>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                You and <strong className="text-foreground">{newMatchAlert.name}</strong> liked each other. Say hola and plan something.
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
                Send a message
              </button>
              <button
                onClick={() => setNewMatchAlert(null)}
                className="w-full py-2.5 border border-border hover:bg-card text-muted-foreground font-sans text-xs font-black rounded-xl transition"
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM NAVIGATION BAR (safe-area aware for mobile devices) */}
      <nav className="bg-sidebar/85 backdrop-blur-xl border-t border-sidebar-border pt-2.5 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] z-30 select-none shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between gap-1 text-center">
          
          {/* Swipe */}
          <button
            onClick={() => setActiveTab("swipe")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "swipe" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles size={18} className={activeTab === "swipe" ? "scale-110" : ""} />
            <span className="text-[10px] font-sans">Swipes</span>
          </button>

          {/* Chat */}
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all relative ${
              activeTab === "chat" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare size={18} className={activeTab === "chat" ? "scale-110" : ""} />
            <span className="text-[10px] font-sans">Chat</span>
            
            {/* Active notifications indicator badge */}
            {matches.length > 0 && (
              <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-primary border border-white" />
            )}
          </button>

          {/* City Discovery */}
          <button
            onClick={() => setActiveTab("city")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "city" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin size={18} className={activeTab === "city" ? "scale-110" : ""} />
            <span className="text-[10px] font-sans">City</span>
          </button>

          {/* Events */}
          <button
            onClick={() => setActiveTab("events")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "events" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={18} className={activeTab === "events" ? "scale-110" : ""} />
            <span className="text-[10px] font-sans">Events</span>
          </button>

          {/* Profile Settings */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
              activeTab === "profile" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User size={18} className={activeTab === "profile" ? "scale-110" : ""} />
            <span className="text-[10px] font-sans">Profile</span>
          </button>

          {/* Admin Settings */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === "admin" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck size={18} className={activeTab === "admin" ? "scale-110 text-primary animate-pulse" : "text-muted-foreground"} />
              <span className="text-[10px] font-sans font-extrabold text-primary">Admin</span>
            </button>
          )}

        </div>
      </nav>

    </div>
  );
}
