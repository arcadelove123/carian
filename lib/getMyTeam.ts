// lib/getMyTeam.ts
// "지금 로그인한 사람의 팀/프로젝트를 가져온다. 없으면 만들어준다."
// 1인 팀 부트스트랩: 처음 들어온 사람에게 team + membership + 기본 project를 만든다.
// 서버 전용 (auth() + service_role Supabase).

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "./supabase"

export type MyTeam = {
  userId: string
  teamId: string
  projectId: string
}

// 로그인 안 된 경우 null. (호출부에서 로그인 유도)
export async function getMyTeam(): Promise<MyTeam | null> {
  const { userId } = await auth()
  if (!userId) return null

  // 1) 이미 팀에 속해 있나?
  const { data: membership } = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  let teamId = membership?.team_id as string | undefined

  // 2) 없으면 팀 + 멤버십 생성 (1인 팀)
  if (!teamId) {
    const { data: team, error: teamErr } = await supabaseAdmin
      .from("teams")
      .insert({ name: "My Team", created_by: userId })
      .select("id")
      .single()
    if (teamErr || !team) throw new Error("failed to create team: " + teamErr?.message)
    teamId = team.id

    const { error: memErr } = await supabaseAdmin
      .from("team_members")
      .insert({ team_id: teamId, user_id: userId, role: "owner" })
    if (memErr) throw new Error("failed to create membership: " + memErr.message)
  }

  // 3) 그 팀에 프로젝트가 있나? 없으면 기본 프로젝트 생성.
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  let projectId = project?.id as string | undefined

  if (!projectId) {
    const { data: newProject, error: projErr } = await supabaseAdmin
      .from("projects")
      .insert({ team_id: teamId, name: "My Project", created_by: userId })
      .select("id")
      .single()
    if (projErr || !newProject) throw new Error("failed to create project: " + projErr?.message)
    projectId = newProject.id
  }

  if (!teamId || !projectId) throw new Error("failed to resolve team/project")

  return { userId, teamId, projectId }
}