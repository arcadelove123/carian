// app/projects/[projectId]/timeline/page.tsx  (서버 컴포넌트)
// 읽기 전용: 이 프로젝트의 태스크를 Supabase에서 읽어 달력 UI에 넘긴다.

import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import TimelineClient, { type Task } from "./timeline-client"

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  const { data: rows } = await supabaseAdmin
    .from("tasks")
    .select("id, name, type, assignee, due_date, status, attachment, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  const tasks: Task[] = (rows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type ?? "",
    assignee: t.assignee ?? "",
    attachment: t.attachment ?? "",
    dueDate: t.due_date ?? "",
    status: (t.status ?? "todo") as Task["status"],
    startDate: t.created_at,
    lastActivity: t.updated_at,
  }))

  return <TimelineClient tasks={tasks} />
}