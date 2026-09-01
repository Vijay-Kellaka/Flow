import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold">Flow</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-sm text-black/45">Sign in to your personal space.</p>
        </div>
        <div className="flow-card rounded-3xl p-6">
          {googleEnabled && (
            <>
              <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
                <button className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">Continue with Google</button>
              </form>
              <div className="my-5 flex items-center gap-3 text-xs text-black/35"><div className="h-px flex-1 bg-black/10"/>or<div className="h-px flex-1 bg-black/10"/></div>
            </>
          )}
          <form action={async (formData) => { "use server"; await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/dashboard" }); }} className="space-y-3">
            <input className="flow-input" name="email" type="email" placeholder="Email" required />
            <input className="flow-input" name="password" type="password" placeholder="Password" required />
            <button className="flow-btn w-full font-medium">Sign in with email</button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-black/40">Use your Flow account email and password to sign in.</p>
        </div>
      </div>
    </main>
  );
}
