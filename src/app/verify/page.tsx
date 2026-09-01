"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [msg, setMsg] = useState("Verifying…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") ?? "";
    const token = params.get("token") ?? "";

    if (!email || !token) {
      setMsg("The verification link is incomplete.");
      return;
    }

    let cancelled = false;
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!cancelled) setMsg(ok ? "Email verified. You can now sign in." : data.error || "Verification failed.");
      })
      .catch(() => {
        if (!cancelled) setMsg("Verification failed. Please try again.");
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flow-card max-w-md rounded-3xl p-8 text-center">
        <div className="text-4xl">✓</div>
        <h1 className="mt-4 text-2xl font-semibold">Account verification</h1>
        <p className="mt-2 text-sm text-black/45">{msg}</p>
        <Link href="/login" className="mt-6 inline-block rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">Go to sign in</Link>
      </div>
    </main>
  );
}
