import { SignUp } from "@clerk/nextjs";
import { Sparkles, GitBranch, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <div className="relative flex items-center gap-2 text-white">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GitBranch className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Carian</span>
        </div>

        <div className="relative text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
            <Sparkles className="size-3.5" />
            Start tracking your work
          </div>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Turn scattered AI work into a clear trail.
          </h1>
          <p className="mt-4 max-w-sm text-white/80">
            Create your workspace and start capturing how every task gets done.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Free to get started",
              "Works with the browser extension",
              "Your data, organized by project",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-white/90">
                <CheckCircle2 className="size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Carian
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <GitBranch className="size-5" />
            </div>
            <span className="text-xl font-bold">Carian</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started in less than a minute.
            </p>
          </div>

          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent p-0",
                header: "hidden",
                footer: "hidden",
                formButtonPrimary:
                  "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-sm normal-case",
                socialButtonsBlockButton: "border-slate-200",
                formFieldInput: "border-slate-200",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}