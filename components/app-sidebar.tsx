"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  GanttChart,
  CheckSquare,
  FileText,
  Settings,
  Users,
  ChevronsUpDown,
  CircleUser,
  Check,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Project {
  id: string;
  title: string;
  desc: string;
}

// The six menu items shown in the middle of the sidebar
const menuItems = [
  { title: "Overview", path: "overview", icon: LayoutDashboard },
  { title: "Timeline", path: "timeline", icon: GanttChart },
  { title: "Tasks", path: "tasks", icon: CheckSquare },
  { title: "Documents", path: "documents", icon: FileText },
  { title: "Settings", path: "setting", icon: Settings },
  { title: "Members", path: "members", icon: Users },
];

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Load all projects so the user can switch between them
  useEffect(() => {
    const saved = localStorage.getItem("my-projects");
    try {
      setProjects(saved ? JSON.parse(saved) : []);
    } catch {
      setProjects([]);
    }
  }, []);

  const currentProject = projects.find((p) => p.id === projectId);
  const canDelete = confirmText.trim() === "I understand";

  // When a project is picked, keep the same sub-page (overview, tasks, ...)
  function switchProject(newId: string) {
    const subPage = pathname.split("/")[3] ?? "overview";
    router.push(`/projects/${newId}/${subPage}`);
  }

  // Remove the current project (and its data) from localStorage, then leave.
  function deleteProject() {
    const saved = localStorage.getItem("my-projects");
    const list: Project[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem(
      "my-projects",
      JSON.stringify(list.filter((p) => p.id !== projectId))
    );
    localStorage.removeItem(`tasks-${projectId}`);
    localStorage.removeItem(`docs-${projectId}`);
    localStorage.removeItem(`doc-folders-${projectId}`);
    localStorage.removeItem(`members-${projectId}`);
    router.push("/projects");
  }

  return (
    <Sidebar>
      {/* Header: project switcher dropdown */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="justify-between">
                  <span className="font-semibold text-lg truncate">
                    {currentProject?.title ?? "Select a project"}
                  </span>
                  <ChevronsUpDown className="!size-5 shrink-0 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[--radix-popper-anchor-width] min-w-56"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Projects
                </DropdownMenuLabel>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => switchProject(p.id)}
                    className="gap-2"
                  >
                    <span className="truncate">{p.title}</span>
                    {p.id === projectId && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2">
                  <Link href="/projects/new">
                    <Plus className="size-4" />
                    New project
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content: the six navigation items */}
      <SidebarContent>
        <SidebarGroup className="py-4">
          <SidebarMenu className="gap-2">
            {menuItems.map((item) => {
              const href = `/projects/${projectId}/${item.path}`;
              const isActive = pathname === href;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive} size="lg">
                    <Link href={href}>
                      <item.icon className="!size-6" />
                      <span className="text-base">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: back, delete, account */}
      <SidebarFooter>
        <SidebarMenu>
          {/* Back to all projects */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="gap-2">
              <Link href="/projects">
                <ArrowLeft className="!size-5" />
                <span className="text-base">Back to projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Delete project (opens typed-confirm dialog) */}
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                setConfirmText("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="!size-5" />
              <span className="text-base">Delete project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User account */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>
                      <CircleUser className="!size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-base">My Account</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Delete confirmation with typed phrase */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete this project?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This permanently deletes
              {currentProject?.title ? ` "${currentProject.title}"` : " this project"}{" "}
              and all its tasks, documents, and members. This can&apos;t be undone.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">
                Type{" "}
                <span className="font-semibold text-foreground">
                  I understand
                </span>{" "}
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
              <Button
                variant="destructive"
                disabled={!canDelete}
                onClick={deleteProject}
              >
                Delete project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}