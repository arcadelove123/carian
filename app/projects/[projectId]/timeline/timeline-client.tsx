// app/projects/[projectId]/timeline/timeline-client.tsx
// UI는 기존 그대로. 데이터는 localStorage가 아니라 props(tasks)로 받는다.

"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  User,
  AlertTriangle,
} from "lucide-react";

// ----- Types (match the Tasks page) -----
export type Status = "todo" | "doing" | "done";
export interface Task {
  id: string;
  name: string;
  startDate: string;
  type: string;
  assignee: string;
  attachment: string;
  dueDate: string;
  lastActivity: string;
  status: Status;
}

const STATUS_STYLES: Record<
  Status,
  { dot: string; chip: string; label: string }
> = {
  todo: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700 border-slate-200", label: "To do" },
  doing: { dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700 border-blue-200", label: "In progress" },
  done: { dot: "bg-green-500", chip: "bg-green-100 text-green-700 border-green-200", label: "Done" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ymd(d: Date) {
  // local YYYY-MM-DD key
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function sameYmd(a: Date, b: Date) {
  return ymd(a) === ymd(b);
}

export default function TimelineClient({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(new Date()); // which month is shown
  const [dayOpen, setDayOpen] = useState<string | null>(null); // ymd of opened day

  // Map of "YYYY-MM-DD" -> tasks due that day.
  const byDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = ymd(new Date(t.dueDate));
      (map[key] ||= []).push(t);
    });
    return map;
  }, [tasks]);

  // Build the 6-week grid for the shown month.
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      arr.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return arr;
  }, [cursor]);

  const today = new Date();
  const noDue = tasks.filter((t) => !t.dueDate);

  function prevMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }

  const openDayTasks = dayOpen ? byDay[dayOpen] ?? [] : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Tasks shown on their due date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-40 text-center text-lg font-semibold">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date())}
            className="ml-1"
          >
            Today
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <CalendarRange className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No tasks yet. Add tasks with a due date to see them here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const inMonth = date.getMonth() === cursor.getMonth();
              const isToday = sameYmd(date, today);
              const key = ymd(date);
              const dayTasks = byDay[key] ?? [];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={i}
                  className={`min-h-28 border-b border-r p-1.5 ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${inMonth ? "" : "bg-muted/20"} ${
                    isWeekend && inMonth ? "bg-slate-50/50" : ""
                  }`}
                >
                  {/* Date number */}
                  <div className="mb-1 flex justify-end">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-red-500 font-semibold text-white"
                          : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Task chips (up to 3, then +N) */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => {
                      const s = STATUS_STYLES[t.status];
                      const overdue =
                        t.status !== "done" && date < new Date(ymd(today));
                      return (
                        <button
                          key={t.id}
                          onClick={() => setDayOpen(key)}
                          className={`flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${s.chip} ${
                            overdue ? "ring-1 ring-red-300" : ""
                          }`}
                        >
                          <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <button
                        onClick={() => setDayOpen(key)}
                        className="w-full rounded px-1.5 text-left text-[11px] text-muted-foreground hover:underline"
                      >
                        +{dayTasks.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        {(Object.keys(STATUS_STYLES) as Status[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-full ${STATUS_STYLES[s].dot}`} />
            <span className="text-muted-foreground">{STATUS_STYLES[s].label}</span>
          </div>
        ))}
      </div>

      {/* No-due-date tasks */}
      {noDue.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            No due date ({noDue.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {noDue.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm shadow-sm"
              >
                <span className={`size-2 rounded-full ${STATUS_STYLES[t.status].dot}`} />
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dayOpen &&
                new Date(dayOpen).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {openDayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due this day.</p>
            ) : (
              openDayTasks.map((t) => {
                const s = STATUS_STYLES[t.status];
                const overdue =
                  t.status !== "done" &&
                  dayOpen !== null &&
                  new Date(dayOpen) < new Date(ymd(today));
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{t.name}</p>
                      <Badge variant="outline" className={s.chip}>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.type && <Badge variant="secondary">{t.type}</Badge>}
                      {t.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {t.assignee}
                        </span>
                      )}
                      {overdue && (
                        <span className="flex items-center gap-1 font-medium text-red-500">
                          <AlertTriangle className="size-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}