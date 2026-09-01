"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type JournalMeta = { id: string; entryDate: string; mood?: string | null; tags: string[]; wordCount: number; updatedAt: string };

function passwordStrength(password: string) {
  if (!password) return "";
  if (password.length >= 12) return "Strong";
  if (password.length >= 8) return "Good";
  return "Too short";
}
function toBase64(bytes: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function fromBase64(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: toExactArrayBuffer(salt), iterations: 120000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decryptLegacyEntry(payload: string, password: string) {
  const parsed = JSON.parse(payload);
  const key = await deriveKey(password, fromBase64(parsed.salt));
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toExactArrayBuffer(fromBase64(parsed.iv)) }, key, toExactArrayBuffer(fromBase64(parsed.data)));
  return new TextDecoder().decode(data);
}
function localDateKey(date = new Date()) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function prettyDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
function wordCount(html: string) { const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); return text ? text.split(" ").length : 0; }

export default function JournalClient({ setup = false, unlocked = false }: { setup?: boolean; unlocked?: boolean }) {
  const [mode, setMode] = useState<"setup" | "unlock" | "editor">(setup ? "setup" : unlocked ? "editor" : "unlock");
  const [pwd, setPwd] = useState(""); const [confirm, setConfirm] = useState("");
  const [content, setContent] = useState(""); const [mood, setMood] = useState(""); const [tags, setTags] = useState("");
  const [fontSize, setFontSize] = useState("18px"); const [textColor, setTextColor] = useState("#171717");
  const [selectedDate, setSelectedDate] = useState(localDateKey()); const [entries, setEntries] = useState<JournalMeta[]>([]);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(""); const [accountPassword, setAccountPassword] = useState(""); const [showAccountRecovery, setShowAccountRecovery] = useState(false); const [newJournalPassword, setNewJournalPassword] = useState(""); const [showForgot, setShowForgot] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const dayLabel = useMemo(() => new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }), [selectedDate]);

  useEffect(() => {
    if (mode === "editor" && editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [mode, content]);

  useEffect(() => {
    if (unlocked && mode === "editor" && !loaded) {
      void loadEntry("", selectedDate);
    }
    // The server-validated unlock cookie is represented by the `unlocked` prop.
    // Loading the entry here prevents a valid session from flashing the unlock screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function loadHistory() {
    const r = await fetch("/api/journal?list=1", { cache: "no-store" });
    if (r.ok) setEntries(await r.json());
  }

  async function loadEntry(password: string, date = selectedDate) {
    setBusy(true); setMsg(""); setLoaded(false);
    const r = await fetch(`/api/journal?date=${encodeURIComponent(date)}`, { cache: "no-store" });
    if (!r.ok) { setBusy(false); return setMsg((await r.json().catch(() => ({}))).error ?? "Could not open the journal."); }
    const entry = await r.json();
    if (entry) {
      try {
        let decrypted = entry.content;
        if (entry.legacyEncrypted) decrypted = await decryptLegacyEntry(entry.content, password);
        setContent(decrypted); setMood(entry.mood ?? ""); setTags((entry.tags ?? []).join(", "));
      } catch (error) {
        setBusy(false); return setMsg(error instanceof Error ? error.message : "Could not decrypt the entry.");
      }
    } else { setContent(""); setMood(""); setTags(""); }
    await loadHistory(); setLoaded(true); setBusy(false); setMode("editor");
  }

  async function setupPassword() {
    if (pwd.length < 8) return setMsg("Use at least 8 characters."); if (pwd !== confirm) return setMsg("The passwords do not match.");
    setBusy(true); const r = await fetch("/api/journal/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) }); setBusy(false);
    if (!r.ok) return setMsg((await r.json().catch(() => ({}))).error ?? "Could not create the journal password.");
    setMode("editor"); await loadEntry(pwd, selectedDate);
  }
  async function unlock() {
    if (!pwd) return;
    setBusy(true); const r = await fetch("/api/journal/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) }); setBusy(false);
    if (!r.ok) return setMsg((await r.json().catch(() => ({}))).error ?? "Incorrect journal password.");
    await loadEntry(pwd, selectedDate);
  }
  async function recover() {
    const email = recoveryEmail.trim().toLowerCase();
    if (!email) return setMsg("Enter the email used for your Flow account.");
    setBusy(true);
    try {
      const r = await fetch("/api/journal/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await r.json().catch(() => ({}));
      setMsg(r.ok ? (data.message ?? "Recovery email sent. Check Inbox, Spam, or Promotions.") : (data.error ?? "Could not send recovery email."));
    } finally { setBusy(false); }
  }

  async function recoverWithAccountPassword() {
    if (!accountPassword) return setMsg("Enter your Flow login password.");
    if (newJournalPassword.length < 8) return setMsg("Use at least 8 characters for the new journal password.");
    setBusy(true);
    try {
      const r = await fetch("/api/journal/recover/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountPassword, newJournalPassword }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(data.error ?? "Could not reset the journal password.");
      const unlockedPassword = newJournalPassword;
      setAccountPassword(""); setNewJournalPassword(""); setShowAccountRecovery(false); setPwd(unlockedPassword);
      await loadEntry(unlockedPassword, selectedDate);
      setMsg("Journal password reset successfully.");
    } finally { setBusy(false); }
  }
  async function save() {
    const html = editorRef.current?.innerHTML ?? content; setContent(html); setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryDate: selectedDate, content: html, mood, tags: tags.split(",").map(x => x.trim()).filter(Boolean), wordCount: wordCount(html) }) });
      setMsg(r.ok ? "Saved." : ((await r.json().catch(() => ({}))).error ?? "Could not save your entry."));
      if (r.ok) await loadHistory();
    } finally { setBusy(false); }
  }
  async function deleteEntry(date: string) {
    const label = prettyDate(date);
    if (!window.confirm(`Delete the journal entry for ${label}? This cannot be undone.`)) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/journal?date=${encodeURIComponent(date)}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(data.error ?? "Could not delete the entry.");
      if (date === selectedDate) {
        setContent(""); setMood(""); setTags(""); setLoaded(true);
      }
      await loadHistory();
      setMsg(data.deleted ? "Journal entry deleted." : "There was no entry to delete.");
    } finally { setBusy(false); }
  }

  async function deleteCurrentEntry() {
    await deleteEntry(selectedDate);
  }

  async function lock() { await fetch("/api/journal/unlock", { method: "DELETE" }); location.reload(); }
  function focusEditor() { editorRef.current?.focus(); }
  function format(command: string, value?: string) { focusEditor(); document.execCommand(command, false, value); setContent(editorRef.current?.innerHTML ?? ""); }
  function setBlock(tag: "h2" | "h3" | "p") { format("formatBlock", `<${tag}>`); }
  function applyFontSize(value: string) { setFontSize(value); focusEditor(); document.execCommand("fontSize", false, value === "14px" ? "2" : value === "18px" ? "3" : value === "24px" ? "5" : "7"); setContent(editorRef.current?.innerHTML ?? ""); }

  if (mode === "setup") return <div className="mx-auto mt-20 max-w-md text-center"><div className="eyebrow">Private journal</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Set a journal password.</h1><p className="mt-2 text-sm leading-6 text-black/45">Your journal uses a separate password. Entries are encrypted at rest and the password controls access.</p><div className="flow-card mt-7 rounded-3xl p-5 text-left"><input className="flow-input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Journal password"/><input className="flow-input mt-3" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password"/><div className="mt-2 text-xs text-black/35">{passwordStrength(pwd)}</div><button disabled={busy} onClick={setupPassword} className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">{busy?"Creating…":"Create journal password"}</button>{msg&&<div className="mt-4 text-xs text-black/45">{msg}</div>}</div></div>;

  if (mode === "unlock") return <div className="mx-auto mt-20 max-w-md text-center"><div className="eyebrow">Private journal</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Unlock your journal.</h1><p className="mt-2 text-sm leading-6 text-black/45">Enter the journal password to continue.</p><div className="flow-card mt-7 rounded-3xl p-5 text-left"><input className="flow-input" autoFocus type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Journal password" onKeyDown={e=>e.key === "Enter" && unlock()}/><button disabled={busy} onClick={unlock} className="mt-3 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">{busy?"Unlocking…":"Unlock journal"}</button>
      <div className="mt-5 border-t border-black/8 pt-4 text-center">
        {!showForgot ? <button type="button" onClick={()=>{setShowForgot(true);setMsg("")}} className="text-xs text-black/45 underline underline-offset-4">Forgot the journal password?</button> : <div className="text-left">
          <div className="flex items-center justify-between"><div className="text-sm font-medium">Forgot the journal password?</div><button type="button" onClick={()=>{setShowForgot(false);setShowAccountRecovery(false);setMsg("")}} className="text-xs text-black/35 underline underline-offset-4">Hide</button></div>
          <p className="mt-1 text-xs leading-5 text-black/45">Use the email on your Flow account. You can also use your Flow login password while signed in.</p>
          <input className="flow-input mt-3" type="email" value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} placeholder="Flow account email"/>
          <button disabled={busy} onClick={recover} className="mt-3 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium">{busy?"Sending…":"Send recovery email"}</button>
          <button type="button" onClick={()=>{setShowAccountRecovery(v=>!v);setMsg("")}} className="mt-3 text-xs text-black/45 underline underline-offset-4">{showAccountRecovery?"Hide login-password recovery":"Forgot the email? Use Flow login password"}</button>
          {showAccountRecovery&&<div className="mt-3"><input className="flow-input" type="password" value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} placeholder="Flow login password" autoComplete="current-password"/><input className="flow-input mt-3" type="password" value={newJournalPassword} onChange={e=>setNewJournalPassword(e.target.value)} placeholder="New journal password (8+ characters)" autoComplete="new-password"/><button disabled={busy} onClick={recoverWithAccountPassword} className="mt-3 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">{busy?"Resetting…":"Reset with login password"}</button></div>}
        </div>}
      </div>
      {msg&&<div className="mt-4 text-xs leading-5 text-black/45">{msg}</div>}</div></div>;

  return <div className="mx-auto mt-10 max-w-5xl"><div className="flex items-end justify-between gap-5"><div><div className="eyebrow">Journal · private</div><h1 className="mt-2 text-4xl font-semibold tracking-tight">{dayLabel}</h1></div><div className="flex gap-2"><input aria-label="Journal date" type="date" value={selectedDate} max={localDateKey()} onChange={async e=>{const d=e.target.value; setSelectedDate(d); await loadEntry(pwd, d);}} className="flow-btn text-xs"/><button onClick={lock} className="flow-btn text-xs">Lock</button></div></div>
    <div className="mt-5 space-y-2">
      {entries.length === 0 ? (
        <div className="text-xs text-black/35">No saved entries yet.</div>
      ) : entries.map(entry => {
        const d = entry.entryDate.slice(0, 10);
        return (
          <div key={entry.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${d === selectedDate ? "border-black/20 bg-black/[0.03]" : "border-black/8 bg-white"}`}>
            <button title="Edit this journal entry" onClick={() => { setSelectedDate(d); loadEntry(pwd, d); }} className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-medium text-black/75">{prettyDate(d)}</span>
              <span className="mt-0.5 block text-xs text-black/35">{entry.wordCount} words{entry.mood ? ` · ${entry.mood}` : ""}</span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button disabled={busy} onClick={() => { setSelectedDate(d); loadEntry(pwd, d); }} className="flow-btn text-xs">Edit</button>
              <button disabled={busy} onClick={() => deleteEntry(d)} className="flow-btn text-xs">Delete</button>
            </div>
          </div>
        );
      })}
    </div>
    <div className="flow-card mt-5 rounded-3xl p-4 md:p-6"><div className="journal-toolbar flex flex-wrap items-center gap-2 border-b border-black/7 pb-3"><button className="flow-btn text-xs" onClick={()=>setBlock("h2")}>Heading</button><button className="flow-btn text-xs" onClick={()=>setBlock("h3")}>Subheading</button><button className="flow-btn text-xs" onClick={()=>setBlock("p")}>Body</button><select className="flow-btn text-xs" value={fontSize} onChange={e=>applyFontSize(e.target.value)}><option value="14px">Small</option><option value="18px">Body</option><option value="24px">Large</option><option value="32px">Title</option></select><label className="flow-btn text-xs flex items-center gap-2">Text <input aria-label="Text color" type="color" value={textColor} onChange={e=>{setTextColor(e.target.value);format("foreColor",e.target.value)}}/></label><button className="flow-btn text-xs" onClick={()=>format("bold")}>Bold</button><button className="flow-btn text-xs" onClick={()=>format("italic")}>Italic</button></div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning data-placeholder="Write your day…" onInput={e=>setContent(e.currentTarget.innerHTML)} className="journal-editor min-h-[52vh] pt-5 outline-none" style={{fontSize}} spellCheck autoFocus></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><input className="flow-input" value={mood} onChange={e=>setMood(e.target.value)} placeholder="Mood (optional)"/><input className="flow-input" value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags, separated by commas"/></div>
      <div className="mt-5 flex items-center justify-between gap-4"><div className="text-xs text-black/35">Encrypted · {loaded ? wordCount(content) : 0} words</div><div className="flex items-center gap-2"><button disabled={busy || !loaded} onClick={deleteCurrentEntry} className="flow-btn text-xs">Delete entry</button><button disabled={busy} onClick={save} className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">{busy?"Saving…":"Save entry"}</button></div></div>{msg&&<div className="mt-3 text-xs text-black/45">{msg}</div>}
    </div></div>;
}
