import { readDb, writeDb } from "@/lib/db";
import type { UserProfile } from "@/lib/types";

const DEFAULT_PROFILE: UserProfile = {
  username: "Steve_Study",
  level: 42,
  xp: 860,
  totalFocusedMinutes: 75,
  streak: 3,
};

// GET /api/profile
export async function GET() {
  const profile = readDb<UserProfile>("profile", DEFAULT_PROFILE);
  return Response.json({ profile });
}

// PATCH /api/profile  — update xp, level, totalFocusedMinutes, streak
export async function PATCH(request: Request) {
  const body = await request.json();
  const profile = readDb<UserProfile>("profile", DEFAULT_PROFILE);

  if (typeof body.xp === "number") profile.xp = body.xp;
  if (typeof body.level === "number") profile.level = body.level;
  if (typeof body.totalFocusedMinutes === "number") profile.totalFocusedMinutes = body.totalFocusedMinutes;
  if (typeof body.streak === "number") profile.streak = body.streak;
  if (typeof body.username === "string" && body.username.trim()) profile.username = body.username.trim();

  writeDb("profile", profile);
  return Response.json({ profile });
}
