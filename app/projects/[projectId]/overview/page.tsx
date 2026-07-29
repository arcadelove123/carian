// app/projects/[projectId]/overview/page.tsx  (서버 컴포넌트)
// 읽기 전용: 이 프로젝트의 태스크/트레일/멤버/문서를 모아 요약 화면에 넘긴다.

import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import { slugToLabel } from "@/lib/ai-source"
import OverviewClient, { type Task, type Member, type Doc } from "./overview-client"

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  // 태스크
  const { data: taskRows } = await supabaseAdmin
    .from("tasks")
    .select("id, name, type, assignee, due_date, status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  const taskIds = (taskRows ?? []).map((t) => t.id)

  // 트레일 (AI 사용량 집계용) — in 으로 일괄
  const { data: trailRows } = taskIds.length
    ? await supabaseAdmin.from("trails").select("id, task_id, source").in("task_id", taskIds)
    : { data: [] as { id: string; task_id: string | null; source: string | null }[] }

  // 멤버
  const { data: memberRows } = await supabaseAdmin
    .from("project_members")
    .select("id, name, role, color")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  // 문서
  const { data: docRows } = await supabaseAdmin
    .from("documents")
    .select("id, title")
    .eq("project_id", projectId)

  const tasks: Task[] = (taskRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type ?? "",
    assignee: t.assignee ?? "",
    dueDate: t.due_date ?? "",
    status: (t.status ?? "todo") as Task["status"],
    trails: (trailRows ?? [])
      .filter((tr) => tr.task_id === t.id)
      .map((tr) => ({ id: tr.id, ai: slugToLabel(tr.source) || "None" })),
  }))

  const members: Member[] = (memberRows ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role ?? "Member",
    color: m.color ?? "bg-indigo-500",
  }))

  const docs: Doc[] = (docRows ?? []).map((d) => ({ id: d.id, title: d.title ?? "Untitled" }))

  return (
    <OverviewClient projectId={projectId} tasks={tasks} members={members} docs={docs} />
  )
}