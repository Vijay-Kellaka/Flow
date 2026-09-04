import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold">Flow</div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            Welcome back.
          </h1>

          <p className="mt-2 text-sm text-black/45">
            Sign in to your personal space.
          </p>
        </div>

        <div className="flow-card rounded-3xl p-6">
          {googleEnabled && (
            <>
              <form
                action={async () => {
                  "use server";
                  await signIn("google", {
                    redirectTo: "/dashboard",
                  });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                >
                  Continue with Google
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-black/35">
                <div className="h-px flex-1 bg-black/10" />
                or
                <div className="h-px flex-1 bg-black/10" />
              </div>
            </>
          )}

          <form
            action={async (formData) => {
              "use server";

              try {
                await signIn("credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/dashboard",
                });
              } catch (err) {
                if (err instanceof AuthError) {
                  redirect("/login?error=invalid");
                }
                // Not an auth error (e.g. it's the redirect Auth.js throws on
                // success) — let it propagate so navigation still happens.
                throw err;
              }
            }}
            className="space-y-3"
          >
            <input
              className="flow-input"
              name="email"
              type="email"
              placeholder="Email"
              required
            />

            <input
              className="flow-input"
              name="password"
              type="password"
              placeholder="Password"
              required
            />

            <button
              type="submit"
              className="flow-btn w-full font-medium"
            >
              Sign in with email
            </button>
          </form>

          {error && (
            <p className="mt-4 text-center text-sm text-red-500">
              Incorrect email or password. Please try again.
            </p>
          )}

          <p className="mt-5 text-center text-xs leading-5 text-black/40">
            Use your Flow account email and password to sign in.
          </p>

          <p className="mt-3 text-center text-sm text-black/50">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="font-medium text-black hover:underline"
            >
              Create account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
