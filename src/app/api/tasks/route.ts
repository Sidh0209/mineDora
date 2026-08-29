import { readDb, writeDb } from "@/lib/db";
import type { Task } from "@/lib/types";

const DEFAULT_TASKS: Task[] = [
  { id: 1, title: "Study Mathematics: Calculus Ch. 4", course: "MATH 201 · Due today", done: true, createdAt: new Date().toISOString() },
  { id: 2, title: "Finish biology flashcards", course: "BIOLOGY · 20 min", done: true, createdAt: new Date().toISOString() },
  { id: 3, title: "Read research paper notes", course: "PHYSICS · Deep work", done: false, createdAt: new Date().toISOString() },
  { id: 4, title: "Draft history essay outline", course: "HISTORY · This week", done: false, createdAt: new Date().toISOString() },
  { id: 5, title: "Review project milestones", course: "DESIGN · Tomorrow", done: false, createdAt: new Date().toISOString() },
];

export async function GET() {
  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  return Response.json({ tasks });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, course } = body as { title?: string; course?: string };

  if (!title || typeof title !== "string" || title.trim() === "") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  const newTask: Task = {
    id: Date.now(),
    title: title.trim(),
    course: (course ?? "UNTAGGED · Just added").trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  writeDb("tasks", tasks);

  return Response.json({ task: newTask }, { status: 201 });
}
