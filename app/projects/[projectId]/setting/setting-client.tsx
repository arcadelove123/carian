// app/projects/[projectId]/setting/setting-client.tsx
// UI는 기존 그대로. localStorage 제거 → 서버 액션으로 저장/내보내기/삭제.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Save,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Database,
  CheckSquare,
  FileText,
  Users,
  CalendarClock,
  ArrowRight,
  Info,
  Hash,
  Clock,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react";
import {
  updateProject,
  exportProject,
  clearProjectData,
  deleteProject as srvDeleteProject,
} from "./actions";
import { createInvite } from "@/lib/invites";

export default function SettingClient({
  projectId,
  teamId,
  teammateCount,
  initialTitle,
  initialDesc,
  counts: initialCounts,
}: {
  projectId: string;
  teamId: string;
  teammateCount: number;
  initialTitle: string;
  initialDesc: string;
  counts: { tasks: number; docs: number; members: number };
}) {
  const router = useRouter();
  const base = `/projects/${projectId}`;

  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);
  const [saved, setSaved] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [counts, setCounts] = useState(initialCounts);

  // 팀 초대 링크
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function makeInvite() {
    setInviteBusy(true);
    try {
      const { code } = await createInvite(teamId);
      setInviteUrl(`${window.location.origin}/join/${code}`);
      setCopied(false);
    } catch (e) {
      console.error("초대 링크 생성 실패:", e);
      alert("초대 링크 생성에 실패했어요.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function saveProject() {
    try {
      await updateProject(projectId, { title, desc });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      console.error("프로젝트 저장 실패:", e);
      alert("저장에 실패했어요.");
    }
  }

  async function exportData() {
    try {
      const data = await exportProject(projectId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "project"}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("내보내기 실패:", e);
      alert("내보내기에 실패했어요.");
    }
  }

  async function clearData() {
    try {
      await clearProjectData(projectId);
      setCounts({ tasks: 0, docs: 0, members: 0 });
      router.refresh();
    } catch (e) {
      console.error("데이터 초기화 실패:", e);
      alert("초기화에 실패했어요.");
    }
  }

  async function deleteProject() {
    try {
      await srvDeleteProject(projectId);
      router.push("/projects");
      router.refresh();
    } catch (e) {
      console.error("프로젝트 삭제 실패:", e);
      alert("삭제에 실패했어요.");
    }
  }

  const canDelete = confirmText.trim() === "I understand";

  const quickLinks = [
    { href: `${base}/tasks`, label: "Tasks", icon: CheckSquare, count: counts.tasks },
    { href: `${base}/documents`, label: "Documents", icon: FileText, count: counts.docs },
    { href: `${base}/members`, label: "Members", icon: Users, count: counts.members },
    { href: `${base}/timeline`, label: "Timeline", icon: CalendarClock, count: null },
  ];

  return (
    <div className="p-8">
      <h1 className="mb-1 text-3xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage this project&apos;s details and data.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (main) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project details */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">Project details</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Project name</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What's this project about?"
                  className="min-h-[90px] resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveProject}>
                  <Save className="size-4" />
                  Save changes
                </Button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="size-4" />
                    Saved
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Team — 초대 */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              <h2 className="font-semibold">Team</h2>
              <Badge variant="secondary">{teammateCount} member{teammateCount !== 1 ? "s" : ""}</Badge>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Invite teammates with a link. Anyone who opens it joins this team and
              can see all of its projects. The link expires in 7 days.
            </p>

            {inviteUrl ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="outline" onClick={copyInvite} className="shrink-0">
                    {copied ? <CheckCircle2 className="size-4" /> : <LinkIcon className="size-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <button
                  onClick={makeInvite}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Generate a new link
                </button>
              </div>
            ) : (
              <Button variant="outline" onClick={makeInvite} disabled={inviteBusy}>
                <UserPlus className="size-4" />
                {inviteBusy ? "Creating…" : "Create invite link"}
              </Button>
            )}
          </section>

          {/* Data */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Database className="size-5 text-muted-foreground" />
              <h2 className="font-semibold">Data</h2>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{counts.tasks} tasks</Badge>
              <Badge variant="secondary">{counts.docs} documents</Badge>
              <Badge variant="secondary">{counts.members} members</Badge>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Your project data is stored on the server and shared with your team.
              Export a backup, or clear this project&apos;s data without deleting
              the project.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportData}>
                <Download className="size-4" />
                Export as JSON
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Trash2 className="size-4" />
                    Clear data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all project data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes every task, document, and member in this project.
                      The project itself stays. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearData}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Clear data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border-2 border-red-200 bg-red-50/40 p-6">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              <h2 className="font-semibold text-red-700">Danger zone</h2>
            </div>
            <p className="mb-4 text-sm text-red-600/80">
              Deleting the project removes it and all of its data permanently.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmText("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete project
            </Button>
          </section>
        </div>

        {/* Right column (side info) */}
        <div className="space-y-6">
          {/* Project summary */}
          <section className="rounded-xl border bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">{title || "Untitled project"}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {desc || "No description yet."}
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Hash className="size-3.5" />
                <span className="truncate font-mono">{projectId}</span>
              </div>
            </div>
          </section>

          {/* Quick links */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">Jump to</h2>
            <div className="space-y-1">
              {quickLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="group flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/60"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <l.icon className="size-4 text-muted-foreground" />
                    {l.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {l.count !== null && (
                      <span className="text-xs text-muted-foreground">{l.count}</span>
                    )}
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* About / tip */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              <h2 className="font-semibold">Good to know</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                Data is stored on the server, so your team sees the same thing.
              </li>
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                Renaming here updates the sidebar and project list instantly.
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Delete confirmation with typed phrase */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete this project?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This permanently deletes
              {title ? ` "${title}"` : " this project"} and all its tasks, documents,
              and members. This can&apos;t be undone.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">
                Type <span className="font-semibold text-foreground">I understand</span>{" "}
                to confirm
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canDelete) deleteProject();
                }}
                placeholder="I understand"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={!canDelete} onClick={deleteProject}>
                Delete project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}