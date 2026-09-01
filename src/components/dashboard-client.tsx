"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardWidget, WidgetSize } from "@/lib/dashboard";

type Widget = DashboardWidget;
type Data = { name: string; tasks: any[]; expenses: any[]; goals: any[]; activity: any[]; layout: Widget[]; journalMeta: any; monthlyExpenseTotal: number; monthlyExpenseByCategory: { category: string; amount: number }[] };

const CATEGORY_LABELS: Record<string, string> = { FOOD: "Food", DRINKS: "Drinks", TRANSPORT: "Transport", SHOPPING: "Shopping", ENTERTAINMENT: "Entertainment", EDUCATION: "Education", HEALTH: "Health", BILLS: "Bills", OTHER: "Other" };

function money(n: number) { return `₹${(n / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }
function greeting() { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; }

export default function DashboardClient({ mode, initialData }: { mode: "full" | "commandOnly"; initialData?: Data }) {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [data, setData] = useState<Data | null>(initialData ?? null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); setCustomize(false); }
      if (mod && e.key.toLowerCase() === "e") window.location.href = "/expenses?new=1";
      if (mod && e.key.toLowerCase() === "j") window.location.href = "/journal";
      if (mod && e.key.toLowerCase() === "t") window.location.href = "/tasks?new=1";
    };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, []);

  if (mode === "commandOnly") return <><button className="flow-btn text-xs" onClick={() => setOpen(true)}>⌘K</button>{open && <CommandPalette onClose={() => setOpen(false)} />}</>;
  if (!data) return null;

  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
  const widgets = data.layout.filter(w => w.visible);
  const updateWidget = (id: string, patch: Partial<Widget>) => setData(d => d && ({ ...d, layout: d.layout.map(w => w.id === id ? { ...w, ...patch } : w) }));
  const toggleWidget = (id: string) => updateWidget(id, { visible: !data.layout.find(w => w.id === id)?.visible });
  const moveWidget = (id: string, direction: -1 | 1) => setData(d => { if (!d) return d; const arr=[...d.layout]; const i=arr.findIndex(w=>w.id===id); const j=i+direction; if(i<0||j<0||j>=arr.length)return d; [arr[i],arr[j]]=[arr[j],arr[i]]; return {...d,layout:arr}; });
  const saveLayout = async () => { if (!data) return; await fetch("/api/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: data.layout }) }); setCustomize(false); };

  return <>
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div><h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{greeting()}, {data.name}.</h1><p className="mt-3 text-sm text-black/40">Here’s everything you chose to keep close.</p></div><button className="flow-btn self-start text-sm sm:self-auto" onClick={() => setCustomize(true)}>Customize dashboard</button></div>
    <button onClick={() => setOpen(true)} className="flow-card mb-7 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"><span className="text-sm text-black/40">Search or type a command…</span><span className="text-xs text-black/30">⌘K</span></button>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {widgets.map(w => <WidgetView key={w.id} widget={w} data={data} totalExpenses={totalExpenses} />)}
    </div>
    {customize && <Customize layout={data.layout} toggle={toggleWidget} move={moveWidget} resize={(id,size)=>updateWidget(id,{size})} close={()=>setCustomize(false)} save={saveLayout} />}
    {open && <CommandPalette onClose={() => setOpen(false)} />}
  </>;
}

function WidgetView({ widget, data, totalExpenses }: { key?: string; widget: Widget; data: Data; totalExpenses: number }) {
  const tall = widget.size === "large";
  const base = `flow-card rounded-3xl p-5 ${tall ? "md:col-span-2 xl:col-span-3" : ""}`;
  if (widget.type === "tasks") return <div className={base}><div className="flex justify-between"><span className="text-sm text-black/45">Tasks</span><Link href="/tasks" className="text-xs text-black/35">Open →</Link></div><div className="mt-4 text-3xl font-semibold">{data.tasks.filter(t => t.completed).length}<span className="text-black/25"> / {data.tasks.length}</span></div><div className="mt-4 space-y-2">{data.tasks.slice(0,4).map(t => <div key={t.id} className="flex items-center gap-2 text-sm"><span className={`inline-block size-2 rounded-full ${t.completed ? "bg-black/25" : "border border-black/20"}`}/><span className={t.completed ? "text-black/35 line-through" : ""}>{t.title}</span></div>)}</div></div>;
  if (widget.type === "expenses") return <div className={base}><div className="flex justify-between"><span className="text-sm text-black/45">Expenses · today</span><Link href="/expenses" className="text-xs text-black/35">Open →</Link></div><div className="mt-4 text-3xl font-semibold">{money(totalExpenses)}</div><div className="mt-3 space-y-2">{data.expenses.slice(0,3).map(e => <div key={e.id} className="flex justify-between text-sm"><span>{e.name}</span><span className="text-black/45">{money(e.amount)}</span></div>)}</div></div>;
  if (widget.type === "goals") return <div className={base}><div className="flex justify-between"><span className="text-sm text-black/45">Goals</span><Link href="/goals" className="text-xs text-black/35">Open →</Link></div><div className="mt-4 space-y-4">{data.goals.slice(0,3).map(g => <div key={g.id}><div className="flex justify-between text-sm"><span>{g.title}</span><span className="text-black/40">{g.completed ? "Complete" : "Open"}</span></div><div className="mt-2 text-xs text-black/35">{g.completed ? "Finished" : "Not finished yet"}</div></div>)}</div></div>;
  if (widget.type === "journal") return <div className={base}><div className="text-sm text-black/45">Journal</div><div className="mt-5 text-xs uppercase tracking-[.12em] text-black/35">Private</div><div className="mt-2 font-medium">Private by default.</div><p className="mt-1 text-sm text-black/45">{data.journalMeta ? `${data.journalMeta.wordCount} words today.` : "Write today’s story when you’re ready."}</p><Link href="/journal" className="mt-4 inline-block text-sm underline underline-offset-4">Open journal</Link></div>;
  if (widget.type === "activity") return <div className={base}><div className="flex justify-between"><span className="text-sm text-black/45">Recent activity</span><Link href="/activity" className="text-xs text-black/35">See all →</Link></div><div className="mt-4 grid gap-3 md:grid-cols-2">{data.activity.slice(0,8).map(a => <div key={a.id} className="flex gap-3 text-sm"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-black/25"/><div><div>{a.message}</div><div className="mt-0.5 text-xs text-black/35">{new Date(a.createdAt).toLocaleString()}</div></div></div>)}</div></div>;
    if (widget.type === "bookmarks") return <div className={base}><div className="text-sm text-black/45">Bookmarks</div><p className="mt-3 text-sm text-black/45">Your saved links, without the clutter.</p><Link className="mt-4 inline-block text-sm underline underline-offset-4" href="/bookmarks">Open bookmarks</Link></div>;
  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  return <div className={base}><div className="flex justify-between"><span className="text-sm text-black/45">Expenses · {monthName}</span><Link href="/expenses" className="text-xs text-black/35">Open →</Link></div><div className="mt-4 text-3xl font-semibold">{money(data.monthlyExpenseTotal)}</div>{data.monthlyExpenseByCategory.length === 0 ? <div className="mt-3 text-sm text-black/40">Nothing recorded yet this month.</div> : <div className="mt-3 space-y-2">{data.monthlyExpenseByCategory.slice(0,4).map(c => <div key={c.category} className="flex justify-between text-sm"><span>{CATEGORY_LABELS[c.category] ?? c.category}</span><span className="text-black/45">{money(c.amount)}</span></div>)}</div>}</div>;
}

function Customize({ layout, toggle, move, resize, close, save }: { layout: Widget[]; toggle: (id:string)=>void; move:(id:string,direction:-1|1)=>void; resize:(id:string,size:WidgetSize)=>void; close:()=>void; save:()=>void }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-3 backdrop-blur-[2px] md:items-center md:p-6"><div className="flow-card max-h-[88vh] w-full max-w-2xl overflow-auto rounded-[28px] p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><div className="eyebrow">Personalize</div><div className="mt-2 text-2xl font-semibold tracking-[-.04em]">Make Flow yours.</div><div className="mt-2 max-w-md text-sm leading-6 text-black/40">Keep the dashboard quiet. Turn on only the things you actually want to see.</div></div><div className="flex gap-2"><button className="flow-btn text-xs" onClick={close}>Cancel</button><button className="rounded-2xl bg-black px-4 py-2 text-xs font-semibold text-white" onClick={save}>Save layout</button></div></div><div className="mt-6 grid gap-2">{layout.map((w,i) => <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-[20px] border border-black/7 bg-white/60 px-4 py-3"><button onClick={()=>toggle(w.id)} className="mr-auto flex min-w-[170px] items-center gap-3 text-left"><span className={`flex size-8 items-center justify-center rounded-xl border text-xs ${w.visible ? "border-black/10 bg-black text-white" : "border-black/8 bg-white text-black/25"}`}>{w.visible ? "✓" : ""}</span><span><span className="block text-sm font-medium capitalize">{w.type}</span><span className="block text-[11px] text-black/35">{w.visible ? "Visible" : "Hidden"}</span></span></button><select value={w.size} onChange={e=>resize(w.id, e.target.value as WidgetSize)} className="rounded-xl border border-black/8 bg-white px-2.5 py-2 text-xs"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select><button disabled={i===0} onClick={()=>move(w.id,-1)} className="rounded-xl border border-black/8 bg-white px-3 py-2 text-xs disabled:opacity-25">↑</button><button disabled={i===layout.length-1} onClick={()=>move(w.id,1)} className="rounded-xl border border-black/8 bg-white px-3 py-2 text-xs disabled:opacity-25">↓</button></div>)}</div></div></div> }

function CommandPalette({ onClose }: { onClose:()=>void }) { const [q,setQ]=useState(""); const actions = useMemo(() => [["Add expense", "/expenses?new=1"],["Write journal", "/journal"],["Add task", "/tasks?new=1"],["Open goals", "/goals"],["Open activity", "/activity"],["Customize dashboard", "#customize"]].filter(([a])=>a.toLowerCase().includes(q.toLowerCase())), [q]); return <div className="fixed inset-0 z-50 bg-black/15 p-4 pt-[12vh]" onClick={onClose}><div className="flow-card mx-auto max-w-xl rounded-3xl p-3" onClick={e=>e.stopPropagation()}><input autoFocus className="flow-input border-0 bg-transparent text-base shadow-none focus:shadow-none" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search or type a command…" /> <div className="mt-2 grid">{actions.map(([label,href])=><Link key={label} href={href} className="rounded-2xl px-4 py-3 text-sm hover:bg-black/5">{label}</Link>)}</div></div></div> }
