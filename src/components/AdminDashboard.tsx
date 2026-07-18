import React, { useState, useEffect } from "react";
import { ShieldCheck, Trash2, Users, MapPin, Search, ExternalLink, Ban, RotateCcw, BadgeCheck, XCircle } from "lucide-react";
import { Recommendation } from "../types";
import { apiUrl } from "../lib/api";

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  role: "admin" | "member";
  status: "active" | "suspended";
  source: string;
  isPremium: boolean;
  premiumExpiresAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  profile: {
    name: string;
    age: number;
    university: string;
    nationality: string;
    currentCity: string;
    languages: string[];
    photo: string;
    isVerified: boolean;
    verificationStatus: string;
  } | null;
}

interface VerificationRequest {
  userId: string;
  name: string;
  age: number;
  photo: string;
  university: string;
  nationality: string;
  email?: string;
  accountCreatedAt?: string;
  accountStatus?: string;
  verificationStatus: string;
  verification: {
    university?: string;
    universityEmail?: string;
    userNote?: string;
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
}

interface AdminDashboardProps {
  onDeleteRecommendation?: (id: string) => Promise<boolean>;
}

const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("nest_token")}` });

const VERIFICATION_BADGE: Record<string, string> = {
  approved: "bg-success-muted text-success border-success-border",
  pending: "bg-sky-50 text-sky-700 border-sky-200/50",
  rejected: "bg-accent/30 text-primary border-border/50",
  unsubmitted: "bg-muted text-muted-foreground border-border"
};

export default function AdminDashboard({ onDeleteRecommendation }: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [recSearch, setRecSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<string>("pending");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"verifications" | "users" | "spots">("verifications");

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [deletingRecId, setDeletingRecId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState("");

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 4000);
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(apiUrl("/api/admin/users"), { headers: authHeaders() });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error("Error fetching users for admin:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchRecs = async () => {
    setIsLoadingRecs(true);
    try {
      const res = await fetch(apiUrl("/api/recommendations"), { headers: authHeaders() });
      if (res.ok) setRecs(await res.json());
    } catch (err) {
      console.error("Error fetching spots for admin:", err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const fetchVerifications = async (status = verificationFilter) => {
    setIsLoadingVerifications(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/verifications?status=${encodeURIComponent(status)}`), { headers: authHeaders() });
      if (res.ok) setVerifications(await res.json());
    } catch (err) {
      console.error("Error fetching verifications:", err);
    } finally {
      setIsLoadingVerifications(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRecs();
    fetchVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchVerifications(verificationFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationFilter]);

  const refreshAll = () => {
    fetchUsers();
    fetchVerifications();
  };

  const handleApprove = async (userId: string, name: string) => {
    setBusyUserId(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/verifications/${userId}/approve`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        notify(`${name} approved.`);
        refreshAll();
      } else {
        notify((await res.json()).error || "Could not approve.");
      }
    } catch {
      notify("Could not approve — network error.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    if (!rejectReason.trim()) {
      notify("A rejection reason is required — it is shown to the member.");
      return;
    }
    setBusyUserId(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/verifications/${userId}/reject`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      if (res.ok) {
        notify(`${name}'s request rejected.`);
        setRejectingUserId(null);
        setRejectReason("");
        refreshAll();
      } else {
        notify((await res.json()).error || "Could not reject.");
      }
    } catch {
      notify("Could not reject — network error.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSuspendToggle = async (user: AdminUser) => {
    const action = user.status === "suspended" ? "restore" : "suspend";
    if (action === "suspend" && !confirm(`Suspend ${user.email}? She will be signed out everywhere and hidden from discovery.`)) {
      return;
    }
    setBusyUserId(user.id);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${user.id}/${action}`), { method: "POST", headers: authHeaders() });
      if (res.ok) {
        notify(action === "suspend" ? "Account suspended." : "Account restored.");
        fetchUsers();
      } else {
        notify((await res.json()).error || `Could not ${action}.`);
      }
    } catch {
      notify(`Could not ${action} — network error.`);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? All her profile data, chats, matches, and sessions will be removed. This cannot be undone.`)) {
      return;
    }
    setBusyUserId(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        notify("Account deleted.");
        fetchUsers();
        fetchRecs();
        fetchVerifications();
      } else {
        notify((await res.json()).error || "Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      notify("Error occurred during deletion.");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteRec = async (recId: string, recName: string) => {
    if (!confirm(`Delete recommendation "${recName}"?`)) return;
    setDeletingRecId(recId);
    try {
      if (onDeleteRecommendation) {
        const success = await onDeleteRecommendation(recId);
        if (success) {
          notify("Recommendation deleted.");
          fetchRecs();
        }
      } else {
        const res = await fetch(apiUrl(`/api/recommendations/${recId}`), { method: "DELETE", headers: authHeaders() });
        if (res.ok) {
          notify("Recommendation deleted.");
          fetchRecs();
        } else {
          notify((await res.json()).error || "Failed to delete spot.");
        }
      }
    } catch (err) {
      console.error(err);
      notify("Error deleting spot.");
    } finally {
      setDeletingRecId(null);
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    const matchesTerm =
      u.email.toLowerCase().includes(term) ||
      (u.profile?.name && u.profile.name.toLowerCase().includes(term)) ||
      (u.profile?.university && u.profile.university.toLowerCase().includes(term));
    const matchesStatus =
      userStatusFilter === "all" ? true :
      userStatusFilter === "suspended" ? u.status === "suspended" :
      userStatusFilter === "premium" ? u.isPremium :
      userStatusFilter === "admins" ? u.role === "admin" :
      (u.profile?.verificationStatus || "unsubmitted") === userStatusFilter;
    return matchesTerm && matchesStatus;
  });

  const filteredRecs = recs.filter(r => {
    const term = recSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      r.address.toLowerCase().includes(term) ||
      r.authorName.toLowerCase().includes(term)
    );
  });

  const pendingCount = users.filter(u => u.profile?.verificationStatus === "pending").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-text animate-fade-in">

      {/* Header */}
      <div className="bg-slate-900 text-white rounded-[28px] p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-sans font-black uppercase tracking-wider border border-rose-500/30">
              <ShieldCheck size={12} />
              <span>NEST Administration</span>
            </div>
            <h2 className="font-sans font-black text-2xl tracking-tight mt-2 text-white">
              Platform Dashboard
            </h2>
            <p className="text-muted-foreground text-xs mt-1 leading-normal font-sans max-w-xl">
              Member management, verification review, and content moderation.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest font-mono block">Members</span>
              <strong className="text-xl font-sans text-rose-400 font-black">{users.length}</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest font-mono block">Pending review</span>
              <strong className="text-xl font-sans text-sky-400 font-black">{pendingCount}</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest font-mono block">Spots</span>
              <strong className="text-xl font-sans text-amber-400 font-black">{recs.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="bg-slate-900 text-white text-xs font-sans font-bold px-4 py-3 rounded-2xl shadow-lg animate-fade-in">
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("verifications")}
          className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "verifications" ? "bg-slate-900 text-white shadow-md" : "bg-card/40 text-muted-foreground hover:bg-card/75"
          }`}
        >
          <BadgeCheck size={14} />
          <span>Verification{pendingCount > 0 ? ` (${pendingCount})` : ""}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "users" ? "bg-slate-900 text-white shadow-md" : "bg-card/40 text-muted-foreground hover:bg-card/75"
          }`}
        >
          <Users size={14} />
          <span>Members ({filteredUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("spots")}
          className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "spots" ? "bg-slate-900 text-white shadow-md" : "bg-card/40 text-muted-foreground hover:bg-card/75"
          }`}
        >
          <MapPin size={14} />
          <span>Spots ({filteredRecs.length})</span>
        </button>
      </div>

      {/* VERIFICATION REVIEW */}
      {activeSubTab === "verifications" && (
        <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["pending", "rejected", "approved", "all"].map(f => (
              <button
                key={f}
                onClick={() => setVerificationFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-sans font-bold capitalize transition ${
                  verificationFilter === f ? "bg-slate-900 text-white" : "bg-card/60 text-muted-foreground hover:bg-card"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {isLoadingVerifications ? (
            <div className="text-center py-10 text-muted-foreground font-sans text-xs">Loading verification requests…</div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-sans border border-dashed border-border rounded-2xl bg-card/25">
              {verificationFilter === "pending" ? "No requests waiting for review." : `No ${verificationFilter} requests.`}
            </div>
          ) : (
            <div className="space-y-3">
              {verifications.map(v => (
                <div key={v.userId} className="bg-card/80 rounded-2xl border border-border/60 p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {v.photo ? (
                        <img src={v.photo} alt={v.name} referrerPolicy="no-referrer" className="w-11 h-11 rounded-xl object-cover border border-border/80 shadow-sm shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-border text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
                          {(v.name || "?")[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-sans font-bold text-sm text-foreground">{v.name}, {v.age}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-extrabold uppercase border ${VERIFICATION_BADGE[v.verificationStatus] || VERIFICATION_BADGE.unsubmitted}`}>
                            {v.verificationStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1.5 space-y-0.5">
                          <p><span className="font-bold">Account email:</span> <span className="font-mono">{v.email}</span></p>
                          <p><span className="font-bold">University:</span> {v.verification.university || v.university || "—"}</p>
                          <p><span className="font-bold">University email:</span> <span className="font-mono">{v.verification.universityEmail || "—"}</span></p>
                          {v.verification.userNote && (
                            <p className="text-muted-foreground italic">“{v.verification.userNote}”</p>
                          )}
                          {v.verification.submittedAt && (
                            <p className="text-[10px] text-muted-foreground">
                              Submitted {new Date(v.verification.submittedAt).toLocaleString()}
                              {v.verification.reviewedAt && ` · Reviewed ${new Date(v.verification.reviewedAt).toLocaleString()}`}
                            </p>
                          )}
                          {v.verificationStatus === "rejected" && v.verification.rejectionReason && (
                            <p className="text-[10px] text-primary">Rejected: {v.verification.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {v.verificationStatus !== "approved" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(v.userId, v.name)}
                          disabled={busyUserId !== null}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <BadgeCheck size={13} />
                          <span>Approve</span>
                        </button>
                        {rejectingUserId !== v.userId && (
                          <button
                            onClick={() => {
                              setRejectingUserId(v.userId);
                              setRejectReason("");
                            }}
                            disabled={busyUserId !== null}
                            className="bg-accent/30 hover:bg-accent/60 text-primary border border-border text-[11px] font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {rejectingUserId === v.userId && (
                    <div className="mt-3 bg-accent/60 border border-border/70 rounded-xl p-3 space-y-2">
                      <label className="text-[10px] font-sans font-bold text-primary block">
                        Reason (shown to the member)
                      </label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. The email provided is not a university address."
                        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingUserId(null)}
                          className="text-[11px] font-bold text-muted-foreground px-3 py-1.5 hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReject(v.userId, v.name)}
                          disabled={busyUserId !== null || !rejectReason.trim()}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-[11px] font-black px-3.5 py-1.5 rounded-lg transition disabled:opacity-40"
                        >
                          Confirm rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MEMBERS */}
      {activeSubTab === "users" && (
        <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 bg-card/60 border border-border/80 rounded-xl px-3 py-1.5 max-w-sm w-full">
              <Search size={14} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or university…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none w-full"
              />
            </div>
            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="bg-card/60 border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none"
            >
              <option value="all">All members</option>
              <option value="pending">Verification pending</option>
              <option value="approved">Verified</option>
              <option value="rejected">Verification rejected</option>
              <option value="unsubmitted">Not submitted</option>
              <option value="suspended">Suspended</option>
              <option value="premium">Premium</option>
              <option value="admins">Admins</option>
            </select>
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-10 text-muted-foreground font-sans text-xs">Loading members…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-sans border border-dashed border-border rounded-2xl bg-card/25">
              No members match this search or filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm bg-card/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/80 border-b border-border text-muted-foreground font-sans font-bold">
                    <th className="p-3.5">Member</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">University</th>
                    <th className="p-3.5">Joined</th>
                    <th className="p-3.5">Last active</th>
                    <th className="p-3.5 text-center">Verification</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-card/40 transition ${u.status === "suspended" ? "opacity-60" : ""}`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {u.profile?.photo ? (
                            <img
                              src={u.profile.photo}
                              alt={u.profile.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-border/80 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-border text-muted-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(u.profile?.name || "U")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-sans font-bold text-foreground">{u.profile?.name || "Unfinished profile"}</h4>
                            <span className="text-[10px] text-muted-foreground font-sans">
                              {u.profile ? `Age ${u.profile.age}` : ""}{u.isPremium ? " · Premium" : ""}{u.role === "admin" ? " · Admin" : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground select-text">{u.email}</td>
                      <td className="p-3.5 font-sans font-semibold text-foreground capitalize">
                        {u.profile?.university || <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-muted-foreground">
                        {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-extrabold uppercase border inline-block ${VERIFICATION_BADGE[u.profile?.verificationStatus || "unsubmitted"]}`}>
                          {u.profile?.verificationStatus || "unsubmitted"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-extrabold uppercase border inline-block ${
                          u.status === "suspended" ? "bg-accent/30 text-primary border-border" : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {u.role === "admin" ? (
                          <span className="text-[10px] text-muted-foreground italic font-sans pr-2">Admin</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSuspendToggle(u)}
                              disabled={busyUserId !== null}
                              className={`p-2 rounded-lg border transition cursor-pointer ${
                                u.status === "suspended"
                                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                              }`}
                              title={u.status === "suspended" ? "Restore account" : "Suspend account"}
                            >
                              {u.status === "suspended" ? <RotateCcw size={13} /> : <Ban size={13} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={busyUserId !== null}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg p-2 transition cursor-pointer"
                              title="Permanently delete account"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SPOTS */}
      {activeSubTab === "spots" && (
        <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 bg-card/60 border border-border/80 rounded-xl px-3 py-1.5 max-w-sm">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search spots by name, description, address…"
              value={recSearch}
              onChange={(e) => setRecSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none w-full"
            />
          </div>

          {isLoadingRecs ? (
            <div className="text-center py-10 text-muted-foreground font-sans text-xs">Loading spots…</div>
          ) : filteredRecs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs font-sans border border-dashed border-border rounded-2xl bg-card/25">
              No recommendations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecs.map((rec) => (
                <div key={rec.id} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[9px] uppercase tracking-wider bg-accent/30 text-primary border border-border/70 px-2 py-0.5 rounded font-bold font-mono">
                        {rec.category}
                      </span>
                      {rec.googleMapsUrl && (
                        <a
                          href={rec.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition p-1"
                          title="Open in Google Maps"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-foreground leading-tight mb-1">{rec.name}</h4>
                    <p className="text-[11px] text-muted-foreground mb-2 truncate" title={rec.address}>
                      📍 {rec.address}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-muted/40 p-2.5 rounded-xl border border-border/60 mb-3">
                      “{rec.description}”
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-sans">
                      By: <strong className="text-foreground">{rec.authorName}</strong>
                    </span>
                    <button
                      onClick={() => handleDeleteRec(rec.id, rec.name)}
                      disabled={deletingRecId !== null}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-red-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
