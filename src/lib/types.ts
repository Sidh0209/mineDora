/** Shared TypeScript types shared between API routes and the client. */

export type Task = {
  id: number;
  title: string;
  course: string;
  done: boolean;
  createdAt: string;
};

export type Session = {
  id: number;
  durationMinutes: number;
  completedAt: string;
  label: string; // e.g. "MATH 201"
};

export type UserProfile = {
  username: string;
  level: number;
  xp: number;
  totalFocusedMinutes: number;
  streak: number; // consecutive study days
};

export type SyncPayload = {
  tasks: Task[];
  sessions: Session[];
  profile: UserProfile;
  syncedAt: string;
};
