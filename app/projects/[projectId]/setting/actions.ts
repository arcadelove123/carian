// app/projects/[projectId]/setting/actions.ts
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

// ── 프로젝트 이름/설명 수정 ──────────────────────────────────
export async function updateProject(
  projectId: string,
  patch: { title: string; desc: string }
): Promise<void> {
  await assertProjectMember(projectId)

  const { error } = await supabaseAdmin
    .from("projects")
    .update({
      name: patch.title.trim() || "Untitled project",
      description: patch.desc.trim() || null,
    })
    .eq("id", projectId)
  if (error) throw new Error("failed to update project: " + error.message)
}

// ── 데이터 내보내기 (JSON 원본을 돌려주면 클라이언트가 파일로 저장) ──
export async function exportProject(projectId: string): Promise<Record<string, unknown>> {
  await assertProjectMember(projectId)

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, description, created_at")
    .eq("id", projectId)
    .maybeSingle()

  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)

  const taskIds = (tasks ?? []).map((t) => t.id)

  const { data: trails } = taskIds.length
    ? await supabaseAdmin.from("trails").select("*").in("task_id", taskIds)
    : { data: [] }

  const { data: comments } = taskIds.length
    ? await supabaseAdmin.from("comments").select("*").in("task_id", taskIds)
    : { data: [] }

  const { data: documents } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("project_id", projectId)

  const { data: docFolders } = await supabaseAdmin
    .from("document_folders")
    .select("*")
    .eq("project_id", projectId)

  const { data: members } = await supabaseAdmin
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)

  return {
    project,
    tasks: tasks ?? [],
    trails: trails ?? [],
    comments: comments ?? [],
    documents: documents ?? [],
    docFolders: docFolders ?? [],
    members: members ?? [],
    exportedAt: new Date().toISOString(),
  }
}

// ── 데이터 초기화 (프로젝트는 남기고 내용만 삭제) ─────────────
// 태스크를 지우면 딸린 트레일/코멘트도 FK cascade로 정리된다.
export async function clearProjectData(projectId: string): Promise<void> {
  await assertProjectMember(projectId)

  await supabaseAdmin.from("tasks").delete().eq("project_id", projectId)
  await supabaseAdmin.from("documents").delete().eq("project_id", projectId)
  await supabaseAdmin.from("document_folders").delete().eq("project_id", projectId)
  await supabaseAdmin.from("project_members").delete().eq("project_id", projectId)
}

// ── 프로젝트 삭제 ────────────────────────────────────────────
// projects 한 줄만 지우면 tasks/documents/... 가 on delete cascade로 함께 정리된다.
export async function deleteProject(projectId: string): Promise<void> {
  await assertProjectMember(projectId)

  const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId)
  if (error) throw new Error("failed to delete project: " + error.message)
}