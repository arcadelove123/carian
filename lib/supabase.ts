// lib/supabase.ts
// 서버 전용 Supabase 클라이언트 (service_role 키 = RLS 우회).
// ⚠️ 이 파일은 절대 클라이언트 컴포넌트에서 import 하지 말 것.
//    service_role 키가 브라우저로 새면 안 된다. 서버 컴포넌트 / 라우트 / 서버액션에서만.

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})