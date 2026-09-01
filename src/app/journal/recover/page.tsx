"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function JournalRecover() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextEmail = params.get("email") || "";
    const nextToken = params.get("token") || "";
    setEmail(nextEmail);
    setToken(nextToken);

    if (!nextEmail || !nextToken) {
      setChecking(false);
      setMessage("Open the verification link from your email to continue.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/journal/recover/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: nextEmail, token: nextToken }),
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setMessage(data.error ?? "Verification failed. Request a new recovery email.");
          return;
        }
        setVerified(true);
        setMessage("Email verified. Create a new journal password.");
      } catch {
        if (!cancelled) setMessage("Could not verify the link. Check your connection and try again.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  async function verifyManually() {
    if (!email || !token) return;
    setBusy(true);
    try {
      const response = await fetch("/api/journal/recover/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setVerified(true);
        setMessage("Email verified. Create a new journal password.");
      } else {
        setMessage(data.error ?? "Verification failed.");
      }
    } catch {
      setMessage("Could not verify the link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!verified || password.length < 8) {
      setMessage("Use at least 8 characters for the new password.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/journal/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setPassword("");
        setMessage("Password changed. You can return to Journal and unlock it with the new password.");
      } else {
        setMessage(data.error ?? "Could not change the password.");
      }
    } catch {
      setMessage("Could not change the password. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flow-card w-full max-w-md rounded-3xl p-7">
        <h1 className="text-2xl font-semibold">Journal recovery</h1>
        <p className="mt-2 text-sm text-black/45">Verify the email on your Flow account, then choose a new journal password.</p>

        {checking && <p className="mt-6 text-sm text-black/45">Verifying your email link…</p>}

        {!checking && !verified && email && token && (
          <button disabled={busy} onClick={verifyManually} className="mt-6 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">
            {busy ? "Verifying…" : "Verify email"}
          </button>
        )}

        {verified && (
          <>
            <input
              className="flow-input mt-6"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New journal password (8+ characters)"
              autoComplete="new-password"
            />
            <button disabled={busy} onClick={resetPassword} className="mt-3 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">
              {busy ? "Saving…" : "Set new password"}
            </button>
          </>
        )}

        {message && <p className="mt-4 text-xs leading-5 text-black/50">{message}</p>}
        <Link href="/journal" className="mt-5 inline-block text-xs underline">Back to journal</Link>
      </div>
    </main>
  );
}
