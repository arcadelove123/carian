// app/projects/[projectId]/documents/actions.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase"

// 이 프로젝트의 팀 멤버인지 확인 → userId 반환
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

// ── 문서 추가 ────────────────────────────────────────────────
export async function createDocument(input: {
  projectId: string
  title: string
  url: string
  kind: string
  folderId: string | null
}): Promise<{ id: string; addedAt: string }> {
  const userId = await assertProjectMember(input.projectId)

  const { data: row, error } = await supabaseAdmin
    .from("documents")
    .insert({
      project_id: input.projectId,
      folder_id: input.folderId,
      title: input.title.trim() || "Untitled",
      url: input.url.trim() || null,
      kind: input.kind || "Doc",
      created_by: userId,
    })
    .select("id, created_at")
    .single()

  if (error || !row) throw new Error("failed to create document: " + error?.message)
  return { id: row.id, addedAt: row.created_at }
}

// ── 문서 삭제 ────────────────────────────────────────────────
export async function deleteDocument(projectId: string, docId: string): Promise<void> {
  await assertProjectMember(projectId)
  const { error } = await supabaseAdmin
    .from("documents")
    .delete()
    .eq("id", docId)
    .eq("project_id", projectId)
  if (error) throw new Error("failed to delete document: " + error.message)
}

// ── 문서를 다른 폴더로 이동 ──────────────────────────────────
export async function moveDocument(
  projectId: string,
  docId: string,
  folderId: string | null
): Promise<void> {
  await assertProjectMember(projectId)
  const { error } = await supabaseAdmin
    .from("documents")
    .update({ folder_id: folderId })
    .eq("id", docId)
    .eq("project_id", projectId)
  if (error) throw new Error("failed to move document: " + error.message)
}

// ── 폴더 생성 ────────────────────────────────────────────────
export async function createFolder(input: {
  projectId: string
  name: string
  color: string
}): Promise<{ id: string }> {
  const userId = await assertProjectMember(input.projectId)

  const { data: row, error } = await supabaseAdmin
    .from("document_folders")
    .insert({
      project_id: input.projectId,
      name: input.name.trim() || "Untitled folder",
      color: input.color || "indigo",
      created_by: userId,
    })
    .select("id")
    .single()

  if (error || !row) throw new Error("failed to create folder: " + error?.message)
  return { id: row.id }
}

// ── 폴더 삭제 (안의 문서는 루트로 이동 — FK on delete set null) ──
export async function deleteFolder(projectId: string, folderId: string): Promise<void> {
  await assertProjectMember(projectId)
  const { error } = await supabaseAdmin
    .from("document_folders")
    .delete()
    .eq("id", folderId)
    .eq("project_id", projectId)
  if (error) throw new Error("failed to delete folder: " + error.message)
}