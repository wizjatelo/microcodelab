import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus,
  FolderOpen,
  MoreVertical,
  Trash2,
  Clock,
  Cpu,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { HardwareIcon, getHardwareLabel, getLanguageLabel } from "@/components/hardware-icon";
import type { Project, HardwareType, ProgrammingLanguage } from "@shared/schema";
import { hardwareTypes, programmingLanguages } from "@shared/schema";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [, setLocation] = useLocation();
  const { setCurrentProject } = useAppStore();

  const handleOpen = () => {
    setCurrentProject(project.id);
    setLocation("/editor");
  };

  return (
    <Card className="group hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0" onClick={handleOpen}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`button-project-menu-${project.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
              data-testid={`button-delete-project-${project.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent onClick={handleOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <HardwareIcon hardware={project.hardware} className="h-3 w-3 mr-1" />
            {getHardwareLabel(project.hardware)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            {getLanguageLabel(project.language)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-28 mt-3" />
      </CardContent>
    </Card>
  );
}

function EmptyProjects({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <FolderOpen className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Create your first IoT project to start building with Arduino or MicroPython
      </p>
      <Button onClick={onCreateNew} data-testid="button-create-first-project">
        <Plus className="h-4 w-4 mr-2" />
        Create Project
      </Button>
    </div>
  );
}

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    hardware: "esp32" as HardwareType,
    language: "arduino" as ProgrammingLanguage,
  });
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newProject) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDialogOpen(false);
      setNewProject({
        name: "",
        description: "",
        hardware: "esp32",
        language: "arduino",
      });
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newProject);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your IoT development projects
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new IoT project with your preferred hardware and language.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="My IoT Project"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  data-testid="input-project-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="A brief description of your project..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  data-testid="input-project-description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Target Hardware</Label>
                <Select
                  value={newProject.hardware}
                  onValueChange={(value: HardwareType) => setNewProject({ ...newProject, hardware: value })}
                >
                  <SelectTrigger data-testid="select-hardware">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hardwareTypes.map((hw) => (
                      <SelectItem key={hw} value={hw}>
                        {getHardwareLabel(hw)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Programming Language</Label>
                <Select
                  value={newProject.language}
                  onValueChange={(value: ProgrammingLanguage) => setNewProject({ ...newProject, language: value })}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programmingLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageLabel(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-create-project"
              >
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <EmptyProjects onCreateNew={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => deleteMutation.mutate(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
