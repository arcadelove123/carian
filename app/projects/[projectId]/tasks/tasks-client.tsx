// app/projects/[projectId]/tasks/tasks-client.tsx
// 1단계(읽기): 데이터는 서버(page.tsx)가 initialTasks로 넘겨준다.
// localStorage 읽기/쓰기 제거. UI·인터랙션 로직은 유지.
// ⚠️ 쓰기(추가/수정/이동/삭제)는 아직 화면 상태(useState)로만 반영됨 —
//    새로고침하면 사라진다. 2단계에서 서버 액션으로 실제 저장 연결 예정.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  ArrowRight,
  X,
  Link2,
  Calendar,
  User,
  Sparkles,
  Paperclip,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  FileText,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  createTask,
  updateTask as srvUpdateTask,
  moveTask as srvMoveTask,
  deleteTask as srvDeleteTask,
  createTrail as srvCreateTrail,
  updateTrail as srvUpdateTrail,
  deleteTrail as srvDeleteTrail,
  listFloatingTrails as srvListFloatingTrails,
  attachTrail as srvAttachTrail,
  createComment as srvCreateComment,
  deleteComment as srvDeleteComment,
  type FloatingTrail,
} from "./actions";
import { slugToLabel } from "@/lib/ai-source";

// ----- Types -----
export type Status = "todo" | "doing" | "done";
type SortKey = "added" | "due" | "type";

export interface TrailLink {
  id: string;
  title: string;
  description: string;
  aiUrl: string; // AI conversation/share link
  fileUrl: string; // produced file (PDF, doc, etc.)
  ai: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Task {
  id: string;
  name: string;
  startDate: string;
  type: string;
  assignee: string;
  attachment: string;
  dueDate: string;
  trails: TrailLink[];
  finalTrailId: string | null; // chosen when moved to Done
  comments: Comment[];
  lastActivity: string;
  status: Status;
}

// ----- Options -----
const TASK_TYPES = ["Design", "Development", "Research", "Writing", "Review"];
const AI_OPTIONS = ["None", "Claude", "ChatGPT", "Gemini", "Copilot"];

const AI_COLORS: Record<string, string> = {
  Claude: "bg-orange-100 text-orange-700 border-orange-200",
  ChatGPT: "bg-teal-100 text-teal-700 border-teal-200",
  Gemini: "bg-blue-100 text-blue-700 border-blue-200",
  Copilot: "bg-violet-100 text-violet-700 border-violet-200",
};
const TYPE_COLORS: Record<string, string> = {
  Design: "bg-pink-100 text-pink-700 border-pink-200",
  Development: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Research: "bg-amber-100 text-amber-700 border-amber-200",
  Writing: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Review: "bg-lime-100 text-lime-700 border-lime-200",
};

const columns: {
  status: Status;
  title: string;
  header: string;
  body: string;
  dot: string;
}[] = [
  { status: "todo", title: "To do", header: "bg-slate-100 text-slate-700", body: "bg-slate-50", dot: "bg-slate-400" },
  { status: "doing", title: "In progress", header: "bg-blue-100 text-blue-700", body: "bg-blue-50/50", dot: "bg-blue-500" },
  { status: "done", title: "Done", header: "bg-green-100 text-green-700", body: "bg-green-50/50", dot: "bg-green-500" },
];

// ----- Helpers -----
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}
function fmtDateTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
function usedAIs(task: Task): string[] {
  const set = new Set<string>();
  task.trails.forEach((t) => {
    if (t.ai && t.ai !== "None") set.add(t.ai);
  });
  return [...set];
}
function daysLeft(dueDate: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
function isUrgent(task: Task): boolean {
  if (task.status === "done") return false;
  const d = daysLeft(task.dueDate);
  return d !== null && d <= 3;
}
// Final trail floated to the top.
function orderedTrails(task: Task): TrailLink[] {
  if (!task.finalTrailId) return task.trails;
  const final = task.trails.find((t) => t.id === task.finalTrailId);
  if (!final) return task.trails;
  return [final, ...task.trails.filter((t) => t.id !== task.finalTrailId)];
}

function AiBadge({ ai }: { ai: string }) {
  return (
    <Badge variant="outline" className={`gap-1 ${AI_COLORS[ai] ?? "bg-muted text-foreground"}`}>
      <Sparkles className="size-3" />
      {ai}
    </Badge>
  );
}
function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={TYPE_COLORS[type] ?? "bg-muted text-foreground"}>
      {type}
    </Badge>
  );
}

