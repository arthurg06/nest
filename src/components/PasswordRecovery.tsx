import React, { useEffect, useState } from "react";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { apiUrl } from "../lib/api";

// Two small screens that live outside the signed-in app: asking for a reset
// link, and choosing a new password from one. Both are reachable without a
// session, which is the whole point.

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setEmailConfigured(data.emailConfigured !== false);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Check your inbox</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If that address belongs to a NEST account, a reset link is on its way. It works once and expires in an hour.
        </p>
        {!emailConfigured && (
          <p className="text-[11px] text-foreground bg-accent/40 border border-border/70 rounded-xl p-3 leading-relaxed">
            Heads up: email delivery isn't switched on yet, so the message won't actually arrive.
            Ask the NEST team directly and they can send you a reset link.
          </p>
        )}
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-primary hover:text-primary/80 font-bold px-2 py-2 -ml-2"
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Forgot your password?</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Enter the email you sign in with and we'll send you a link to choose a new password.
        </p>
      </div>

      {error && (
        <p className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-2xl text-xs">{error}</p>
      )}

      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block" htmlFor="recovery-email">
          Personal Email
        </label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="recovery-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full bg-card/60 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-sans text-xs font-black py-3 rounded-xl transition shadow-pop"
      >
        {sending ? "Sending…" : "Send me a link"}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-muted-foreground hover:text-foreground font-bold py-2 flex items-center justify-center gap-1"
      >
        <ArrowLeft size={13} />
        <span>Back to log in</span>
      </button>
    </form>
  );
}

interface ResetPasswordProps {
  token: string;
  onDone: () => void;
}

export function ResetPassword({ token, onDone }: ResetPasswordProps) {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/api/auth/reset-password/${encodeURIComponent(token)}`))
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setValid(Boolean(data.valid));
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset your password.");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Could not reset your password.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Checking your link…</p>;
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <span className="text-4xl block select-none">🔑</span>
        <h3 className="font-sans font-black text-foreground text-lg">Password changed</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You can sign in with your new password now. Any other device stayed signed out.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black py-3 rounded-xl transition shadow-pop"
        >
          Go to log in
        </button>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="space-y-4 text-center">
        <span className="text-4xl block select-none">⏳</span>
        <h3 className="font-sans font-black text-foreground text-lg">This link has expired</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Reset links work once and last an hour. Ask for a new one and it'll be ready in a moment.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-xs font-black py-3 rounded-xl transition shadow-pop"
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h3 className="font-sans font-black text-foreground text-lg tracking-tight">Choose a new password</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">At least 6 characters.</p>
      </div>

      {error && (
        <p className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-2xl text-xs">{error}</p>
      )}

      {[
        { id: "new-password", label: "New password", value: password, set: setPassword },
        { id: "confirm-password", label: "Repeat it", value: confirm, set: setConfirm }
      ].map(field => (
        <div key={field.id} className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase block" htmlFor={field.id}>
            {field.label}
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id={field.id}
              type="password"
              required
              value={field.value}
              onChange={e => field.set(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card/60 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-sans text-xs font-black py-3 rounded-xl transition shadow-pop"
      >
        {saving ? "Saving…" : "Set my new password"}
      </button>
    </form>
  );
}
