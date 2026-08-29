import { readDb, writeDb } from "@/lib/db";
import type { SyncPayload, Task, Session, UserProfile } from "@/lib/types";

const DEFAULT_TASKS: Task[] = [];
const DEFAULT_SESSIONS: Session[] = [];
const DEFAULT_PROFILE: UserProfile = {
  username: "Steve_Study",
  level: 42,
  xp: 860,
  totalFocusedMinutes: 75,
  streak: 3,
};

// GET /api/sync  — returns a full snapshot of all data
export async function GET() {
  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  const sessions = readDb<Session[]>("sessions", DEFAULT_SESSIONS);
  const profile = readDb<UserProfile>("profile", DEFAULT_PROFILE);

  const payload: SyncPayload = {
    tasks,
    sessions,
    profile,
    syncedAt: new Date().toISOString(),
  };

  return Response.json(payload);
}

// POST /api/sync  — full client-to-server sync (overwrite all data)
export async function POST(request: Request) {
  const body = await request.json() as Partial<SyncPayload>;

  if (Array.isArray(body.tasks)) writeDb("tasks", body.tasks);
  if (Array.isArray(body.sessions)) writeDb("sessions", body.sessions);
  if (body.profile && typeof body.profile === "object") writeDb("profile", body.profile);

  const tasks = readDb<Task[]>("tasks", DEFAULT_TASKS);
  const sessions = readDb<Session[]>("sessions", DEFAULT_SESSIONS);
  const profile = readDb<UserProfile>("profile", DEFAULT_PROFILE);

  const result: SyncPayload = {
    tasks,
    sessions,
    profile,
    syncedAt: new Date().toISOString(),
  };

  return Response.json(result);
}
