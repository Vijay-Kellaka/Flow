import { requireUser } from "@/lib/session";
import { cookies } from "next/headers";
import { verifyJournalUnlockToken } from "@/lib/journal-security";
import JournalClient from "@/components/journal-client";
import Link from "next/link";

export default async function JournalPage() {
  const user = await requireUser(); const cookieStore = await cookies();
  const unlocked = await verifyJournalUnlockToken(cookieStore.get("flow-journal-unlocked")?.value, user.id);
  const hasPassword = Boolean(user.journalPasswordHash);
  return <main className="page-shell"><div className="mx-auto max-w-4xl"><Link href="/dashboard" className="text-sm text-black/45">← Dashboard</Link>{unlocked ? <JournalClient unlocked /> : !hasPassword ? <JournalClient setup /> : <JournalClient />}</div></main>;
}
