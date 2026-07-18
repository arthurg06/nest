import React, { useState, useEffect } from "react";
import { ShieldCheck, Trash2, Mail, Landmark, Users, MapPin, Search, Calendar, Star, CheckCircle, ExternalLink } from "lucide-react";
import { UserProfile, Recommendation } from "../types";

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isPremium: boolean;
  createdAt: string;
  profile: {
    name: string;
    age: number;
    university: string;
    nationality: string;
    currentCity: string;
    languages: string[];
    photo: string;
  } | null;
}

interface AdminDashboardProps {
  onDeleteRecommendation?: (id: string) => Promise<boolean>;
}

export default function AdminDashboard({ onDeleteRecommendation }: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [recSearch, setRecSearch] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"users" | "spots">("users");

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingRecId, setDeletingRecId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users for admin:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchRecs = async () => {
    setIsLoadingRecs(true);
    try {
      const res = await fetch("/api/recommendations", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecs(data);
      }
    } catch (err) {
      console.error("Error fetching spots for admin:", err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRecs();
  }, []);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete user ${email}? All their profiles, chats, matches, recommendations, and active sessions will be permanently purged.`)) {
      return;
    }
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
        }
      });
      if (res.ok) {
        alert("User account and all associated data have been deleted successfully.");
        fetchUsers();
        fetchRecs(); // Reload spots as well since user's spots are deleted
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during deletion.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteRec = async (recId: string, recName: string) => {
    if (!confirm(`Are you sure you want to delete recommendation "${recName}"?`)) {
      return;
    }
    setDeletingRecId(recId);
    if (onDeleteRecommendation) {
      const success = await onDeleteRecommendation(recId);
      if (success) {
        alert("Recommendation deleted successfully.");
        fetchRecs();
      }
      setDeletingRecId(null);
    } else {
      try {
        const res = await fetch(`/api/recommendations/${recId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("nest_token")}`
          }
        });
        if (res.ok) {
          alert("Recommendation deleted successfully.");
          fetchRecs();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to delete spot.");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting spot.");
      } finally {
        setDeletingRecId(null);
      }
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const term = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.profile?.name && u.profile.name.toLowerCase().includes(term)) ||
      (u.profile?.university && u.profile.university.toLowerCase().includes(term))
    );
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 select-text animate-fade-in">
      
      {/* Admin Title Board */}
      <div className="bg-slate-900 text-white rounded-[28px] p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-sans font-black uppercase tracking-wider border border-rose-500/30">
              <ShieldCheck size={12} />
              <span>NEST Official Administration Panel</span>
            </div>
            <h2 className="font-sans font-black text-2xl tracking-tight mt-2 text-white">
              Platform Dashboard
            </h2>
            <p className="text-slate-400 text-xs mt-1 leading-normal font-sans max-w-xl">
              As an official NEST student administrator, you hold complete regulatory control over registered accounts, university verifications, and custom student recommendations.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest font-mono block">Registered Users</span>
              <strong className="text-xl font-sans text-rose-400 font-black">{users.length}</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest font-mono block">Secret Spots</span>
              <strong className="text-xl font-sans text-amber-400 font-black">{recs.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and Actions */}
      <div className="flex items-center gap-2 border-b border-white/40 pb-2">
        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 ${
            activeSubTab === "users"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white/40 text-slate-600 hover:bg-white/75"
          }`}
        >
          <Users size={14} />
          <span>View Users ({filteredUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("spots")}
          className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 ${
            activeSubTab === "spots"
              ? "bg-slate-900 text-white shadow-md"
              : "bg-white/40 text-slate-600 hover:bg-white/75"
          }`}
        >
          <MapPin size={14} />
          <span>Moderate Secret Spots ({filteredRecs.length})</span>
        </button>
      </div>

      {/* Tab Panel Content */}
      {activeSubTab === "users" ? (
        <div className="bg-white/40 backdrop-blur-xl rounded-[28px] border border-white/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-3 py-1.5 max-w-sm">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or university..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-10 text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
              <div className="animate-spin text-rose-500">⌛</div>
              <span>Fetching user records...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-sans border border-dashed border-slate-200 rounded-2xl bg-white/25">
              No registered user accounts found matching that search.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/50 shadow-sm bg-white/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-sans font-bold">
                    <th className="p-3.5">User Profile / Info</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">University</th>
                    <th className="p-3.5">Nationalities</th>
                    <th className="p-3.5">Registered</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/40 transition">
                      {/* Name & Photo */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {u.profile?.photo ? (
                            <img
                              src={u.profile.photo}
                              alt={u.profile.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-white/80 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(u.profile?.name || "U")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-sans font-bold text-slate-900">{u.profile?.name || "Unfinished Profile"}</h4>
                            {u.profile && <span className="text-[10px] text-slate-400 font-sans">Age {u.profile.age}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600 select-text">
                        {u.email}
                      </td>

                      {/* Uni */}
                      <td className="p-3.5 font-sans font-semibold text-slate-700 capitalize">
                        {u.profile?.university || <span className="text-stone-400 font-normal">N/A</span>}
                      </td>

                      {/* Nationality */}
                      <td className="p-3.5 font-sans text-slate-600 truncate max-w-[150px]" title={u.profile?.nationality}>
                        {u.profile?.nationality || <span className="text-stone-400">N/A</span>}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 font-mono text-[10px] text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Admin status */}
                      <td className="p-3.5 text-center">
                        {u.isAdmin ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200/50 rounded-full px-2.5 py-0.5 text-[9px] font-sans font-extrabold uppercase tracking-wider inline-block">
                            Admin
                          </span>
                        ) : u.profile?.isVerified ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full px-2.5 py-0.5 text-[9px] font-sans font-extrabold uppercase tracking-wider inline-block">
                            Student
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-[9px] font-sans font-extrabold uppercase tracking-wider inline-block">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        {u.isAdmin ? (
                          <span className="text-[10px] text-slate-400 italic font-sans pr-2">Admin</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingUserId !== null}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg p-2.5 transition active:scale-95 flex items-center justify-center ml-auto cursor-pointer"
                            title="Purge user and associated data securely"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-xl rounded-[28px] border border-white/60 p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 bg-white/60 border border-white/80 rounded-xl px-3 py-1.5 max-w-sm">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search spots by name, desc, address..."
              value={recSearch}
              onChange={(e) => setRecSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>

          {isLoadingRecs ? (
            <div className="text-center py-10 text-slate-500 font-sans text-xs flex flex-col items-center gap-2">
              <div className="animate-spin text-rose-500">⌛</div>
              <span>Fetching secret spots...</span>
            </div>
          ) : filteredRecs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-sans border border-dashed border-slate-200 rounded-2xl bg-white/25">
              No recommendations found matching that search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecs.map((rec) => (
                <div key={rec.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[9px] uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded font-bold font-mono">
                        {rec.category}
                      </span>
                      {rec.googleMapsUrl && (
                        <a
                          href={rec.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-800 transition p-1"
                          title="Open in Google Maps"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">{rec.name}</h4>
                    <p className="text-[11px] text-slate-500 mb-2 truncate" title={rec.address}>
                      📍 {rec.address}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      "{rec.description}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-sans">
                      By: <strong className="text-slate-700">{rec.authorName}</strong>
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
