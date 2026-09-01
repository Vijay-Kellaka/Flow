"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ExpenseForm from "@/components/expense-form";

type Expense = { id: string; amount: number; name: string; category: string; spentAt: string; note: string | null };

const CATEGORIES = ["FOOD", "DRINKS", "TRANSPORT", "SHOPPING", "ENTERTAINMENT", "EDUCATION", "HEALTH", "BILLS", "OTHER"];
const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Food",
  DRINKS: "Drinks",
  TRANSPORT: "Transport",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  EDUCATION: "Education",
  HEALTH: "Health",
  BILLS: "Bills",
  OTHER: "Other",
};

function localDateTimeValue(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function money(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function monthBounds(date: Date) {
  const start = startOfMonth(date);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end };
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function ExpensesPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Expense>>({});
  const [loading, setLoading] = useState(true);

  async function load(forMonth: Date) {
    setLoading(true);
    const { start, end } = monthBounds(forMonth);
    const to = new Date(end.getTime() - 1);
    const params = new URLSearchParams({
      range: `month:${monthKey(forMonth)}`,
      from: start.toISOString(),
      to: to.toISOString(),
    });
    const r = await fetch(`/api/expenses?${params.toString()}`, { cache: "no-store" });
    if (r.ok) setExpenses(await r.json());
    setLoading(false);
  }

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const isCurrentMonth = isSameMonth(month, new Date());

  function shiftMonth(delta: number) {
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  async function patch(id: string) {
    const r = await fetch("/api/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...draft }),
    });
    if (r.ok) {
      setEditing(null);
      setDraft({});
      await load(month);
    }
  }
  async function remove(id: string) {
    const r = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (r.ok) await load(month);
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-black/45">← Dashboard</Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Finance</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Expenses</h1>
            <p className="mt-2 text-sm text-black/45">Track what you spend, month by month.</p>
          </div>
        </div>

        <div className="mt-8 flow-card flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <button onClick={() => shiftMonth(-1)} className="flow-btn px-3 py-2 text-sm" aria-label="Previous month">‹</button>
            <div className="min-w-[160px] text-center text-sm font-medium">{monthLabel(month)}</div>
            <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} className="flow-btn px-3 py-2 text-sm disabled:opacity-25" aria-label="Next month">›</button>
            {!isCurrentMonth && (
              <button onClick={() => setMonth(startOfMonth(new Date()))} className="text-xs text-black/40 underline underline-offset-4">
                This month
              </button>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-black/40">Total for {monthLabel(month)}</div>
            <div className="text-2xl font-semibold">{loading ? "…" : money(total)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <ExpenseForm onCreated={() => load(month)} />
            {byCategory.length > 0 && (
              <div className="flow-card rounded-3xl p-5">
                <div className="text-sm text-black/45">By category</div>
                <div className="mt-4 space-y-3">
                  {byCategory.map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm">
                        <span>{CATEGORY_LABELS[category] ?? category}</span>
                        <span className="text-black/45">{money(amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/6">
                        <div
                          className="h-full rounded-full bg-black/70"
                          style={{ width: `${total ? Math.round((amount / total) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flow-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-black/45">{monthLabel(month)}</div>
              <div className="text-xs text-black/35">Newest first</div>
            </div>
            <div className="mt-4 divide-y divide-black/6">
              {loading ? (
                <div className="py-8 text-sm text-black/35">Loading…</div>
              ) : expenses.length === 0 ? (
                <div className="py-8 text-sm text-black/40">No expenses recorded in {monthLabel(month)}.</div>
              ) : (
                expenses.map(e =>
                  editing === e.id ? (
                    <div key={e.id} className="grid gap-2 py-4 md:grid-cols-2">
                      <input
                        className="flow-input"
                        value={String(draft.name ?? e.name)}
                        onChange={x => setDraft(d => ({ ...d, name: x.target.value }))}
                      />
                      <input
                        className="flow-input"
                        type="number"
                        step="0.01"
                        value={(Number(draft.amount ?? e.amount) / 100).toString()}
                        onChange={x => setDraft(d => ({ ...d, amount: Math.round(Number(x.target.value) * 100) }))}
                      />
                      <select
                        className="flow-input"
                        value={String(draft.category ?? e.category)}
                        onChange={x => setDraft(d => ({ ...d, category: x.target.value }))}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>
                      <input
                        className="flow-input"
                        type="datetime-local"
                        value={String(draft.spentAt ?? localDateTimeValue(new Date(e.spentAt)))}
                        onChange={x => setDraft(d => ({ ...d, spentAt: x.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button className="rounded-xl bg-black px-3 py-2 text-xs text-white" onClick={() => patch(e.id)}>Save</button>
                        <button
                          className="flow-btn text-xs"
                          onClick={() => {
                            setEditing(null);
                            setDraft({});
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={e.id} className="flex items-start justify-between gap-4 py-4">
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="mt-1 text-xs text-black/40">
                          {CATEGORY_LABELS[e.category] ?? e.category} · {new Date(e.spentAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm">{money(e.amount)}</div>
                        <button
                          className="text-xs text-black/35 underline underline-offset-4"
                          onClick={() => {
                            setEditing(e.id);
                            setDraft({
                              amount: e.amount,
                              name: e.name,
                              category: e.category,
                              spentAt: localDateTimeValue(new Date(e.spentAt)),
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button className="text-xs text-black/35 underline underline-offset-4" onClick={() => remove(e.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
