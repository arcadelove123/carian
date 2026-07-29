// app/projects/[projectId]/members/members-client.tsx
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
import { Plus, Mail, Trash2, Pencil, Users, ClipboardList } from "lucide-react";
import {
  createMember,
  updateMember as srvUpdateMember,
  deleteMember as srvDeleteMember,
} from "./actions";

// ----- Types -----
export type Role = "Owner" | "Admin" | "Member" | "Viewer";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
  addedAt: string;
}

const ROLES: Role[] = ["Owner", "Admin", "Member", "Viewer"];

const ROLE_COLORS: Record<Role, string> = {
  Owner: "bg-purple-100 text-purple-700 border-purple-200",
  Admin: "bg-blue-100 text-blue-700 border-blue-200",
  Member: "bg-green-100 text-green-700 border-green-200",
  Viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MembersClient({
  projectId,
  initialMembers,
  assignees,
}: {
  projectId: string;
  initialMembers: Member[];
  assignees: string[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Member");

  function openAdd() {
    setEditId(null);
    setName("");
    setEmail("");
    setRole("Member");
    setDialogOpen(true);
  }

  function openEdit(m: Member) {
    setEditId(m.id);
    setName(m.name);
    setEmail(m.email);
    setRole(m.role);
    setDialogOpen(true);
  }

  async function save() {
    if (!name.trim()) return;
    const n = name.trim();
    const e = email.trim();

    if (editId) {
      // 수정
      setMembers((prev) =>
        prev.map((m) => (m.id === editId ? { ...m, name: n, email: e, role } : m))
      );
      setDialogOpen(false);
      srvUpdateMember(projectId, editId, { name: n, email: e, role }).catch((err) =>
        console.error("멤버 수정 실패:", err)
      );
    } else {
      // 추가
      const color = AVATAR_COLORS[members.length % AVATAR_COLORS.length];
      try {
        const { id, addedAt } = await createMember({
          projectId,
          name: n,
          email: e,
          role,
          color,
        });
        setMembers((prev) => [...prev, { id, name: n, email: e, role, color, addedAt }]);
        setDialogOpen(false);
      } catch (err) {
        console.error("멤버 추가 실패:", err);
        alert("멤버 추가에 실패했어요.");
      }
    }
  }

  function deleteMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    srvDeleteMember(projectId, id).catch((e) => console.error("멤버 삭제 실패:", e));
  }

  // How many tasks each member is assigned to (matched by name).
  function taskCount(memberName: string) {
    return assignees.filter(
      (a) => a && a.toLowerCase() === memberName.toLowerCase()
    ).length;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "person" : "people"} on this project
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Users className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No members yet. Add your teammates to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const count = taskCount(m.name);
            return (
              <div
                key={m.id}
                className="group relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${m.color}`}
                  >
                    {initials(m.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="size-3 shrink-0" />
                        {m.email}
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className={ROLE_COLORS[m.role]}>
                    {m.role}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClipboardList className="size-3" />
                    {count} task{count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(m)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Edit member"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Remove member"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes
                          {m.name ? ` ${m.name}` : " this member"} from the project. Their
                          tasks stay, but the assignee won&apos;t match anymore.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMember(m.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit member" : "Add member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="e.g. Jordan Lee"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full">
              {editId ? "Save changes" : "Add member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}