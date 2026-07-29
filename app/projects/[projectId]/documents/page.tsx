// app/projects/[projectId]/documents/page.tsx  (서버 컴포넌트)
import { redirect } from "next/navigation"
import { getMyTeam } from "@/lib/getMyTeam"
import { supabaseAdmin } from "@/lib/supabase"
import DocumentsClient, { type Doc, type Folder, type DocKind } from "./documents-client"

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const team = await getMyTeam()
  if (!team) redirect("/")

  const { data: folderRows } = await supabaseAdmin
    .from("document_folders")
    .select("id, name, color")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  const { data: docRows } = await supabaseAdmin
    .from("documents")
    .select("id, title, url, kind, folder_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  const folders: Folder[] = (folderRows ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color ?? "indigo",
  }))

  const docs: Doc[] = (docRows ?? []).map((d) => ({
    id: d.id,
    title: d.title ?? "Untitled",
    url: d.url ?? "",
    kind: (d.kind ?? "Doc") as DocKind,
    folderId: d.folder_id ?? null,
    addedAt: d.created_at,
  }))

  return <DocumentsClient projectId={projectId} initialDocs={docs} initialFolders={folders} />
}