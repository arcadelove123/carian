// lib/ai-source.ts
// AI 출처(source) 정규화 — 저장은 슬러그, 표시는 라벨, 비교는 항상 슬러그.
// + 공유 링크 URL에서 어떤 AI인지 자동 감지(멀티 AI 어댑터).

// ── 어댑터 표: 새 AI를 추가하려면 여기 한 줄만 추가하면 된다 ──
type Adapter = {
  slug: string
  label: string
  hosts: string[]        // 이 호스트면 이 AI
  sharePath?: RegExp     // 공유 링크인지 확인용(있으면 검사)
}

const ADAPTERS: Adapter[] = [
  { slug: "claude",     label: "Claude",     hosts: ["claude.ai"],                          sharePath: /\/share\// },
  { slug: "chatgpt",    label: "ChatGPT",    hosts: ["chatgpt.com", "chat.openai.com"],     sharePath: /\/share\// },
  { slug: "gemini",     label: "Gemini",     hosts: ["gemini.google.com", "share.gemini.google"],  sharePath: /\/(share|app)\// },
  { slug: "copilot",    label: "Copilot",    hosts: ["copilot.microsoft.com"] },
  { slug: "perplexity", label: "Perplexity", hosts: ["perplexity.ai", "www.perplexity.ai"] },
  { slug: "grok",       label: "Grok",       hosts: ["grok.com", "x.ai"] },
]

const LABELS: Record<string, string> = Object.fromEntries(
  ADAPTERS.map((a) => [a.slug, a.label])
)

// 어떤 값이든(도메인형/대소문자/라벨) → 슬러그
export function toSlug(raw: string | null | undefined): string {
  if (!raw) return ""
  const key = raw.trim().toLowerCase()

  // 라벨이나 슬러그로 바로 매칭
  for (const a of ADAPTERS) {
    if (key === a.slug || key === a.label.toLowerCase()) return a.slug
  }
  // 호스트 문자열이 섞여 있으면 흡수 ("claude.ai", "https://claude.ai/..." 등)
  for (const a of ADAPTERS) {
    if (a.hosts.some((h) => key.includes(h))) return a.slug
  }
  return key
}

// 슬러그 → 표시 라벨
export function slugToLabel(raw: string | null | undefined): string {
  const slug = toSlug(raw)
  if (!slug) return ""
  return LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}

// ── URL에서 AI 감지 ──────────────────────────────────────────
// 알려진 AI면 슬러그, https 링크지만 모르는 곳이면 "other", 링크가 아니면 ""
export function detectSource(url: string): string {
  let host = ""
  try {
    const u = new URL(url.trim())
    if (u.protocol !== "https:" && u.protocol !== "http:") return ""
    host = u.hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
  for (const a of ADAPTERS) {
    if (a.hosts.some((h) => host === h || host.endsWith("." + h))) return a.slug
  }
  return "other"
}

// 공유 링크로 받아들일 만한 URL인지
export function isShareUrl(url: string): boolean {
  return detectSource(url) !== ""
}

// 중복 판정용 키: "슬러그:마지막경로" (AI끼리 id가 겹쳐도 안 부딪히게)
export function shareKeyOf(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const seg = u.pathname.split("/").filter(Boolean).pop()
    if (!seg) return null
    return `${detectSource(url)}:${seg}`
  } catch {
    return null
  }
}

export const AI_SLUGS = ADAPTERS.map((a) => a.slug)
export const AI_LABELS = ADAPTERS.map((a) => a.label)