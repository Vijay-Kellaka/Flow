import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flow — your day, one place",
  description: "A private personal command center for tasks, expenses, goals, journal and memories.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
