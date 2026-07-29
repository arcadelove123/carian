// app/projects/[projectId]/overview/overview-client.tsx
// UI·통계 로직은 기존 그대로. 데이터만 props로 받는다.

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CalendarClock,
} from "lucide-react";

// ----- Shared types -----
export type Status = "todo" | "doing" | "done";
export interface TrailLink {
  id: string;
  ai: string;
}
export interface Task {
  id: string;
  name: string;
  type: string;
  assignee: string;
  dueDate: string;
  trails: TrailLink[];
  status: Status;
}
export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
}
export interface Doc {
  id: string;
  title: string;
}

const STATUS_STYLES: Record<Status, { dot: string; label: string }> = {
  todo: { dot: "bg-slate-400", label: "To do" },
  doing: { dot: "bg-blue-500", label: "In progress" },
  done: { dot: "bg-green-500", label: "Done" },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function daysLeft(dueDate: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function OverviewClient({
  projectId,
  tasks,
  members,
  docs,
}: {
  projectId: string;
  tasks: Task[];
  members: Member[];
  docs: Doc[];
}) {
  const base = `/projects/${projectId}`;

  // Derived stats
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  // Urgent: not done, due within 3 days (including overdue), sorted by soonest.
  const urgent = tasks
    .filter((t) => {
      if (t.status === "done") return false;
      const d = daysLeft(t.dueDate);
      return d !== null && d <= 3;
    })
    .sort((a, b) => (daysLeft(a.dueDate) ?? 0) - (daysLeft(b.dueDate) ?? 0));

  // Upcoming (next due dates, not done, not already urgent), soonest first.
  const upcoming = tasks
    .filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const d = daysLeft(t.dueDate);
      return d !== null && d > 3;
    })
    .sort((a, b) => (daysLeft(a.dueDate) ?? 0) - (daysLeft(b.dueDate) ?? 0))
    .slice(0, 4);

  // AI usage across all trails.
  const aiCounts: Record<string, number> = {};
  tasks.forEach((t) =>
    t.trails.forEach((tr) => {
      if (tr.ai && tr.ai !== "None") aiCounts[tr.ai] = (aiCounts[tr.ai] ?? 0) + 1;
    })
  );
  const aiList = Object.entries(aiCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-8">
      <h1 className="mb-1 text-3xl font-bold">Overview</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A snapshot of everything in this project.
      </p>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          href={`${base}/tasks`}
          icon={<CheckSquare className="size-5" />}
          label="Tasks"
          value={total}
          accent="from-indigo-50 to-purple-50 text-indigo-600"
        />
        <StatCard
          href={`${base}/timeline`}
          icon={<CalendarClock className="size-5" />}
          label="Due soon"
          value={urgent.length}
          accent="from-red-50 to-orange-50 text-red-600"
        />
        <StatCard
          href={`${base}/documents`}
          icon={<FileText className="size-5" />}
          label="Documents"
          value={docs.length}
          accent="from-blue-50 to-cyan-50 text-blue-600"
        />
        <StatCard
          href={`${base}/members`}
          icon={<Users className="size-5" />}
          label="Members"
          value={members.length}
          accent="from-emerald-50 to-teal-50 text-emerald-600"
        />
      </div>

      {/* Progress + status breakdown */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Progress</h2>
          <span className="text-sm text-muted-foreground">
            {done} of {total} done
          </span>
        </div>
        <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <StatusLegend status="todo" count={todo} />
          <StatusLegend status="doing" count={doing} />
          <StatusLegend status="done" count={done} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            <h2 className="font-semibold">Needs attention</h2>
          </div>
          {urgent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing urgent. You&apos;re on top of things.
            </p>
          ) : (
            <div className="space-y-2">
              {urgent.map((t) => {
                const d = daysLeft(t.dueDate)!;
                return (
                  <Link
                    key={t.id}
                    href={`${base}/tasks`}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 hover:bg-red-50"
                  >
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    <Badge variant="outline" className="border-red-200 bg-white text-red-600">
                      {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : `${d}d`}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="size-5 text-blue-500" />
            <h2 className="font-semibold">Upcoming</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => (
                <Link
                  key={t.id}
                  href={`${base}/tasks`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50"
                >
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(t.dueDate)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Team */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-emerald-500" />
              <h2 className="font-semibold">Team</h2>
            </div>
            <Link
              href={`${base}/members`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border bg-muted/30 py-1 pl-1 pr-3"
                  title={`${m.name} · ${m.role}`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white ${m.color}`}
                  >
                    {initials(m.name)}
                  </span>
                  <span className="text-sm">{m.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI usage */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-purple-500" />
            <h2 className="font-semibold">AI usage</h2>
          </div>
          {aiList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI recorded in trails yet.</p>
          ) : (
            <div className="space-y-2">
              {aiList.map(([ai, count]) => (
                <div key={ai} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-purple-500" />
                    {ai}
                  </span>
                  <span className="text-muted-foreground">
                    {count} trail{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Small components ----------
function StatCard({
  href,
  icon,
  label,
  value,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  const [from, to, text] = accent.split(" ");
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className={`mb-3 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${from} ${to} ${text}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        {label}
        <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  );
}

function StatusLegend({ status, count }: { status: Status; count: number }) {
  const s = STATUS_STYLES[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${s.dot}`} />
      <span className="text-muted-foreground">
        {s.label}: <span className="font-medium text-foreground">{count}</span>
      </span>
    </div>
  );
}