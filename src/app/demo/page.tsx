import Link from "next/link";
import DashboardClient from "@/components/dashboard-client";
import { DEFAULT_WIDGETS } from "@/lib/dashboard";

const demoData = {
  name: "Vijay",
  tasks: [
    { id: "1", title: "Finish Graphs", completed: false, priority: 3 },
    { id: "2", title: "DBMS revision", completed: true, priority: 2 },
    { id: "3", title: "Build Flow dashboard", completed: false, priority: 3 },
    { id: "4", title: "Review the week", completed: false, priority: 1 },
  ],
  expenses: [
    { id: "1", name: "Coca-Cola", amount: 5000 },
    { id: "2", name: "Chicken roll", amount: 12000 },
    { id: "3", name: "Auto", amount: 4000 },
    { id: "4", name: "Coffee", amount: 3000 },
  ],
  goals: [
    { id: "1", title: "DSA Preparation", completed: false },
    { id: "2", title: "Flow v1", completed: false },
  ],
  activity: [
    { id: "1", message: "Added ₹50 · Coca-Cola", createdAt: new Date().toISOString() },
    { id: "2", message: "Completed DBMS revision", createdAt: new Date(Date.now() - 28 * 60000).toISOString() },
    { id: "3", message: "Updated DSA goal", createdAt: new Date(Date.now() - 72 * 60000).toISOString() },
        { id: "5", message: "Added task · Finish Graphs", createdAt: new Date(Date.now() - 170 * 60000).toISOString() },
    { id: "6", message: "Saved a new bookmark", createdAt: new Date(Date.now() - 240 * 60000).toISOString() },
  ],
  layout: DEFAULT_WIDGETS,
  journalMeta: null,
  monthlyExpenseTotal: 840000,
  monthlyExpenseByCategory: [
    { category: "FOOD", amount: 320000 },
    { category: "TRANSPORT", amount: 210000 },
    { category: "SHOPPING", amount: 180000 },
    { category: "BILLS", amount: 130000 },
  ],
};

export default function DemoPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl">
        <header className="flow-nav mb-10">
          <Link href="/" className="flow-brand">flow<span>.</span></Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-black/7 bg-white/65 px-3 py-1 text-[11px] font-medium text-black/45 sm:inline-flex">Interactive preview</span>
            <Link href="/login" className="flow-btn text-xs">Sign in</Link>
          </div>
        </header>
        <div className="mb-8 rounded-[28px] border border-black/7 bg-white/55 px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.035)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">Frontend preview</div>
              <div className="mt-1 text-sm text-black/55">Try dashboard customization and keyboard-first interaction without a database.</div>
            </div>
            <div className="hidden text-xs text-black/35 sm:block">Press <span className="kbd">⌘ K</span></div>
          </div>
        </div>
        <DashboardClient mode="full" initialData={demoData} />
      </div>
    </main>
  );
}
