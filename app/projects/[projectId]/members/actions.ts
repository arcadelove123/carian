// app/projects/[projectId]/members/actions.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase"

async function assertProjectMember(projectId: string): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, team_id")
    .eq("id", projectId)
    .maybeSingle()
  if (!project) throw new Error("project not found")

  const { data: membership } = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("team_id", project.team_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (!membership) throw new Error("not a member of this team")

  return userId
}

// ── 멤버 추가 ────────────────────────────────────────────────
export async function createMember(input: {
  projectId: string
  name: string
  email: string
  role: string
  color: string
}): Promise<{ id: string; addedAt: string }> {
  const userId = await assertProjectMember(input.projectId)

  const { data: row, error } = await supabaseAdmin
    .from("project_members")
    .insert({
      project_id: input.projectId,
      name: input.name.trim() || "Unnamed",
      email: input.email.trim() || null,
      role: input.role || "Member",
      color: input.color || "bg-indigo-500",
      created_by: userId,
    })
    .select("id, created_at")
    .single()

  if (error || !row) throw new Error("failed to create member: " + error?.message)
  return { id: row.id, addedAt: row.created_at }
}

// ── 멤버 수정 ────────────────────────────────────────────────
export async function updateMember(
  projectId: string,
  memberId: string,
  patch: { name?: string; email?: string; role?: string; color?: string }
): Promise<void> {
  await assertProjectMember(projectId)

  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name.trim() || "Unnamed"
  if (patch.email !== undefined) dbPatch.email = patch.email.trim() || null
  if (patch.role !== undefined) dbPatch.role = patch.role
  if (patch.color !== undefined) dbPatch.color = patch.color
  if (Object.keys(dbPatch).length === 0) return

  const { error } = await supabaseAdmin
    .from("project_members")
    .update(dbPatch)
    .eq("id", memberId)
    .eq("project_id", projectId)
  if (error) throw new Error("failed to update member: " + error.message)
}

// ── 멤버 삭제 ────────────────────────────────────────────────
export async function deleteMember(projectId: string, memberId: string): Promise<void> {
  await assertProjectMember(projectId)
  const { error } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("id", memberId)
    .eq("project_id", projectId)
  if (error) throw new Error("failed to delete member: " + error.message)
}