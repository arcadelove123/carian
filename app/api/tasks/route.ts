// app/api/tasks/route.ts
// 익스텐션이 "내가 고를 수 있는 태스크 목록"을 불러오는 곳.
// 토큰 검증 → 내가 속한 팀들의 프로젝트 → 그 프로젝트의 태스크(완료 제외).

import { verifyToken } from "@clerk/backend"
import { createClient } from "@supabase/supabase-js"

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req: Request) {
  // ① 토큰에서 userId 확정
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) return json({ error: "missing token" }, 401)

  let userId: string
  try {
    const claims = await verifyToken(token, { secretKey: CLERK_SECRET_KEY })
    userId = claims.sub
    if (!userId) throw new Error("no sub")
  } catch {
    return json({ error: "invalid token" }, 401)
  }

  // ② 내가 속한 팀
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
  const teamIds = (memberships ?? []).map((m) => m.team_id)
  if (teamIds.length === 0) return json({ tasks: [] })

  // ③ 그 팀들의 프로젝트
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .in("team_id", teamIds)
  const projectIds = (projects ?? []).map((p) => p.id)
  if (projectIds.length === 0) return json({ tasks: [] })

  const projectName: Record<string, string> = {}
  ;(projects ?? []).forEach((p) => (projectName[p.id] = p.name ?? "Untitled"))

  // ④ 태스크 (완료된 건 제외 — 진행 중인 일에 붙이는 게 보통이니까)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, name, project_id, status")
    .in("project_id", projectIds)
    .neq("status", "done")
    .order("created_at", { ascending: false })

  return json({
    tasks: (tasks ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      project: projectName[t.project_id] ?? "",
    })),
  })
}