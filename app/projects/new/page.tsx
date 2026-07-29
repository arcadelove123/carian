// app/projects/new/page.tsx
// UI는 기존 그대로. 바뀐 곳: addProject가 localStorage 대신 서버 액션(createProject)을 호출.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Sparkles, AlertCircle } from "lucide-react";
import { createProject } from "./actions";

export default function NewProject() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addProject() {
    if (!title.trim()) {
      setErr(true);
      return;
    }
    setErr(false);
    setSaving(true);
    try {
      await createProject({ title, desc });
      router.refresh();
      router.push("/projects");
    } catch (e) {
      console.error("프로젝트 생성 실패:", e);
      alert("프로젝트 생성에 실패했어요. 콘솔을 확인해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Back link */}
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>

        {/* Hero */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-indigo-500" />
            New project
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Start something{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              new
            </span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Give it a name and a short description. You can change these anytime
            in settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Project name
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (err) setErr(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                    placeholder="e.g. Carian Redesign"
                    aria-invalid={err}
                    className={err ? "border-red-300 focus-visible:ring-red-200" : ""}
                    autoFocus
                  />
                  {err && (
                    <p className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="size-3.5" />
                      Please enter a project name.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-sm font-medium">
                    Description
                    <span className="ml-1 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="What's this project about? What are you trying to ship?"
                    className="min-h-[160px] resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button size="lg" onClick={addProject} disabled={saving} className="gap-2">
                    <Plus className="size-4" />
                    {saving ? "Creating…" : "Create project"}
                  </Button>
                  <Link href="/projects">
                    <Button variant="ghost" size="lg">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                    {title.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight">
                      {title.trim() || "Untitled project"}
                    </h3>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {desc.trim() || "No description yet"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                  <span>0 tasks</span>
                  <span>0 members</span>
                  <span>0 docs</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This is how your project will appear in the list.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}