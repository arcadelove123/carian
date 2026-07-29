// app/projects/projects-client.tsx  (클라이언트 컴포넌트)
// 기존 page.tsx의 UI를 그대로 옮김. 차이: 데이터는 localStorage가 아니라 props로 받는다.
// 검색(query)만 클라이언트 상태로 남기고, 나머지는 서버가 준 데이터를 렌더.

"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  CheckSquare,
  Users,
  FileText,
  Sparkles,
  ArrowRight,
  FolderKanban,
} from "lucide-react"

export interface ProjectCard {
  id: string
  title: string
  desc: string
  total: number
  done: number
  progress: number
  members: number
  docs: number
  ais: string[] // 표시 라벨 (예: "Claude")
}

const AI_COLORS: Record<string, string> = {
  Claude: "bg-orange-100 text-orange-700 border-orange-200",
  ChatGPT: "bg-teal-100 text-teal-700 border-teal-200",
  Gemini: "bg-blue-100 text-blue-700 border-blue-200",
  Copilot: "bg-violet-100 text-violet-700 border-violet-200",
}

const ACCENTS = [
  "from-indigo-500 to-purple-500",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-indigo-500",
  "from-fuchsia-500 to-pink-500",
  "from-amber-500 to-rose-500",
]
function accentFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % ACCENTS.length
  return ACCENTS[h]
}

export default function ProjectsClient({ projects }: { projects: ProjectCard[] }) {
  const [query, setQuery] = useState("")

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.desc.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-indigo-500" />
            Track the work — and the AI behind it
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            Your{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              projects
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Every project keeps its tasks, documents, team, and the trail of how
            the work got done. Pick one to dive back in, or start fresh.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="bg-white pl-9"
            />
          </div>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2">
              <Plus className="size-4" />
              New project
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <FolderKanban className="size-7" />
            </div>
            <h2 className="mb-1 text-lg font-semibold">No projects yet</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Create your first project to start tracking work.
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="size-4" />
                Create a project
              </Button>
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No projects match “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => {
              const accent = accentFor(project.id)
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/overview`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${accent}`} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-start gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-sm font-bold text-white`}
                      >
                        {project.title.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold leading-tight">
                          {project.title || "Untitled"}
                        </h3>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {project.desc || "No description"}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    {project.total > 0 && (
                      <div className="mb-3 mt-2">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span className="font-medium text-foreground">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${accent}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* AI chips */}
                    {project.ais.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {project.ais.map((ai) => (
                          <Badge
                            key={ai}
                            variant="outline"
                            className={`gap-1 ${AI_COLORS[ai] ?? ""}`}
                          >
                            <Sparkles className="size-3" />
                            {ai}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Footer stats */}
                    <div className="mt-auto flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="size-3.5" />
                        {project.total}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {project.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {project.docs}
                      </span>
                      <ArrowRight className="ml-auto size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}