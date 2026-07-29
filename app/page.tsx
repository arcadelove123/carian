import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  GitBranch,
  Sparkles,
  CheckSquare,
  CalendarClock,
  Users,
  ArrowRight,
} from "lucide-react";

export default async function Landing() {
  // Signed-in users skip the landing page and go straight to the app.
  const { userId } = await auth();
  if (userId) redirect("/projects");

  const features = [
    {
      icon: Sparkles,
      title: "AI work trails",
      desc: "Save your AI conversations and link them to the exact task they moved forward.",
    },
    {
      icon: CheckSquare,
      title: "Tasks that tell a story",
      desc: "A kanban board where every finished task carries the trail of how it got done.",
    },
    {
      icon: CalendarClock,
      title: "See the whole timeline",
      desc: "Due dates on a calendar, urgent work surfaced, nothing slipping through.",
    },
    {
      icon: Users,
      title: "Built for teams",
      desc: "Members, documents, and comments — the shared context in one place.",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
            <GitBranch className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Carian</span>
        </div>
        <div className="flex items-center gap-2">
          <SignInButton>
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700">
              Get started
            </button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="size-3.5 text-indigo-500" />
          Track the work — and the AI behind it
        </div>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Every task keeps a{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            trail
          </span>{" "}
          of how it got done.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Carian captures your AI conversations and links them to real work — so
          the story behind every finished task is never lost.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <SignUpButton>
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-medium text-white shadow-sm hover:from-indigo-700 hover:to-purple-700">
              Start for free
              <ArrowRight className="size-4" />
            </button>
          </SignUpButton>
          <SignInButton>
            <button className="rounded-xl border bg-white px-6 py-3 font-medium hover:bg-slate-50">
              Sign in
            </button>
          </SignInButton>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600">
                <f.icon className="size-5" />
              </div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Carian</span>
          <div className="flex gap-4">
            <SignInButton>
              <button className="hover:text-foreground">Sign in</button>
            </SignInButton>
            <SignUpButton>
              <button className="hover:text-foreground">Get started</button>
            </SignUpButton>
          </div>
        </div>
      </footer>
    </main>
  );
}