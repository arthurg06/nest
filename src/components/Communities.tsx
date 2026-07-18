import React, { useState, useRef, useEffect } from "react";
import { Community, UserProfile, CommunityMessage } from "../types";
import { MessageSquare, Users, Globe, BookOpen, Send, ShieldCheck } from "lucide-react";

interface CommunitiesProps {
  communities: Community[];
  currentUser: UserProfile;
  onPostToCommunity: (communityId: string, message: CommunityMessage) => void;
}

export default function Communities({ communities, currentUser, onPostToCommunity }: CommunitiesProps) {
  const [activeCommunityId, setActiveCommunityId] = useState<string>(communities[0]?.id || "");
  const [groupInputText, setGroupInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeCommunity = communities.find(c => c.id === activeCommunityId);

  // Auto scroll to bottom of chat logs
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeCommunity?.messages.length, activeCommunityId]);

  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInputText.trim() || !activeCommunityId) return;

    const newMsg: CommunityMessage = {
      id: `cmsg-${Date.now()}`,
      senderName: currentUser.name,
      senderAvatarSeed: currentUser.avatarSeed,
      senderAvatarColor: currentUser.avatarColor,
      senderUni: currentUser.university,
      text: groupInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    onPostToCommunity(activeCommunityId, newMsg);
    setGroupInputText("");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "university": return <BookOpen size={14} className="text-muted-foreground" />;
      case "interests": return <Users size={14} className="text-muted-foreground" />;
      default: return <Globe size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[560px] md:h-[620px] max-w-5xl mx-auto">
      
      {/* LEFT COLUMN: Channels List */}
      <div className="lg:col-span-4 bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 p-5 flex flex-col justify-between overflow-hidden shadow-xl animate-fade-in">
        <div>
          <div className="pb-3 border-b border-border/30">
            <h3 className="font-sans font-black text-lg text-foreground tracking-tight flex items-center gap-1.5">
              <Users size={18} className="text-primary" />
              <span>NEST Communities</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 leading-normal font-sans">
              Connect with fellow female students at your uni, neighborhood, or shared social circles in Madrid.
            </p>
          </div>

          {/* Communities map */}
          <div className="space-y-2 mt-4 overflow-y-auto max-h-[360px] select-none -mx-2 px-2">
            {communities.map((comm) => {
              const isActive = comm.id === activeCommunityId;
              return (
                <button
                  key={comm.id}
                  onClick={() => setActiveCommunityId(comm.id)}
                  className={`w-full p-3 rounded-xl border font-sans text-left transition-all ${
                    isActive
                      ? "bg-card/80 border-rose-400 shadow-md shadow-rose-100/40 ring-1 ring-ring"
                      : "bg-card/30 border-border/40 hover:bg-card/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-mono font-extrabold text-muted-foreground">
                      {comm.category}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5">
                      👤 {comm.membersCount}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground leading-snug">
                    {comm.name}
                  </h4>
                  {comm.lastMessageText && (
                    <p className="text-[10px] text-muted-foreground truncate mt-1">
                      {comm.lastMessageText}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Safety Guidelines micro tip */}
        <div className="bg-accent/60 backdrop-blur-sm p-3.5 rounded-xl border border-border/45 text-[10px] font-sans text-primary leading-normal flex items-start gap-1.5 mt-3 shadow-sm">
          <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
          <span>NEST groups are strictly female-only, verified university spaces. Keep details and meetups friendly & secure!</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Community Group Chat Room */}
      <div className="lg:col-span-8 bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/60 flex flex-col overflow-hidden relative shadow-xl animate-fade-in">
        {activeCommunity ? (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border/30 bg-card/30 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-sans font-black text-sm text-foreground leading-tight">
                    {activeCommunity.name}
                  </h4>
                  <p className="font-sans text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {activeCommunity.description}
                  </p>
                </div>
                <span className="text-[10px] bg-card/50 border border-border/55 px-2.5 py-1 rounded-full font-sans font-bold text-muted-foreground shrink-0 shadow-sm">
                  {activeCommunity.membersCount} members
                </span>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent">
              {activeCommunity.messages.map((cmsg) => {
                const isMe = cmsg.senderName === currentUser.name;
                return (
                  <div
                    key={cmsg.id}
                    id={`community-msg-${cmsg.id}`}
                    className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${cmsg.senderAvatarColor} flex items-center justify-center text-white text-[11px] font-extrabold shadow-sm shrink-0`}>
                      {cmsg.senderName[0]}
                    </div>

                    {/* Speech box */}
                    <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {/* Name and Uni */}
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="font-sans font-extrabold text-[11px] text-foreground">
                          {cmsg.senderName}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {cmsg.senderUni}
                        </span>
                      </div>

                      {/* Text */}
                      <div className={`px-3.5 py-2 rounded-xl text-xs font-sans shadow-sm leading-relaxed select-text ${
                        isMe
                          ? "bg-slate-900 text-white rounded-tr-none"
                          : "bg-card/80 backdrop-blur-sm text-foreground rounded-tl-none border border-border/60"
                      }`}>
                        {cmsg.text}
                      </div>

                      {/* Time */}
                      <span className="text-[8px] text-muted-foreground font-mono mt-1 px-1">
                        {cmsg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendGroupMessage} className="p-3.5 border-t border-border/30 flex gap-2 items-center shrink-0 bg-card/30 backdrop-blur-md">
              <input
                type="text"
                placeholder={`Post to ${activeCommunity.name.split(" ")[0]}...`}
                value={groupInputText}
                onChange={(e) => setGroupInputText(e.target.value)}
                className="flex-1 bg-card/40 border border-border/50 rounded-xl px-4 py-2 text-xs font-sans text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition active:scale-95 shadow-md shadow-rose-200/50"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
            <MessageSquare size={36} className="mb-2 text-slate-300" />
            <p className="text-xs font-sans">Select a community circle to join the group conversation</p>
          </div>
        )}
      </div>

    </div>
  );
}
