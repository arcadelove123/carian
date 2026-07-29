// app/projects/page.tsx  (서버 컴포넌트)
// getMyTeam()으로 내 팀 확보 → 그 팀의 프로젝트들을 Supabase에서 조회 →
// 각 프로젝트의 태스크 통계까지 계산해서 클라이언트 화면(ProjectsClient)에 넘긴다.
// service_role 접근은 여기(서버)서만. 화면/검색은 projects-client.tsx가 담당.

import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import { slugToLabel } from "@/lib/ai-source"
import ProjectsClient, { type ProjectCard } from "./projects-client"

export default async function ProjectsPage() {
  const team = await getMyTeam()
  if (!team) redirect("/") // 로그인 안 됐으면 랜딩으로

  // 1) 내가 속한 모든 팀의 프로젝트들 (초대받은 팀 포함)
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("user_id", team.userId)
  const teamIds = (memberships ?? []).map((m) => m.team_id)

  const { data: projects } = teamIds.length
    ? await supabaseAdmin
        .from("projects")
        .select("id, name, description, created_at")
        .in("team_id", teamIds)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; name: string; description: string | null; created_at: string }[] }

  const projectIds = (projects ?? []).map((p) => p.id)

  // 2) 그 프로젝트들의 태스크를 한 번에 (N+1 방지: in 으로 일괄 조회)
  const { data: tasks } = projectIds.length
    ? await supabaseAdmin
        .from("tasks")
        .select("id, project_id, status")
        .in("project_id", projectIds)
    : { data: [] as { id: string; project_id: string; status: string }[] }

  // 3.5) 프로젝트별 멤버(이름표)·문서 개수
  const { data: memberRows } = projectIds.length
    ? await supabaseAdmin.from("project_members").select("project_id").in("project_id", projectIds)
    : { data: [] as { project_id: string }[] }
  const { data: docRows } = projectIds.length
    ? await supabaseAdmin.from("documents").select("project_id").in("project_id", projectIds)
    : { data: [] as { project_id: string }[] }

  const memberCount: Record<string, number> = {}
  ;(memberRows ?? []).forEach((m) => { memberCount[m.project_id] = (memberCount[m.project_id] ?? 0) + 1 })
  const docCount: Record<string, number> = {}
  ;(docRows ?? []).forEach((d) => { docCount[d.project_id] = (docCount[d.project_id] ?? 0) + 1 })

  // 3) 그 태스크들에 붙은 트레일도 한 번에 (AI 종류 집계용)
  const taskIds = (tasks ?? []).map((t) => t.id)
  const { data: trails } = taskIds.length
    ? await supabaseAdmin
        .from("trails")
        .select("task_id, source")
        .in("task_id", taskIds)
    : { data: [] as { task_id: string | null; source: string | null }[] }

  // 4) 코드에서 프로젝트별 통계로 묶기
  const cards: ProjectCard[] = (projects ?? []).map((p) => {
    const pTasks = (tasks ?? []).filter((t) => t.project_id === p.id)
    const total = pTasks.length
    const done = pTasks.filter((t) => t.status === "done").length
    const pTaskIds = new Set(pTasks.map((t) => t.id))

    // 이 프로젝트 태스크들에 붙은 트레일의 AI 종류(라벨) 집계
    const aiSet = new Set<string>()
    ;(trails ?? []).forEach((tr) => {
      if (tr.task_id && pTaskIds.has(tr.task_id) && tr.source) {
        aiSet.add(slugToLabel(tr.source)) // "claude.ai"/"claude" → "Claude"
      }
    })

    return {
      id: p.id,
      title: p.name ?? "Untitled",
      desc: p.description ?? "",
      total,
      done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      members: memberCount[p.id] ?? 0,
      docs: docCount[p.id] ?? 0,
      ais: [...aiSet],
    }
  })

  return <ProjectsClient projects={cards} />
}