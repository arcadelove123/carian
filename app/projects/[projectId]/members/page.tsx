// app/projects/[projectId]/members/page.tsx  (서버 컴포넌트)
import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import MembersClient, { type Member, type Role } from "./members-client"

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  const { data: memberRows } = await supabaseAdmin
    .from("project_members")
    .select("id, name, email, role, color, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  // 담당 태스크 개수 집계용 (assignee는 이름 문자열)
  const { data: taskRows } = await supabaseAdmin
    .from("tasks")
    .select("assignee")
    .eq("project_id", projectId)

  const members: Member[] = (memberRows ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email ?? "",
    role: (m.role ?? "Member") as Role,
    color: m.color ?? "bg-indigo-500",
    addedAt: m.created_at,
  }))

  const assignees: string[] = (taskRows ?? []).map((t) => t.assignee ?? "")

  return <MembersClient projectId={projectId} initialMembers={members} assignees={assignees} />
}