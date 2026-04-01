"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { mediaAssets: number };
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProjects(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <CreateProjectDialog />
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              status={project.status}
              createdAt={project.createdAt}
              mediaCount={project._count.mediaAssets}
            />
          ))}
        </div>
      )}
    </div>
  );
}
