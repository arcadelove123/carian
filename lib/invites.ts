// lib/invites.ts
// 팀 초대: 코드 생성 / 수락(합류).

"use server"

import { auth } from "@clerk/nextjs/server"
import { supabaseAdmin } from "./supabase"

// 읽기 쉬운 코드 (혼동되는 문자 제외)
function makeCode(len = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
  let s = ""
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

// ── 초대 코드 생성 (그 팀 멤버만 가능) ────────────────────────
export async function createInvite(teamId: string): Promise<{ code: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  const { data: membership } = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!membership) throw new Error("not a member of this team")

  const code = makeCode()
  const { error } = await supabaseAdmin
    .from("team_invites")
    .insert({ team_id: teamId, code, created_by: userId })
  if (error) throw new Error("failed to create invite: " + error.message)

  return { code }
}

// ── 초대 수락 → 팀 합류 ──────────────────────────────────────
// 결과: joined(새로 합류) | already(이미 멤버) | invalid(코드 없음/만료/취소)
export async function acceptInvite(
  code: string
): Promise<{ status: "joined" | "already" | "invalid"; teamName?: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("not signed in")

  const { data: invite } = await supabaseAdmin
    .from("team_invites")
    .select("id, team_id, expires_at, revoked")
    .eq("code", code)
    .maybeSingle()

  if (!invite || invite.revoked) return { status: "invalid" }
  if (new Date(invite.expires_at).getTime() < Date.now()) return { status: "invalid" }

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("name")
    .eq("id", invite.team_id)
    .maybeSingle()

  // 이미 멤버인가?
  const { data: existing } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("team_id", invite.team_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) return { status: "already", teamName: team?.name }

  const { error } = await supabaseAdmin
    .from("team_members")
    .insert({ team_id: invite.team_id, user_id: userId, role: "member" })
  if (error) throw new Error("failed to join team: " + error.message)

  return { status: "joined", teamName: team?.name }
}