"use client";
import { useEffect, useState } from "react";
import { localInputToISO, toLocalDateTimeInput } from "@/lib/task-time";

type CreatedTask = { id: string; title: string; completed: boolean; dueDate: string | null; priority: number };

export default function TaskForm({ onCreated }: { onCreated: (task?: CreatedTask) => void }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => toLocalDateTimeInput(new Date()));
  const [priority, setPriority] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") document.querySelector<HTMLInputElement>('[data-task-title]')?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage("");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), dueDate: localInputToISO(dueDate), priority: Number(priority) }),
    });
    setBusy(false);
    if (!response.ok) return setMessage((await response.json().catch(() => ({}))).error ?? "Could not save task.");
    const created = await response.json().catch(() => undefined);
    setTitle(""); setDueDate(toLocalDateTimeInput(new Date())); setPriority("0"); setMessage("Task added."); onCreated(created);
  }

  return <form onSubmit={submit} className="flow-card rounded-3xl p-5">
    <div className="text-sm text-black/45">New task</div>
    <div className="mt-5 space-y-3">
      <input data-task-title autoFocus className="flow-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" required />
      <label className="block text-xs text-black/45">Time</label>
      <input className="flow-input" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} aria-label="Task date and time" required />
      <select className="flow-input" value={priority} onChange={e => setPriority(e.target.value)} aria-label="Priority">
        <option value="0">Normal priority</option><option value="1">Priority 1</option><option value="2">Priority 2</option><option value="3">Priority 3</option>
      </select>
      <button disabled={busy} className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">{busy ? "Adding…" : "Add task"}</button>
      {message && <p className="text-xs text-black/45">{message}</p>}
    </div>
  </form>;
}
