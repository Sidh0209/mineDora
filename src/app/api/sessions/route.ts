import { readDb, writeDb } from "@/lib/db";
import type { Session, UserProfile } from "@/lib/types";

const DEFAULT_SESSIONS: Session[] = [
  { id: 1, durationMinutes: 25, completedAt: new Date().toISOString(), label: "MATH 201" },
  { id: 2, durationMinutes: 25, completedAt: new Date().toISOString(), label: "BIOLOGY" },
  { id: 3, durationMinutes: 25, completedAt: new Date().toISOString(), label: "MATH 201" },
];

const DEFAULT_PROFILE: UserProfile = {
  username: "Steve_Study",
  level: 42,
  xp: 860,
  totalFocusedMinutes: 75,
  streak: 3,
};

// GET /api/sessions  — returns today's sessions + study log summary
export async function GET() {
  const sessions = readDb<Session[]>("sessions", DEFAULT_SESSIONS);
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(
    (s) => new Date(s.completedAt).toDateString() === today
  );

  const totalMinutesToday = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const subjects = [...new Set(todaySessions.map((s) => s.label))];

  return Response.json({ sessions: todaySessions, totalMinutesToday, subjects });
}

// POST /api/sessions  — log a completed Pomodoro session
export async function POST(request: Request) {
  const body = await request.json();
  const { durationMinutes, label } = body as {
    durationMinutes?: number;
    label?: string;
  };

  if (!durationMinutes || typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return Response.json({ error: "durationMinutes must be a positive number" }, { status: 400 });
  }

  const sessions = readDb<Session[]>("sessions", DEFAULT_SESSIONS);
  const newSession: Session = {
    id: Date.now(),
    durationMinutes,
    completedAt: new Date().toISOString(),
    label: (label ?? "GENERAL").trim(),
  };
  sessions.push(newSession);
  writeDb("sessions", sessions);

  // Award XP: 10 XP per focused minute
  const profile = readDb<UserProfile>("profile", DEFAULT_PROFILE);
  profile.xp += durationMinutes * 10;
  profile.totalFocusedMinutes += durationMinutes;

  // Level up every 1000 XP
  const newLevel = Math.floor(profile.xp / 1000) + 1;
  if (newLevel > profile.level) profile.level = newLevel;

  writeDb("profile", profile);

  return Response.json({ session: newSession, profile }, { status: 201 });
}
