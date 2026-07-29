// app/projects/[projectId]/documents/documents-client.tsx
// UI는 기존 그대로. 데이터는 props로 받고, 변경은 서버 액션으로 저장한다.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileText,
  ExternalLink,
  Trash2,
  Search,
  Link2,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
} from "lucide-react";
import {
  createDocument,
  deleteDocument as srvDeleteDocument,
  moveDocument as srvMoveDocument,
  createFolder as srvCreateFolder,
  deleteFolder as srvDeleteFolder,
} from "./actions";

// ----- Types -----
export type DocKind = "Doc" | "Sheet" | "Slide" | "Design" | "Note" | "Other";

export interface Doc {
  id: string;
  title: string;
  url: string;
  kind: DocKind;
  folderId: string | null; // null = root
  addedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}

const DOC_KINDS: DocKind[] = ["Doc", "Sheet", "Slide", "Design", "Note", "Other"];

const KIND_COLORS: Record<DocKind, string> = {
  Doc: "bg-blue-100 text-blue-700 border-blue-200",
  Sheet: "bg-green-100 text-green-700 border-green-200",
  Slide: "bg-orange-100 text-orange-700 border-orange-200",
  Design: "bg-pink-100 text-pink-700 border-pink-200",
  Note: "bg-amber-100 text-amber-700 border-amber-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

const FOLDER_COLORS = ["indigo", "rose", "emerald", "amber", "sky", "violet"] as const;

const FOLDER_STYLES: Record<string, { bg: string; icon: string; ring: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-500", ring: "hover:border-indigo-300" },
  rose: { bg: "bg-rose-50", icon: "text-rose-500", ring: "hover:border-rose-300" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", ring: "hover:border-emerald-300" },
  amber: { bg: "bg-amber-50", icon: "text-amber-500", ring: "hover:border-amber-300" },
  sky: { bg: "bg-sky-50", icon: "text-sky-500", ring: "hover:border-sky-300" },
  violet: { bg: "bg-violet-50", icon: "text-violet-500", ring: "hover:border-violet-300" },
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function DocumentsClient({
  projectId,
  initialDocs,
  initialFolders,
}: {
  projectId: string;
  initialDocs: Doc[];
  initialFolders: Folder[];
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [query, setQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  // New-doc form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<DocKind>("Doc");

  // New-folder form
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState<string>("indigo");

  async function addDoc() {
    if (!title.trim() && !url.trim()) return;
    const finalTitle = title.trim() || hostOf(url) || "Untitled";
    try {
      const { id, addedAt } = await createDocument({
        projectId,
        title: finalTitle,
        url,
        kind,
        folderId: currentFolder,
      });
      setDocs((prev) => [
        { id, title: finalTitle, url: url.trim(), kind, folderId: currentFolder, addedAt },
        ...prev,
      ]);
      setTitle("");
      setUrl("");
      setKind("Doc");
      setAddOpen(false);
    } catch (e) {
      console.error("문서 추가 실패:", e);
      alert("문서 추가에 실패했어요.");
    }
  }

  function deleteDoc(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    srvDeleteDocument(projectId, id).catch((e) => console.error("문서 삭제 실패:", e));
  }

  function moveDoc(id: string, folderId: string | null) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, folderId } : d)));
    srvMoveDocument(projectId, id, folderId).catch((e) => console.error("문서 이동 실패:", e));
  }

  async function addFolder() {
    if (!folderName.trim()) return;
    const name = folderName.trim();
    try {
      const { id } = await srvCreateFolder({ projectId, name, color: folderColor });
      setFolders((prev) => [...prev, { id, name, color: folderColor }]);
      setFolderName("");
      setFolderColor("indigo");
      setFolderOpen(false);
    } catch (e) {
      console.error("폴더 생성 실패:", e);
      alert("폴더 생성에 실패했어요.");
    }
  }

  // Deleting a folder moves its docs back to root (doesn't delete them).
  function deleteFolder(id: string) {
    setDocs((prev) => prev.map((d) => (d.folderId === id ? { ...d, folderId: null } : d)));
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (currentFolder === id) setCurrentFolder(null);
    srvDeleteFolder(projectId, id).catch((e) => console.error("폴더 삭제 실패:", e));
  }

  const activeFolder = folders.find((f) => f.id === currentFolder) ?? null;

  const visibleDocs = docs
    .filter((d) => d.folderId === currentFolder)
    .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  function docCount(folderId: string) {
    return docs.filter((d) => d.folderId === folderId).length;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFolderOpen(true)}>
            <FolderPlus className="size-4" />
            New folder
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add document
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentFolder(null)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted ${
            !activeFolder ? "font-medium" : "text-muted-foreground"
          }`}
        >
          <Home className="size-4" />
          All documents
        </button>
        {activeFolder && (
          <>
            <ChevronRight className="size-4 text-muted-foreground" />
            <span className="rounded-md px-2 py-1 font-medium">{activeFolder.name}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in this view…"
          className="pl-9"
        />
      </div>

      {/* Folders (only at root, when not searching) */}
      {!activeFolder && !query && folders.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => {
              const s = FOLDER_STYLES[f.color] ?? FOLDER_STYLES.indigo;
              return (
                <div
                  key={f.id}
                  className={`group relative cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${s.ring}`}
                  onClick={() => setCurrentFolder(f.id)}
                >
                  <div className={`mb-3 flex size-11 items-center justify-center rounded-lg ${s.bg}`}>
                    <Folder className={`size-6 ${s.icon}`} />
                  </div>
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {docCount(f.id)} item{docCount(f.id) !== 1 ? "s" : ""}
                  </p>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete folder"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Documents inside will move back to All documents, not be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteFolder(f.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents */}
      {!activeFolder && !query && folders.length > 0 && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Documents
        </p>
      )}

      {visibleDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {query
              ? "No documents match your search."
              : "No documents here yet. Add a link to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDocs.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                  <FileText className="size-5 text-indigo-500" />
                </div>
                <Badge variant="outline" className={KIND_COLORS[doc.kind]}>
                  {doc.kind}
                </Badge>
              </div>

              <p className="mb-1 break-words font-medium leading-tight">{doc.title}</p>
              {doc.url && (
                <p className="mb-3 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Link2 className="size-3 shrink-0" />
                  {hostOf(doc.url) || doc.url}
                </p>
              )}

              {/* Move to folder */}
              <div className="mb-3">
                <Select
                  value={doc.folderId ?? "root"}
                  onValueChange={(v) => moveDoc(doc.id, v === "root" ? null : v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{fmtDate(doc.addedAt)}</span>
                <div className="flex items-center gap-1">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Open
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete document"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the link to
                          {doc.title ? ` "${doc.title}"` : " this document"}. The actual file
                          isn&apos;t affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteDoc(doc.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add document dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add document{activeFolder ? ` to "${activeFolder.name}"` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Roadmap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDoc()}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addDoc} className="w-full">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Folder name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFolder()}
                placeholder="e.g. Specs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => {
                  const s = FOLDER_STYLES[c];
                  return (
                    <button
                      key={c}
                      onClick={() => setFolderColor(c)}
                      className={`flex size-10 items-center justify-center rounded-lg ${s.bg} ${
                        folderColor === c ? "ring-2 ring-offset-2 ring-foreground" : ""
                      }`}
                      aria-label={c}
                    >
                      <Folder className={`size-5 ${s.icon}`} />
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={addFolder} className="w-full">
              <FolderPlus className="size-4" />
              Create folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}