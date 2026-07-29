// app/join/[code]/page.tsx
// 초대 링크를 열면 이 페이지가 팀에 합류시킨다.

import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { acceptInvite } from "@/lib/invites"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Users } from "lucide-react"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { userId } = await auth()

  // 로그인 안 했으면 로그인 후 다시 이 링크로 돌아오게
  if (!userId) redirect(`/sign-in?redirect_url=/join/${code}`)

  const result = await acceptInvite(code)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        {result.status === "joined" && (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mb-1 text-xl font-bold">팀에 합류했어요</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {result.teamName ? `"${result.teamName}"` : "팀"}의 프로젝트를 이제 함께 볼 수 있어요.
            </p>
          </>
        )}

        {result.status === "already" && (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <Users className="size-7" />
            </div>
            <h1 className="mb-1 text-xl font-bold">이미 이 팀의 멤버예요</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              바로 프로젝트로 이동하면 됩니다.
            </p>
          </>
        )}

        {result.status === "invalid" && (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <XCircle className="size-7" />
            </div>
            <h1 className="mb-1 text-xl font-bold">쓸 수 없는 초대 링크예요</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              만료됐거나 취소된 링크입니다. 팀에 새 링크를 요청해 주세요.
            </p>
          </>
        )}

        <Link href="/projects">
          <Button className="w-full">프로젝트로 이동</Button>
        </Link>
      </div>
    </main>
  )
}