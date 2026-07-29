// app/projects/[projectId]/setting/page.tsx  (서버 컴포넌트)
import { redirect, notFound } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import SettingClient from "./setting-client"

export default async function SettingPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, description, team_id")
    .eq("id", projectId)
    .maybeSingle()
  if (!project) notFound()

  // 개수 집계 (head:true = 행은 안 가져오고 count만)
  const [{ count: tasks }, { count: docs }, { count: members }] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabaseAdmin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    supabaseAdmin
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ])

  // 팀 멤버(계정) 수 — 초대 섹션에 표시
  const { count: teammates } = await supabaseAdmin
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", project.team_id)

  return (
    <SettingClient
      projectId={projectId}
      teamId={project.team_id}
      teammateCount={teammates ?? 0}
      initialTitle={project.name ?? ""}
      initialDesc={project.description ?? ""}
      counts={{ tasks: tasks ?? 0, docs: docs ?? 0, members: members ?? 0 }}
    />
  )
}