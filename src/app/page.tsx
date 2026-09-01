import Link from "next/link";

const features = [
  ["Daily life", "Tasks, goals and activity are organized around the day."],
  ["Money", "Log tiny everyday expenses or build full custom-range spending views."],
  ["Private journal", "A separate journal password keeps your writing behind another lock."],
  ["Custom dashboard", "Show, hide, resize and reorder the pieces that matter to you."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-8">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flow-brand">flow<span>.</span></Link>
        <div className="flex items-center gap-2">
          <Link href="/demo" className="flow-btn text-xs sm:text-sm">View demo</Link>
          <Link href="/login" className="rounded-2xl bg-black px-4 py-2.5 text-xs font-semibold text-white sm:px-5 sm:text-sm">Sign in</Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[76vh] max-w-6xl items-center gap-14 py-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-20">
        <div>
          <div className="eyebrow">A calmer personal command center</div>
          <h1 className="hero-title">Your day.<br />One clear place.</h1>
          <p className="hero-copy">Track the little things that make up a life — money, tasks, goals, memories and your private journal — without turning the screen into a control panel.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/demo" className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,.12)]">Explore the dashboard</Link>
            <span className="text-xs text-black/35">Keyboard-first · private by default</span>
          </div>
          <div className="mt-10 flex flex-wrap gap-2 text-[11px] text-black/40">
            <span className="soft-pill">Google + email login</span>
            <span className="soft-pill">PostgreSQL</span>
            <span className="soft-pill">Redis cache</span>
            <span className="soft-pill">⌘K command palette</span>
          </div>
        </div>

        <div className="hero-preview">
          <div className="hero-preview-bar"><span></span><span></span><span></span><div className="ml-auto text-[10px] text-black/25">flow</div></div>
          <div className="p-5 sm:p-7">
            <div className="flex items-end justify-between">
              <div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-black/30">Tuesday, September 1</div><div className="mt-2 text-2xl font-semibold tracking-[-.03em]">Good morning, Vijay.</div></div>
              <span className="kbd">⌘K</span>
            </div>
            <div className="mt-6 rounded-2xl border border-black/7 bg-white/75 px-4 py-3 text-xs text-black/35">Search or type a command…</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PreviewCard label="Tasks" value="3 / 5" sub="2 left for today" />
              <PreviewCard label="Expenses" value="₹240" sub="4 transactions" />
              <PreviewCard label="DSA preparation" value="Open" sub="Target-based goal" wide />
              <PreviewCard label="Journal" value="Private" sub="Separate password" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-24">
        <div className="mb-8 max-w-xl"><div className="eyebrow">Built to stay out of your way</div><h2 className="section-title">More capability. Less visual noise.</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, body]) => <div key={title} className="feature-card"><div className="text-sm font-semibold">{title}</div><p className="mt-2 text-sm leading-6 text-black/45">{body}</p></div>)}
        </div>
      </section>
    </main>
  );
}

function PreviewCard({ label, value, sub, wide = false }: { label: string; value: string; sub: string; wide?: boolean }) {
  return <div className={`preview-card ${wide ? "sm:col-span-2" : ""}`}><div className="text-xs text-black/40">{label}</div><div className="mt-5 text-2xl font-semibold tracking-[-.03em]">{value}</div><div className="mt-1 text-xs text-black/35">{sub}</div></div>;
}
