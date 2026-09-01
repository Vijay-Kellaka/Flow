"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TaskForm from "@/components/task-form";
import { localInputToISO, toLocalDateTimeInput } from "@/lib/task-time";

type Task = { id: string; title: string; completed: boolean; dueDate: string | null; priority: number };
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No time set"; }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/tasks", { cache: "no-store" });
    if (r.ok) setTasks(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // A freshly created task is added straight into state instead of re-fetching
  // the whole list, so it appears instantly.
  function addCreated(task?: Task) {
    if (task) setTasks(current => [task, ...current]);
    else load();
  }

  async function patch(id: string, data: Partial<Task>) {
    // Update the UI immediately so checking a box feels instant; roll back only if the request fails.
    const previous = tasks;
    setTasks(current => current.map(task => task.id === id ? { ...task, ...data } : task));
    const r = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    if (!r.ok) { setTasks(previous); return false; }
    return true;
  }

  async function remove(id: string) {
    const previous = tasks;
    setTasks(current => current.filter(task => task.id !== id));
    const r = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) setTasks(previous);
  }

  async function saveEdits(task: Task) {
    const title = draft.trim();
    if (!title) return;
    const dueDate = editingTime ? localInputToISO(editingTime) : null;
    const ok = await patch(task.id, { title, dueDate });
    if (ok) setEditing(null);
  }

  return <main className="page-shell"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="text-sm text-black/45">← Dashboard</Link>
    <div className="mt-6 flex items-end justify-between gap-4"><div><div className="eyebrow">Tasks</div><h1 className="mt-2 text-4xl font-semibold tracking-tight">Get things done.</h1><p className="mt-2 text-sm text-black/45">Check items off, fix names later, and keep their times accurate.</p></div><div className="text-right text-xs text-black/40">{tasks.filter(t => t.completed).length} of {tasks.length} complete</div></div>
    <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1.45fr]"><TaskForm onCreated={addCreated}/><div className="flow-card rounded-3xl p-5">
      <div className="flex items-center justify-between"><div className="text-sm text-black/45">Your tasks</div><div className="text-xs text-black/35">Resets daily · click a name to edit</div></div>
      <div className="mt-4 divide-y divide-black/6">{loading ? <div className="py-8 text-sm text-black/35">Loading…</div> : tasks.length === 0 ? <div className="py-8 text-sm text-black/40">No tasks yet.</div> : tasks.map(t => <div key={t.id} className="flex items-start gap-3 py-4">
        <input type="checkbox" checked={t.completed} onChange={e => patch(t.id, { completed: e.target.checked })} className="mt-1 size-4 accent-black" aria-label={`Mark ${t.title} complete`} />
        <div className="min-w-0 flex-1">
          {editing === t.id ? <div className="space-y-2">
            <div className="flex gap-2"><input className="flow-input" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdits(t); if (e.key === "Escape") setEditing(null); }} autoFocus/><button className="flow-btn text-xs" onClick={() => saveEdits(t)}>Save</button></div>
            <input className="flow-input" type="datetime-local" value={editingTime} onChange={e => setEditingTime(e.target.value)} aria-label="Edit task date and time" />
          </div> : <button className={`text-left text-sm ${t.completed ? "text-black/35 line-through" : ""}`} onClick={() => { setEditing(t.id); setDraft(t.title); setEditingTime(toLocalDateTimeInput(t.dueDate)); }}>{t.title}</button>}
          <div className="mt-1 text-xs text-black/35">{formatDate(t.dueDate)}{t.priority ? ` · P${t.priority}` : ""}</div>
        </div>
        <button className="text-xs text-black/35 underline underline-offset-4" onClick={() => remove(t.id)}>Delete</button>
      </div>)}</div>
    </div></div>
  </div></main>;
}
