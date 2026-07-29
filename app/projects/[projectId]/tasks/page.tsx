// app/projects/[projectId]/tasks/page.tsx  (서버 컴포넌트)
// 1단계(읽기): 이 프로젝트의 태스크 + 트레일 + 코멘트를 Supabase에서 읽어
// 기존 클라이언트 보드가 기대하는 Task 형태로 조립해 넘긴다.
// 쓰기(추가/수정/이동)는 2단계에서 서버 액션으로. 지금은 읽기만.

import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import { slugToLabel } from "@/lib/ai-source"
import TasksClient, { type Task } from "./tasks-client"

export default async function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  // 1) 이 프로젝트의 태스크
  const { data: taskRows } = await supabaseAdmin
    .from("tasks")
    .select(
      "id, name, type, assignee, due_date, status, final_trail_id, attachment, created_at, updated_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  const taskIds = (taskRows ?? []).map((t) => t.id)

  // 2) 그 태스크들의 트레일 (in 으로 일괄 — N+1 방지)
  const { data: trailRows } = taskIds.length
    ? await supabaseAdmin
        .from("trails")
        .select("id, task_id, title, description, share_url, file_url, source")
        .in("task_id", taskIds)
    : { data: [] as any[] }

  // 3) 코멘트도 일괄
  const { data: commentRows } = taskIds.length
    ? await supabaseAdmin
        .from("comments")
        .select("id, task_id, author, text, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] }

  // 4) 코드가 기대하는 Task 형태로 조립 (DB snake → 코드 camel, source → ai 라벨)
  const tasks: Task[] = (taskRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type ?? "",
    assignee: t.assignee ?? "",
    attachment: t.attachment ?? "",
    dueDate: t.due_date ?? "",
    status: (t.status ?? "todo") as Task["status"],
    finalTrailId: t.final_trail_id ?? null,
    startDate: t.created_at, // 코드의 startDate = DB created_at
    lastActivity: t.updated_at,
    trails: (trailRows ?? [])
      .filter((tr) => tr.task_id === t.id)
      .map((tr) => ({
        id: tr.id,
        title: tr.title ?? "",
        description: tr.description ?? "",
        aiUrl: tr.share_url ?? "", // DB share_url → 코드 aiUrl
        fileUrl: tr.file_url ?? "",
        ai: slugToLabel(tr.source), // DB source(슬러그/도메인) → 표시 라벨
      })),
    comments: (commentRows ?? [])
      .filter((c) => c.task_id === t.id)
      .map((c) => ({
        id: c.id,
        author: c.author ?? "Anonymous",
        text: c.text ?? "",
        at: c.created_at, // DB created_at → 코드 at
      })),
  }))

  return <TasksClient projectId={projectId} initialTasks={tasks} />
}