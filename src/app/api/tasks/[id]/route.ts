import { readDb, writeDb } from "@/lib/db";
import type { Task } from "@/lib/types";

const DEFAULT_TASKS: Task[] = [
  { id: 1, title: "Study Mathematics: Calculus Ch. 4", course: "MATH 201 · Due today", done: true, createdAt: new Date().toISOString() },
  { id: 2, title: "Finish biology flashcards", course: "BIOLOGY · 20 min", done: true, createdAt: new Date().toISOString() },
  { id: 3, title: "Read research paper notes", course: "PHYSICS · Deep work", done: false, createdAt: new Date().toISOString() },
  { id: 4, title: "Draft history essay outline", course: "HISTORY · This week", done: false, createdAt: new Date().toISOString() },
  { id: 5, title: "Review project milestones", course: "DESIGN · Tomorrow", done: false, createdAt: new Date().toISOString() },
];

// PATCH /api/tasks/[id]  — toggle done or rename a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  const idx = tasks.findIndex((t) => t.id === taskId);

  if (idx === -1) {
    return Response.json({ error: "task not found" }, { status: 404 });
  }

  // Allow toggling done, updating title or course
  if (typeof body.done === "boolean") tasks[idx].done = body.done;
  if (typeof body.title === "string" && body.title.trim()) tasks[idx].title = body.title.trim();
  if (typeof body.course === "string" && body.course.trim()) tasks[idx].course = body.course.trim();

  writeDb("tasks", tasks);
  return Response.json({ task: tasks[idx] });
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  if (isNaN(taskId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  const filtered = tasks.filter((t) => t.id !== taskId);

  if (filtered.length === tasks.length) {
    return Response.json({ error: "task not found" }, { status: 404 });
  }

  writeDb("tasks", filtered);
  return Response.json({ ok: true });
}
