// app/projects/new/actions.ts
// 프로젝트 생성 서버 액션. 내 팀(getMyTeam)에 속한 프로젝트로 만든다.

"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getMyTeam } from "@/lib/getMyTeam"

export async function createProject(input: {
  title: string
  desc: string
}): Promise<{ id: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  // 내 팀 확보 (없으면 자동 생성됨)
  const team = await getMyTeam()
  if (!team) throw new Error("no team")

  const { data: row, error } = await supabaseAdmin
    .from("projects")
    .insert({
      team_id: team.teamId,
      name: input.title.trim() || "Untitled project",
      description: input.desc.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error || !row) throw new Error("failed to create project: " + error?.message)
  return { id: row.id }
}