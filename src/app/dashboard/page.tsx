import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";
import { DEFAULT_WIDGETS, type DashboardWidget } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardClient from "@/components/dashboard-client";

type DashboardData = {
  name: string;
  tasks: any[];
  expenses: any[];
  goals: any[];
  activity: any[];
  layout: DashboardWidget[];
  journalMeta: unknown;
  monthlyExpenseTotal: number;
  monthlyExpenseByCategory: { category: string; amount: number }[];
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, name: true, image: true },
  });
  if (!user) redirect("/login");

  const key = `dashboard:${user.id}`;
  let data = await cacheGet<DashboardData>(key);

  if (!data) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const nextMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);

    const [tasks, expenses, goals, activity, dashboard, journal, monthlyByCategory] = await Promise.all([
      prisma.task.findMany({
        where: { userId: user.id },
        orderBy: [{ completed: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
        take: 8,
      }),
      prisma.expense.findMany({
        where: { userId: user.id, spentAt: { gte: todayStart, lt: tomorrow } },
        orderBy: { spentAt: "desc" },
      }),
      prisma.goal.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 4 }),
      prisma.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.dashboard.findUnique({ where: { userId: user.id } }),
      prisma.journalEntry.findUnique({
        where: { userId_entryDate: { userId: user.id, entryDate: todayStart } },
        select: { wordCount: true, updatedAt: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { userId: user.id, spentAt: { gte: monthStart, lt: nextMonthStart } },
        _sum: { amount: true },
      }),
    ]);

    const layout: DashboardWidget[] = Array.isArray(dashboard?.layout)
      ? dashboard.layout as unknown as DashboardWidget[]
      : DEFAULT_WIDGETS;

    const monthlyExpenseByCategory = monthlyByCategory
      .map(row => ({ category: row.category, amount: row._sum.amount ?? 0 }))
      .sort((a, b) => b.amount - a.amount);
    const monthlyExpenseTotal = monthlyExpenseByCategory.reduce((sum, row) => sum + row.amount, 0);

    data = {
      tasks,
      expenses,
      goals,
      activity,
      layout,
      journalMeta: journal ?? null,
      name: user.name ?? "there",
      monthlyExpenseTotal,
      monthlyExpenseByCategory,
    };
    await cacheSet(key, data, 45);
  }

  const links = [
    { href: "/dashboard", label: "Home" },
    { href: "/expenses", label: "Expenses" },
    { href: "/tasks", label: "Tasks" },
    { href: "/goals", label: "Goals" },
    { href: "/journal", label: "Journal" },
    { href: "/bookmarks", label: "Bookmarks" },
    { href: "/activity", label: "Activity" },
  ];

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight">Flow</Link>
            <p className="mt-1 text-sm text-black/40">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.slice(1, 5).map(l => (
              <Link key={l.href} href={l.href} className="flow-btn text-xs text-black/60">{l.label}</Link>
            ))}
            <DashboardClient mode="commandOnly" />
          </nav>
        </header>
        <DashboardClient mode="full" initialData={data} />
      </div>
    </main>
  );
}
