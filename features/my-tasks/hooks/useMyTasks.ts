import { useState, useMemo, useTransition } from "react";
import { MOCK_TASKS } from "../utils/mockTasks";
import type { TaskRecord, TaskStatus } from "../types";

export function useMyTasks() {
  const [tasks, setTasks] = useState<TaskRecord[]>(MOCK_TASKS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "all">("all");
  const [isPending, startTransition] = useTransition();

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" ? true : task.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, selectedStatus]);

  const updateTaskStatus = (taskId: string, status: TaskStatus, progress: number, notes?: string) => {
    startTransition(() => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status, progress, notes: notes || task.notes }
            : task
        )
      );
    });
  };

  return {
    tasks,
    filteredTasks,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    updateTaskStatus,
    isPending,
  };
}
