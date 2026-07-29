// app/api/ingest/route.ts
// 익스텐션이 트레일을 던지는 현관문.
// ① 토큰 검증 → userId 확정  ② URL에서 AI 감지  ③ task_id 검증(내 팀 태스크인가)
// ④ Supabase upsert (team_id까지 채움)

import { verifyToken } from "@clerk/backend"
import { createClient } from "@supabase/supabase-js"
import { detectSource, shareKeyOf } from "@/lib/ai-source"

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(req: Request) {
  // ── ① 토큰 → userId ──────────────────────────────────────
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

  // ── ② 본문 + URL 검증 ────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: "bad json" }, 400)
  }

  const shareUrl = String(body?.shareUrl ?? "").trim()
  const source = detectSource(shareUrl) // 어떤 AI인지 URL에서 감지
  if (!source) return json({ error: "not a valid share link" }, 400)

  const shareKey = shareKeyOf(shareUrl) // 중복 판정용 "슬러그:마지막경로"

  // ── ③ task_id 검증: 진짜 내 팀 태스크인가 ────────────────
  // (익스텐션이 태스크를 안 고르면 null — 나중에 웹앱에서 붙이면 됨)
  let taskId: string | null = null
  let teamId: string | null = null

  const rawTaskId = body?.taskId ? String(body.taskId) : ""
  if (rawTaskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", rawTaskId)
      .maybeSingle()

    if (task) {
      const { data: project } = await supabase
        .from("projects")
        .select("team_id")
        .eq("id", task.project_id)
        .maybeSingle()

      if (project) {
        const { data: membership } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("team_id", project.team_id)
          .eq("user_id", userId)
          .maybeSingle()

        if (membership) {
          taskId = task.id
          teamId = project.team_id
        }
      }
    }
    // 못 찾거나 내 팀이 아니면 taskId는 null로 둔다(저장은 되게, 붙이기만 보류)
  }

  const row = {
    user_id: userId, // ★ 토큰에서 온 값
    team_id: teamId,
    task_id: taskId,
    share_url: shareUrl,
    share_id: shareKey,
    title: String(body?.title ?? "").trim() || "Untitled",
    source, // claude / chatgpt / gemini / ... / other
    saved_at: new Date().toISOString(),
  }

  // ── ④ upsert (같은 대화 재저장 시 갱신) ──────────────────
  const { data, error } = await supabase
    .from("trails")
    .upsert(row, { onConflict: "user_id,share_id" })
    .select("id")
    .single()

  if (error) return json({ error: "db error", detail: error.message }, 500)

  return json({ ok: true, id: data.id, source, attached: !!taskId }, 200)
}