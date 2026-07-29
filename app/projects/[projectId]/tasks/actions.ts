// app/projects/[projectId]/tasks/actions.ts
// 서버 액션: 클라이언트에서 부르지만 서버에서 실행(service_role 안전).
// createTask / updateTask / moveTask / deleteTask.

"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "@/lib/supabase"
import { toSlug } from "@/lib/ai-source"
import type { Task, Status } from "./tasks-client"

// 유효한 날짜(YYYY-MM-DD)만 통과. 빈 값이나 말도 안 되는 값은 null.
function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null
  const t = new Date(d).getTime()
  if (isNaN(t)) return null
  const year = new Date(d).getFullYear()
  if (year < 2000 || year > 2100) return null
  return d
}

// "이 유저가 이 프로젝트의 팀 멤버인가?" 확인. 아니면 throw.
// 반환: 확정된 userId (남의 프로젝트에 못 쓰게 하는 관문)
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

// "이 태스크가 내 팀 프로젝트에 속하나?" 확인 (update/move/delete용).
async function assertTaskMember(taskId: string): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .maybeSingle()
  if (!task) throw new Error("task not found")

  await assertProjectMember(task.project_id)
  return userId
}

// ── 생성 ────────────────────────────────────────────────────
export async function createTask(input: {
  projectId: string
  name: string
  type: string
  assignee: string
  dueDate: string
}): Promise<Task> {
  const userId = await assertProjectMember(input.projectId)

  const { data: row, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      type: input.type || null,
      assignee: input.assignee.trim() || null,
      due_date: normalizeDate(input.dueDate),
      status: "todo",
      created_by: userId,
    })
    .select(
      "id, name, type, assignee, due_date, status, final_trail_id, attachment, created_at, updated_at"
    )
    .single()

  if (error || !row) throw new Error("failed to create task: " + error?.message)

  return {
    id: row.id,
    name: row.name,
    type: row.type ?? "",
    assignee: row.assignee ?? "",
    attachment: row.attachment ?? "",
    dueDate: row.due_date ?? "",
    status: (row.status ?? "todo") as Status,
    finalTrailId: row.final_trail_id ?? null,
    startDate: row.created_at,
    lastActivity: row.updated_at,
    trails: [],
    comments: [],
  }
}

// ── 수정 (이름/타입/담당/마감/첨부/상태/최종트레일) ──────────
// 코드의 Partial<Task> patch 중 DB에 있는 필드만 골라 업데이트.
export async function updateTask(
  taskId: string,
  patch: {
    name?: string
    type?: string
    assignee?: string
    dueDate?: string
    attachment?: string
    status?: Status
    finalTrailId?: string | null
  }
): Promise<void> {
  await assertTaskMember(taskId)

  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.type !== undefined) dbPatch.type = patch.type || null
  if (patch.assignee !== undefined) dbPatch.assignee = patch.assignee || null
  if (patch.dueDate !== undefined) dbPatch.due_date = normalizeDate(patch.dueDate)
  if (patch.attachment !== undefined) dbPatch.attachment = patch.attachment || null
  if (patch.status !== undefined) dbPatch.status = patch.status
  if (patch.finalTrailId !== undefined) dbPatch.final_trail_id = patch.finalTrailId

  if (Object.keys(dbPatch).length === 0) return

  const { error } = await supabaseAdmin.from("tasks").update(dbPatch).eq("id", taskId)
  if (error) throw new Error("failed to update task: " + error.message)
}

// ── 이동 (상태 변경 + 완료 시 최종 트레일) ──────────────────
export async function moveTask(
  taskId: string,
  status: Status,
  finalTrailId: string | null
): Promise<void> {
  await assertTaskMember(taskId)

  const { error } = await supabaseAdmin
    .from("tasks")
    .update({ status, final_trail_id: finalTrailId })
    .eq("id", taskId)
  if (error) throw new Error("failed to move task: " + error.message)
}

// ── 삭제 ────────────────────────────────────────────────────
export async function deleteTask(taskId: string): Promise<void> {
  await assertTaskMember(taskId)

  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", taskId)
  if (error) throw new Error("failed to delete task: " + error.message)
}


// ── 트레일: 태스크에 새로 추가 ───────────────────────────────
// 웹앱에서 수동 작성하는 트레일. share_id/saved_at은 비움(익스텐션 것과 구분).
// AI 종류(ai 라벨/도메인 등)는 저장 직전 슬러그로 정규화해서 source에 넣는다.
export async function createTrail(input: {
  taskId: string
  title: string
  description: string
  aiUrl: string   // 코드 aiUrl → DB share_url
  fileUrl: string
  ai: string      // 코드 ai → DB source(슬러그)
}): Promise<{ id: string }> {
  const userId = await assertTaskMember(input.taskId)

  // 이 태스크의 team_id를 가져와 트레일에도 박아둔다(팀 소속 일관성)
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("project_id")
    .eq("id", input.taskId)
    .maybeSingle()
  let teamId: string | null = null
  if (task) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("team_id")
      .eq("id", task.project_id)
      .maybeSingle()
    teamId = project?.team_id ?? null
  }

  const { data: row, error } = await supabaseAdmin
    .from("trails")
    .insert({
      task_id: input.taskId,
      team_id: teamId,
      user_id: userId,
      title: input.title.trim() || "Untitled",
      description: input.description || null,
      share_url: input.aiUrl || null,
      file_url: input.fileUrl || null,
      source: input.ai && input.ai !== "None" ? toSlug(input.ai) : null,
    })
    .select("id")
    .single()

  if (error || !row) throw new Error("failed to create trail: " + error?.message)
  return { id: row.id }
}