export default function TasksClient({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: Task[];
}) {
  // 데이터는 서버가 준 initialTasks로 시작. (localStorage 제거)
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [members] = useState<{ name: string }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("added");

  // Done-confirmation state: which task is being completed.
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [chosenFinal, setChosenFinal] = useState<string>("");

  const [name, setName] = useState("");
  const [type, setType] = useState(TASK_TYPES[0]);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  // ⚠️ 1단계: 아래 함수들은 화면 상태(setTasks)만 바꾼다. 새로고침하면 사라짐.
  //    2단계에서 각 함수 안에 서버 액션 호출을 추가해 Supabase에 반영할 예정.

  async function addTask() {
    if (!name.trim()) return;
    try {
      const saved = await createTask({
        projectId,
        name,
        type,
        assignee,
        dueDate,
      });
      setTasks((prev) => [...prev, saved]);
      setName("");
      setType(TASK_TYPES[0]);
      setAssignee("");
      setDueDate("");
    } catch (e) {
      console.error("태스크 저장 실패:", e);
      alert("태스크 저장에 실패했어요. 콘솔을 확인해 주세요.");
    }
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...patch, lastActivity: new Date().toISOString() } : t
      )
    );
    // 서버 반영: DB에 있는 태스크 필드만(트레일/코멘트 배열은 제외 — 별도 단계에서 처리)
    const { name, type, assignee, dueDate, attachment, status, finalTrailId } = patch;
    const dbPatch: Parameters<typeof srvUpdateTask>[1] = {};
    if (name !== undefined) dbPatch.name = name;
    if (type !== undefined) dbPatch.type = type;
    if (assignee !== undefined) dbPatch.assignee = assignee;
    if (dueDate !== undefined) dbPatch.dueDate = dueDate;
    if (attachment !== undefined) dbPatch.attachment = attachment;
    if (status !== undefined) dbPatch.status = status;
    if (finalTrailId !== undefined) dbPatch.finalTrailId = finalTrailId;
    if (Object.keys(dbPatch).length > 0) {
      srvUpdateTask(id, dbPatch).catch((e) => console.error("업데이트 실패:", e));
    }
  }

  function moveTask(id: string, dir: "left" | "right") {
    const order: Status[] = ["todo", "doing", "done"];
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const i = order.indexOf(t.status);
    const next = dir === "left" ? i - 1 : i + 1;
    if (next < 0 || next > 2) return;

    // Moving INTO done -> ask for the final trail (if there are trails).
    if (order[next] === "done" && t.trails.length > 0) {
      setCompletingId(id);
      setChosenFinal(t.finalTrailId ?? t.trails[t.trails.length - 1].id);
      return;
    }
    // Moving OUT of done -> clear the final marker.
    if (t.status === "done" && order[next] !== "done") {
      setTasks((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: order[next], finalTrailId: null, lastActivity: new Date().toISOString() } : x
        )
      );
      srvMoveTask(id, order[next], null).catch((e) => console.error("이동 실패:", e));
      return;
    }
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: order[next], lastActivity: new Date().toISOString() } : x
      )
    );
    srvMoveTask(id, order[next], t.finalTrailId).catch((e) => console.error("이동 실패:", e));
  }

  function confirmComplete() {
    if (!completingId) return;
    const id = completingId;
    const finalId = chosenFinal || null;
    setTasks((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: "done", finalTrailId: finalId, lastActivity: new Date().toISOString() } : x
      )
    );
    srvMoveTask(id, "done", finalId).catch((e) => console.error("완료 실패:", e));
    setCompletingId(null);
    setChosenFinal("");
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setOpenId(null);
    srvDeleteTask(id).catch((e) => console.error("삭제 실패:", e));
  }

  function sortTasks(list: Task[]): Task[] {
    const bySort = (a: Task, b: Task) => {
      if (sortBy === "due") {
        const da = daysLeft(a.dueDate);
        const db = daysLeft(b.dueDate);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      if (sortBy === "type") return a.type.localeCompare(b.type);
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    };
    return [...list].sort((a, b) => {
      const ua = isUrgent(a);
      const ub = isUrgent(b);
      if (ua !== ub) return ua ? -1 : 1;
      return bySort(a, b);
    });
  }

  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const completingTask = tasks.find((t) => t.id === completingId) ?? null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Sort by</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="added">Recently added</SelectItem>
              <SelectItem value="due">Due date</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add a new task */}
      <div className="mb-8 max-w-2xl rounded-xl border bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Task name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              className="bg-white"
            />
          </div>
          <Button onClick={addTask}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assignee</Label>
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Who's on it?"
              className="h-9 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((col) => {
          const colTasks = sortTasks(tasks.filter((t) => t.status === col.status));
          return (
            <div key={col.status} className={`overflow-hidden rounded-xl border ${col.body}`}>
              <div className={`flex items-center justify-between px-4 py-3 ${col.header}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${col.dot}`} />
                  <h2 className="font-semibold">{col.title}</h2>
                </div>
                <span className="rounded-full bg-white/60 px-2 text-sm font-medium">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                {colTasks.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={() => setOpenId(task.id)}
                      onMove={(dir) => moveTask(task.id, dir)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail */}
      <Dialog open={!!openTask} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {openTask && (
            <TaskDetail
              task={openTask}
              members={members}
              onChange={(patch) => updateTask(openTask.id, patch)}
              onDelete={() => deleteTask(openTask.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Choose final trail when completing */}
      <Dialog
        open={!!completingId}
        onOpenChange={(o) => {
          if (!o) {
            setCompletingId(null);
            setChosenFinal("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Mark as done
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pick the final trail — the one that represents the finished work.
              It&apos;ll be pinned to the top.
            </p>
            <div className="space-y-2">
              {completingTask?.trails.map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => setChosenFinal(tr.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm ${
                    chosenFinal === tr.id
                      ? "border-amber-400 bg-amber-50 ring-1 ring-amber-200"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Star
                    className={`size-4 ${
                      chosenFinal === tr.id
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="truncate">{tr.title || "Untitled trail"}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setCompletingId(null);
                  setChosenFinal("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmComplete} disabled={!chosenFinal}>
                Mark done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Card (summary) ----------
function TaskCard({
  task,
  onOpen,
  onMove,
}: {
  task: Task;
  onOpen: () => void;
  onMove: (dir: "left" | "right") => void;
}) {
  const ais = usedAIs(task);
  const urgent = isUrgent(task);
  const d = daysLeft(task.dueDate);
  const finalTrail =
    task.status === "done" && task.finalTrailId
      ? task.trails.find((t) => t.id === task.finalTrailId)
      : null;

  return (
    <div
      className={`group rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        urgent ? "border-red-300 ring-1 ring-red-200" : ""
      }`}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <p className="break-words text-sm font-medium">{task.name}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <TypeBadge type={task.type} />
          {ais.map((ai) => (
            <AiBadge key={ai} ai={ai} />
          ))}
        </div>

        {/* Final trail highlight on done cards */}
        {finalTrail && (
          <div className="mt-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="truncate">{finalTrail.title || "Final trail"}</span>
          </div>
        )}

        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="size-3" />
              {task.assignee}
            </div>
          )}
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${urgent ? "font-semibold text-red-600" : ""}`}>
              {urgent ? <AlertTriangle className="size-3" /> : <Calendar className="size-3" />}
              {d !== null && d < 0
                ? `Overdue ${Math.abs(d)}d`
                : d === 0
                ? "Due today"
                : `Due ${fmtDate(task.dueDate)}${urgent ? ` (${d}d left)` : ""}`}
            </div>
          )}
          <div className="flex items-center gap-3">
            {task.trails.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="size-3" />
                {task.trails.length}
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {task.comments.length}
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-between border-t pt-2">
        <button
          onClick={() => onMove("left")}
          disabled={task.status === "todo"}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move left"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          onClick={() => onMove("right")}
          disabled={task.status === "done"}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move right"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ---------- Single trail row ----------
function TrailRow({
  trail,
  index,
  isFinal,
  onUpdate,
  onRemove,
}: {
  trail: TrailLink;
  index: number;
  isFinal: boolean;
  onUpdate: (patch: Partial<TrailLink>) => void;
  onRemove: () => void;
}) {
  const [showAi, setShowAi] = useState(trail.ai !== "None");

  return (
    <div
      className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isFinal ? "border-amber-300 ring-1 ring-amber-200" : ""
      }`}
    >
      {isFinal && (
        <div className="mb-2 flex items-center gap-1 text-xs font-medium text-amber-600">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          Final trail
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={trail.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
            placeholder="Trail title"
          />

          <Textarea
            value={trail.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="What happened in this step? (optional)"
            className="min-h-[56px] resize-none text-xs"
          />

          {/* AI share link */}
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-purple-500" />
            <Input
              value={trail.aiUrl}
              onChange={(e) => onUpdate({ aiUrl: e.target.value })}
              className="h-7 text-xs"
              placeholder="AI share link (chat URL)"
            />
          </div>

          {/* Produced file link */}
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 shrink-0 text-blue-500" />
            <Input
              value={trail.fileUrl}
              onChange={(e) => onUpdate({ fileUrl: e.target.value })}
              className="h-7 text-xs"
              placeholder="Work file link (PDF, doc…)"
            />
          </div>

          {/* Quick open links */}
          {(trail.aiUrl || trail.fileUrl) && (
            <div className="flex flex-wrap gap-3 text-xs">
              {trail.aiUrl && (
                <a
                  href={trail.aiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                >
                  <Sparkles className="size-3" />
                  Open AI
                </a>
              )}
              {trail.fileUrl && (
                <a
                  href={trail.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <FileText className="size-3" />
                  Open file
                </a>
              )}
            </div>
          )}

          {/* AI used */}
          {showAi ? (
            <div className="flex items-center gap-2">
              <Select value={trail.ai} onValueChange={(v) => onUpdate({ ai: v })}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {trail.ai !== "None" && <AiBadge ai={trail.ai} />}
              <button
                onClick={() => {
                  onUpdate({ ai: "None" });
                  setShowAi(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAi(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-3.5" />
              Add AI used
              <ChevronDown className="size-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onRemove}
          className="absolute right-2 top-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Remove trail"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ---------- Detail (full edit) ----------
function TaskDetail({
  task,
  members,
  onChange,
  onDelete,
}: {
  task: Task;
  members: { name: string }[];
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [trailTitle, setTrailTitle] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentText, setCommentText] = useState("");
  // 떠 있는 트레일(익스텐션 저장분 등) 붙이기용
  const [floating, setFloating] = useState<FloatingTrail[] | null>(null);
  const [showAttach, setShowAttach] = useState(false);

  async function openAttach() {
    setShowAttach(true);
    try {
      const list = await srvListFloatingTrails();
      setFloating(list);
    } catch (e) {
      console.error("떠 있는 트레일 불러오기 실패:", e);
      setFloating([]);
    }
  }

  async function attachExisting(t: FloatingTrail) {
    try {
      await srvAttachTrail(t.id, task.id);
      // 화면에도 즉시 반영
      onChange({
        trails: [
          ...task.trails,
          {
            id: t.id,
            title: t.title,
            description: "",
            aiUrl: t.shareUrl,
            fileUrl: "",
            ai: slugToLabel(t.source),
          },
        ],
      });
      setFloating((prev) => (prev ? prev.filter((x) => x.id !== t.id) : prev));
    } catch (e) {
      console.error("트레일 붙이기 실패:", e);
      alert("트레일 붙이기에 실패했어요.");
    }
  }
  const ais = usedAIs(task);
  const trails = orderedTrails(task);

  async function addTrail() {
    if (!trailTitle.trim()) return;
    const title = trailTitle.trim();
    try {
      const { id } = await srvCreateTrail({
        taskId: task.id,
        title,
        description: "",
        aiUrl: "",
        fileUrl: "",
        ai: "None",
      });
      onChange({
        trails: [
          ...task.trails,
          { id, title, description: "", aiUrl: "", fileUrl: "", ai: "None" },
        ],
      });
      setTrailTitle("");
    } catch (e) {
      console.error("트레일 추가 실패:", e);
      alert("트레일 추가에 실패했어요.");
    }
  }
  function updateTrail(id: string, patch: Partial<TrailLink>) {
    onChange({ trails: task.trails.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    srvUpdateTrail(id, patch).catch((e) => console.error("트레일 수정 실패:", e));
  }
  function removeTrail(id: string) {
    onChange({
      trails: task.trails.filter((t) => t.id !== id),
      finalTrailId: task.finalTrailId === id ? null : task.finalTrailId,
    });
    srvDeleteTrail(id).catch((e) => console.error("트레일 삭제 실패:", e));
  }
  async function addComment() {
    if (!commentText.trim()) return;
    const author = commentAuthor.trim() || "Anonymous";
    const text = commentText.trim();
    try {
      const { id, at } = await srvCreateComment({ taskId: task.id, author, text });
      onChange({
        comments: [...task.comments, { id, author, text, at }],
      });
      setCommentText("");
    } catch (e) {
      console.error("코멘트 추가 실패:", e);
      alert("코멘트 추가에 실패했어요.");
    }
  }
  function removeComment(id: string) {
    onChange({ comments: task.comments.filter((c) => c.id !== id) });
    srvDeleteComment(id).catch((e) => console.error("코멘트 삭제 실패:", e));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-center gap-2">
            <Input
              value={task.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="!text-lg font-semibold"
            />
            {task.status === "done" && (
              <Badge className="shrink-0 bg-green-600">Done</Badge>
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Editable meta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={task.type} onValueChange={(v) => onChange({ type: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assignee</Label>
            <Input
              value={task.assignee}
              onChange={(e) => onChange({ assignee: e.target.value })}
              placeholder="Who's on it?"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due date</Label>
            <Input
              type="date"
              value={task.dueDate}
              onChange={(e) => onChange({ dueDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="flex items-end">
            <div className="flex flex-wrap gap-1">
              {ais.map((ai) => (
                <AiBadge key={ai} ai={ai} />
              ))}
            </div>
          </div>
        </div>

        {/* Trails */}
        <div className="space-y-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="size-5 text-indigo-600" />
              <span className="text-base font-semibold">Trails</span>
            </div>
            <Badge className="bg-indigo-600">{task.trails.length}</Badge>
          </div>

          {trails.length > 0 && (
            <div className="space-y-2.5">
              {trails.map((tr, i) => (
                <TrailRow
                  key={tr.id}
                  trail={tr}
                  index={i}
                  isFinal={task.finalTrailId === tr.id}
                  onUpdate={(patch) => updateTrail(tr.id, patch)}
                  onRemove={() => removeTrail(tr.id)}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2 rounded-lg border border-dashed border-indigo-300 bg-white/50 p-3">
            <Input
              value={trailTitle}
              onChange={(e) => setTrailTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTrail()}
              placeholder="Add a trail step…"
              className="h-8 flex-1 bg-white text-sm"
            />
            <Button size="sm" onClick={addTrail} className="shrink-0">
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {/* 기존(떠 있는) 트레일 붙이기 */}
          <div className="rounded-lg border border-dashed border-indigo-300 bg-white/40 p-3">
            {!showAttach ? (
              <button
                onClick={openAttach}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Sparkles className="size-3.5" />
                Attach a saved trail (from extension)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Saved trails not yet attached
                  </span>
                  <button
                    onClick={() => setShowAttach(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {floating === null ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">Loading…</p>
                ) : floating.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No unattached trails.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {floating.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => attachExisting(t)}
                        className="flex w-full items-center gap-2 rounded-md border bg-white p-2 text-left text-xs hover:bg-indigo-50"
                      >
                        <Link2 className="size-3.5 shrink-0 text-indigo-500" />
                        <span className="min-w-0 flex-1 truncate">
                          {t.title || "Untitled trail"}
                        </span>
                        {t.source && (
                          <AiBadge ai={slugToLabel(t.source)} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comments — only after done */}
        {task.status === "done" && (
          <div className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-green-600" />
              <span className="text-base font-semibold">Comments</span>
              <Badge variant="secondary">{task.comments.length}</Badge>
            </div>

            {task.comments.length > 0 && (
              <div className="space-y-2">
                {task.comments.map((c) => (
                  <div key={c.id} className="group rounded-lg border bg-muted/20 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{c.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(c.at)}
                        </span>
                        <button
                          onClick={() => removeComment(c.id)}
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete comment"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
              {members.length > 0 ? (
                <Select value={commentAuthor} onValueChange={setCommentAuthor}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your name"
                  className="h-8 text-xs"
                />
              )}
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment…"
                  className="min-h-[44px] flex-1 resize-none text-sm"
                />
                <Button size="icon" onClick={addComment} className="shrink-0 self-end">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attachment */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Paperclip className="size-4" />
            Attachment link
          </Label>
          <Input
            value={task.attachment}
            onChange={(e) => onChange({ attachment: e.target.value })}
            placeholder="https://… (file or folder URL)"
          />
        </div>

        {/* Read-only meta */}
        <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
          <div>Started: {fmtDate(task.startDate)}</div>
          <div>Last activity: {fmtDateTime(task.lastActivity)}</div>
        </div>

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Delete task
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove
                {task.name ? ` "${task.name}"` : " this task"} and its trails.
                This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}