// ── 트레일: 수정 ─────────────────────────────────────────────
export async function updateTrail(
  trailId: string,
  patch: { title?: string; description?: string; aiUrl?: string; fileUrl?: string; ai?: string }
): Promise<void> {
  // 트레일이 어느 태스크 소속인지 확인 후 권한 검사
  const { data: trail } = await supabaseAdmin
    .from("trails")
    .select("task_id")
    .eq("id", trailId)
    .maybeSingle()
  if (!trail?.task_id) throw new Error("trail not found")
  await assertTaskMember(trail.task_id)

  const dbPatch: Record<string, unknown> = {}
  if (patch.title !== undefined) dbPatch.title = patch.title || "Untitled"
  if (patch.description !== undefined) dbPatch.description = patch.description || null
  if (patch.aiUrl !== undefined) dbPatch.share_url = patch.aiUrl || null
  if (patch.fileUrl !== undefined) dbPatch.file_url = patch.fileUrl || null
  if (patch.ai !== undefined) dbPatch.source = patch.ai && patch.ai !== "None" ? toSlug(patch.ai) : null

  if (Object.keys(dbPatch).length === 0) return
  const { error } = await supabaseAdmin.from("trails").update(dbPatch).eq("id", trailId)
  if (error) throw new Error("failed to update trail: " + error.message)
}

// ── 트레일: 삭제 ─────────────────────────────────────────────
export async function deleteTrail(trailId: string): Promise<void> {
  const { data: trail } = await supabaseAdmin
    .from("trails")
    .select("task_id")
    .eq("id", trailId)
    .maybeSingle()
  if (!trail?.task_id) throw new Error("trail not found")
  await assertTaskMember(trail.task_id)

  const { error } = await supabaseAdmin.from("trails").delete().eq("id", trailId)
  if (error) throw new Error("failed to delete trail: " + error.message)
}


// ── 트레일 B: 아직 제대로 안 붙은 "떠 있는 트레일" 목록 ──────────
// 익스텐션이 저장했지만 task_id가 없거나, DEMO 문자열("pricing" 등)처럼
// 진짜 태스크 UUID가 아닌 것 = 아직 어느 태스크에도 안 붙은 것.
// 내(user_id) 것만 후보로 돌려준다.
export type FloatingTrail = {
  id: string
  title: string
  shareUrl: string
  source: string // 표시용은 클라이언트에서 slugToLabel 처리
}

export async function listFloatingTrails(): Promise<FloatingTrail[]> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  // 내 트레일 전부
  const { data: mine } = await supabaseAdmin
    .from("trails")
    .select("id, title, share_url, source, task_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  // 진짜 태스크 UUID 집합 (내가 접근 가능한 팀들의 태스크)
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
  const teamIds = (memberships ?? []).map((m) => m.team_id)

  const { data: projects } = teamIds.length
    ? await supabaseAdmin.from("projects").select("id").in("team_id", teamIds)
    : { data: [] as { id: string }[] }
  const projectIds = (projects ?? []).map((p) => p.id)

  const { data: realTasks } = projectIds.length
    ? await supabaseAdmin.from("tasks").select("id").in("project_id", projectIds)
    : { data: [] as { id: string }[] }
  const realTaskIds = new Set((realTasks ?? []).map((t) => t.id))

  // task_id가 없거나, 진짜 태스크 id가 아닌 것 = 떠 있는 트레일
  return (mine ?? [])
    .filter((t) => !t.task_id || !realTaskIds.has(t.task_id))
    .map((t) => ({
      id: t.id,
      title: t.title ?? "Untitled",
      shareUrl: t.share_url ?? "",
      source: t.source ?? "",
    }))
}

// ── 트레일 B: 떠 있는 트레일을 이 태스크에 붙이기 ────────────────
// task_id를 진짜 태스크 UUID로 교체하고, 그 태스크의 team_id도 채워준다.
export async function attachTrail(trailId: string, taskId: string): Promise<void> {
  const userId = await assertTaskMember(taskId)

  // 이 트레일이 내 것인지 확인
  const { data: trail } = await supabaseAdmin
    .from("trails")
    .select("id, user_id")
    .eq("id", trailId)
    .maybeSingle()
  if (!trail) throw new Error("trail not found")
  if (trail.user_id !== userId) throw new Error("not your trail")

  // 태스크의 team_id 조회
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle()
  let teamId: string | null = null
  if (task) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("team_id")
      .eq("id", task.project_id)
      .maybeSingle()
    teamId = project?.team_id ?? null
  }

  const { error } = await supabaseAdmin
    .from("trails")
    .update({ task_id: taskId, team_id: teamId })
    .eq("id", trailId)
  if (error) throw new Error("failed to attach trail: " + error.message)
}


// ── 코멘트: 추가 ─────────────────────────────────────────────
export async function createComment(input: {
  taskId: string
  author: string
  text: string
}): Promise<{ id: string; at: string }> {
  const userId = await assertTaskMember(input.taskId)

  const { data: row, error } = await supabaseAdmin
    .from("comments")
    .insert({
      task_id: input.taskId,
      author: input.author.trim() || "Anonymous",
      user_id: userId,
      text: input.text.trim(),
    })
    .select("id, created_at")
    .single()

  if (error || !row) throw new Error("failed to create comment: " + error?.message)
  return { id: row.id, at: row.created_at }
}

// ── 코멘트: 삭제 ─────────────────────────────────────────────
export async function deleteComment(commentId: string): Promise<void> {
  const { data: comment } = await supabaseAdmin
    .from("comments")
    .select("task_id")
    .eq("id", commentId)
    .maybeSingle()
  if (!comment?.task_id) throw new Error("comment not found")
  await assertTaskMember(comment.task_id)

  const { error } = await supabaseAdmin.from("comments").delete().eq("id", commentId)
  if (error) throw new Error("failed to delete comment: " + error.message)
}