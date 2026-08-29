"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Task, UserProfile, Session } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView =
  | "timer"
  | "inventory"
  | "advancements"
  | "settings"
  | "stats"
  | "community"
  | "help";

type ActiveModal = "add-task" | "coming-soon" | "share-log" | null;

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "It always seems impossible until it's done.",
  "Don't watch the clock; do what it does. Keep going.",
  "The expert in anything was once a beginner.",
  "Small steps every day lead to great achievements.",
  "Focus on being productive instead of busy.",
  "You don't have to be great to start, but you have to start to be great.",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── View / Modal state ────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ActiveView>("timer");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [comingSoonMsg, setComingSoonMsg] = useState("");

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const taskInputRef = useRef<HTMLInputElement>(null);

  // ── Profile ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile>({
    username: "Steve_Study",
    level: 42,
    xp: 860,
    totalFocusedMinutes: 75,
    streak: 3,
  });

  // ── Session log ───────────────────────────────────────────────────────────
  const [sessionLog, setSessionLog] = useState<{
    totalMinutesToday: number;
    subjects: string[];
  }>({ totalMinutesToday: 0, subjects: [] });

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [sessionDuration, setSessionDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [sessionsGoal, setSessionsGoal] = useState(4);
  const [autoStart, setAutoStart] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(1);
  const sessionsCompleted = useRef(0);

  // ── Ambient ───────────────────────────────────────────────────────────────
  const [brightness, setBrightness] = useState(72);
  const [rain, setRain] = useState(0);
  const [pixelNoise, setPixelNoise] = useState(true);

  // ── Rain Audio (Web Audio API) ────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rainSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const rainRunning = useRef(false);

  // ── Music ─────────────────────────────────────────────────────────────────
  const [track, setTrack] = useState("Minecraft Volume Alpha · Subwoofer Lullaby");

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState("");

  // ── Quote (stable per session) ────────────────────────────────────────────
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)]
  );

  // ─── Utilities ────────────────────────────────────────────────────────────

  function announce(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openComingSoon(msg: string) {
    setComingSoonMsg(msg);
    setActiveModal("coming-soon");
  }

  // ─── Rain Audio ───────────────────────────────────────────────────────────

  function ensureRainCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext
      )();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function startRain() {
    const ctx = ensureRainCtx();
    // Stop any existing source
    try { rainSrcRef.current?.stop(); } catch { /* ignore */ }

    // White-noise buffer
    const size = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < size; i++) ch[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Low-pass filter for a rain-like texture
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 900;
    lpf.Q.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(lpf);
    lpf.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    rainSrcRef.current = src;
    rainGainRef.current = gain;
    rainRunning.current = true;
  }

  function stopRain() {
    try { rainSrcRef.current?.stop(); } catch { /* ignore */ }
    rainSrcRef.current = null;
    rainRunning.current = false;
  }

  // Sync rain gain whenever slider changes
  useEffect(() => {
    if (rain > 0) {
      if (!rainRunning.current) startRain();
      if (rainGainRef.current) {
        rainGainRef.current.gain.value = (rain / 100) * 0.45;
      }
    } else {
      if (rainRunning.current) {
        if (rainGainRef.current) rainGainRef.current.gain.value = 0;
        stopRain();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rain]);

  useEffect(() => {
    return () => {
      stopRain();
      audioCtxRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    try {
      const d = await apiFetch<{ tasks: Task[] }>("/api/tasks");
      setTasks(d.tasks);
    } catch (e) {
      announce(`Failed to load tasks: ${(e as Error).message}`);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const d = await apiFetch<{ profile: UserProfile }>("/api/profile");
      setProfile(d.profile);
    } catch { /* silent */ }
  }, []);

  const loadSessionLog = useCallback(async () => {
    try {
      const d = await apiFetch<{
        sessions: Session[];
        totalMinutesToday: number;
        subjects: string[];
      }>("/api/sessions");
      setSessionLog({ totalMinutesToday: d.totalMinutesToday, subjects: d.subjects });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadTasks();
    loadProfile();
    loadSessionLog();
  }, [loadTasks, loadProfile, loadSessionLog]);

  // Focus input when add-task modal opens
  useEffect(() => {
    if (activeModal === "add-task") {
      setTimeout(() => taskInputRef.current?.focus(), 60);
    }
  }, [activeModal]);

  // Sync sessionDuration → seconds whenever duration changes (and not running)
  useEffect(() => {
    if (!running) setSeconds(sessionDuration * 60);
  }, [sessionDuration, running]);

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setSeconds((v) => {
        if (v <= 1) {
          clearInterval(t);
          setRunning(false);
          sessionsCompleted.current += 1;
          setSessionNumber((n) => Math.min(n + 1, sessionsGoal));

          apiFetch("/api/sessions", {
            method: "POST",
            body: JSON.stringify({ durationMinutes: sessionDuration, label: "FOCUS" }),
          })
            .then((res) => {
              const r = res as { session: Session; profile: UserProfile };
              setProfile(r.profile);
              loadSessionLog();
              announce(`Session complete! +${sessionDuration * 10} XP earned`);
            })
            .catch(() => announce("Session complete! (XP sync failed)"));

          return sessionDuration * 60;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, sessionDuration, sessionsGoal, loadSessionLog]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs2 = String(seconds % 60).padStart(2, "0");

  // ─── Task actions ─────────────────────────────────────────────────────────

  async function toggleTask(id: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((old) => old.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    try {
      const d = await apiFetch<{ task: Task }>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: !task.done }),
      });
      setTasks((old) => old.map((t) => (t.id === id ? d.task : t)));
    } catch (e) {
      setTasks((old) => old.map((t) => (t.id === id ? task : t)));
      announce(`Error: ${(e as Error).message}`);
    }
  }

  async function submitAddTask() {
    if (!newTitle.trim()) return;
    try {
      const d = await apiFetch<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          course: newCourse.trim() || "UNTAGGED · Just added",
        }),
      });
      setTasks((old) => [...old, d.task]);
      setNewTitle("");
      setNewCourse("");
      setActiveModal(null);
      announce("New quest added to your task list");
    } catch (e) {
      announce(`Error: ${(e as Error).message}`);
    }
  }

  const done = tasks.filter((t) => t.done).length;

  // ─── Panel renderer ───────────────────────────────────────────────────────

  function renderPanel() {
    switch (activeView) {
      // ── INVENTORY ─────────────────────────────────────────────────────────
      case "inventory":
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="panel-icon">▦</span>
              <h2>INVENTORY</h2>
            </div>
            <p className="panel-sub">Your collected study items will appear here. Complete sessions to earn rewards.</p>
            <div className="inv-grid">
              {Array.from({ length: 27 }).map((_, i) => (
                <div key={i} className="inv-slot" title="Empty slot" />
              ))}
            </div>
            <p className="panel-empty-note">◈ No items yet — start a focus session to earn your first drop!</p>
          </div>
        );

      // ── ADVANCEMENTS ──────────────────────────────────────────────────────
      case "advancements":
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="panel-icon">✦</span>
              <h2>ADVANCEMENTS</h2>
            </div>
            <p className="panel-sub">Unlock milestones as you progress on your study journey.</p>
            <div className="adv-list">
              {[
                { icon: "◆", title: "First Steps", desc: "Complete your first 25-min focus session", locked: true },
                { icon: "⚡", title: "Speed Learner", desc: "Finish 4 sessions in a single day", locked: true },
                { icon: "🔥", title: "On Fire", desc: "Maintain a 7-day study streak", locked: true },
                { icon: "📚", title: "Knowledge Hoarder", desc: "Complete 10 tasks in a single day", locked: true },
                { icon: "💎", title: "Diamond Scholar", desc: "Reach Level 50", locked: true },
                { icon: "🌙", title: "Night Owl", desc: "Study past midnight", locked: true },
              ].map((adv) => (
                <div key={adv.title} className={`adv-item ${adv.locked ? "locked" : "unlocked"}`}>
                  <div className="adv-icon">{adv.icon}</div>
                  <div className="adv-body">
                    <b>{adv.title}</b>
                    <small>{adv.desc}</small>
                  </div>
                  <span className="adv-lock">{adv.locked ? "🔒" : "✦"}</span>
                </div>
              ))}
            </div>
            <p className="panel-empty-note">◈ Advancements unlock automatically as you play — keep grinding!</p>
          </div>
        );

      // ── SETTINGS ──────────────────────────────────────────────────────────
      case "settings":
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="panel-icon">⚙</span>
              <h2>SETTINGS</h2>
            </div>

            {/* Timer settings */}
            <div className="settings-block">
              <h3 className="settings-group-label">⏱  TIMER</h3>
              <div className="settings-row">
                <label>Focus Duration</label>
                <div className="opt-group">
                  {[15, 25, 45, 60].map((d) => (
                    <button key={d} className={`opt-btn ${sessionDuration === d ? "on" : ""}`}
                      onClick={() => { setSessionDuration(d); setRunning(false); }}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <label>Break Duration</label>
                <div className="opt-group">
                  {[5, 10, 15].map((d) => (
                    <button key={d} className={`opt-btn ${breakDuration === d ? "on" : ""}`}
                      onClick={() => setBreakDuration(d)}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <label>Sessions per Block</label>
                <div className="opt-group">
                  {[2, 4, 6, 8].map((n) => (
                    <button key={n} className={`opt-btn ${sessionsGoal === n ? "on" : ""}`}
                      onClick={() => setSessionsGoal(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <label>Auto-start next session</label>
                <button className={`toggle-btn ${autoStart ? "on" : ""}`}
                  onClick={() => setAutoStart(!autoStart)}>
                  {autoStart ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Display settings */}
            <div className="settings-block">
              <h3 className="settings-group-label">🎨  DISPLAY</h3>
              <div className="settings-row">
                <label>Pixel Noise Overlay</label>
                <button className={`toggle-btn ${pixelNoise ? "on" : ""}`}
                  onClick={() => setPixelNoise(!pixelNoise)}>
                  {pixelNoise ? "ON" : "OFF"}
                </button>
              </div>
              <div className="settings-row">
                <label>Brightness</label>
                <div className="slider-row">
                  <input type="range" min="25" max="100" value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))} className="cfg-slider" />
                  <span className="cfg-val">{brightness}%</span>
                </div>
              </div>
              <div className="settings-row">
                <label>Rain Volume</label>
                <div className="slider-row">
                  <input type="range" min="0" max="100" value={rain}
                    onChange={(e) => setRain(Number(e.target.value))} className="cfg-slider" />
                  <span className="cfg-val">{rain}%</span>
                </div>
              </div>
            </div>

            {/* Profile info */}
            <div className="settings-block">
              <h3 className="settings-group-label">👤  PROFILE</h3>
              <div className="settings-row"><label>Username</label><span className="cfg-val">{profile.username}</span></div>
              <div className="settings-row"><label>Level</label><span className="cfg-val">Lv. {profile.level}</span></div>
              <div className="settings-row"><label>Total XP</label><span className="cfg-val">{profile.xp} XP</span></div>
              <div className="settings-row"><label>Streak</label><span className="cfg-val">🔥 {profile.streak} days</span></div>
            </div>
          </div>
        );

      // ── STATS ─────────────────────────────────────────────────────────────
      case "stats":
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="panel-icon">📊</span>
              <h2>STATS</h2>
            </div>
            <div className="stats-grid">
              {[
                { icon: "⏱", val: profile.totalFocusedMinutes, label: "TOTAL MINUTES" },
                { icon: "⚡", val: profile.level, label: "LEVEL" },
                { icon: "✨", val: profile.xp, label: "TOTAL XP" },
                { icon: "🔥", val: profile.streak, label: "DAY STREAK" },
                { icon: "✓", val: done, label: "TASKS DONE TODAY" },
                { icon: "◷", val: sessionLog.totalMinutesToday, label: "MINED TODAY" },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.val}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="xp-section">
              <div className="xp-row">
                <span>Level {profile.level}</span>
                <span>{profile.xp % 1000} / 1000 XP</span>
              </div>
              <div className="xp-track">
                <div className="xp-fill" style={{ width: `${(profile.xp % 1000) / 10}%` }} />
              </div>
              <span className="xp-next">Level {profile.level + 1} →</span>
            </div>
          </div>
        );

      // ── COMMUNITY ─────────────────────────────────────────────────────────
      case "community":
        return (
          <div className="panel-content panel-centered">
            <div className="cs-big-icon">🌐</div>
            <h2 className="cs-title">COMMUNITY</h2>
            <p className="cs-desc">Study alongside adventurers worldwide. Compete on leaderboards, share achievements, and sync your world with fellow scholars.</p>
            <div className="cs-badge">COMING SOON</div>
          </div>
        );

      // ── HELP ─────────────────────────────────────────────────────────────
      case "help":
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="panel-icon">❓</span>
              <h2>HOW TO PLAY</h2>
            </div>
            <div className="help-list">
              {[
                { icon: "◷", title: "Focus Timer", text: "Press START FOCUS to begin a Pomodoro session. The timer counts down for 25 min (adjust in Settings). Completing a session earns XP." },
                { icon: "✓", title: "Tasks", text: 'Click + ADD TASK to write a task. You\'ll be asked for a title and optional course tag. Check tasks off as you complete them — they persist between sessions.' },
                { icon: "☀", title: "Brightness", text: "Drag the ☀ slider (left panel, center) to adjust the ambient room brightness." },
                { icon: "☂", title: "Rain Sounds", text: "Drag the ☂ slider up to activate calming rain noise generated in real-time. Slide back to zero to stop." },
                { icon: "⚡", title: "XP & Levels", text: "Earn 10 XP per focused minute. Every 1000 XP levels you up. Your progress saves automatically." },
                { icon: "🔥", title: "Streaks", text: "Study every day to grow your streak. Streaks will power community leaderboards in a future update." },
                { icon: "▦", title: "Inventory", text: "Item drops are coming soon. Finish sessions to eventually earn collectible study artifacts." },
                { icon: "✦", title: "Advancements", text: "Milestones unlock as you hit goals: first session, long streaks, late-night study etc." },
                { icon: "📋", title: "Share Log", text: 'Click "SHARE YOUR RESULT ↗" in the Session Log book to generate a shareable study card you can copy to clipboard.' },
              ].map((h) => (
                <div key={h.title} className="help-item">
                  <div className="help-icon">{h.icon}</div>
                  <div>
                    <b>{h.title}</b>
                    <p>{h.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen overflow-hidden bg-[#121312] text-stone-100">
      {/* Background */}
      <video className="ambient" autoPlay muted loop playsInline src="/focus-room.mp4" />
      <div className="vignette" style={{ opacity: 1 - brightness / 100 }} />
      {pixelNoise && <div className="pixel-noise" />}

      {/* ── Header ───────────────────────────────────────────────────────────*/}
      <header className="relative z-10 flex h-[88px] items-center justify-between border-b border-white/10 bg-[#14120f]/75 px-6 backdrop-blur-md lg:px-12">
        <div className="flex items-center gap-12">
          <div className="brand">
            <span className="brand-cube">◆</span> CRAFT<span>&amp;</span>FOCUS
          </div>
          <nav className="hidden items-center gap-9 text-xs font-bold tracking-[.16em] text-stone-300 md:flex">
            <button onClick={() => setActiveView("stats")} className={`nav-tab ${activeView === "stats" ? "active" : ""}`}>STATS</button>
            <button onClick={() => setActiveView("community")} className={`nav-tab ${activeView === "community" ? "active" : ""}`}>COMMUNITY</button>
            <button onClick={() => setActiveView("help")} className={`nav-tab ${activeView === "help" ? "active" : ""}`}>HELP</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound button → coming soon */}
          <button
            onClick={() => openComingSoon("Sound themes are coming soon! 🎵\nAmbient Minecraft music, lo-fi beats, and custom study playlists will be available in a future update.")}
            className="hud-icon"
            aria-label="Sound themes (coming soon)"
            title="Sound Themes — Coming Soon"
          >
            ♬
          </button>
          <span className="hidden items-center gap-2 text-xs text-emerald-200 sm:flex">
            <i className="cloud-dot" /> Cloud saved
          </span>
          {/* Sync World → coming soon */}
          <button
            onClick={() => openComingSoon("SYNC WORLD is a community feature! 🌐\nSync your progress with the global Craft&Focus community — leaderboards, world events, and co-op study rooms are on the way.")}
            className="sync-button"
          >
            SYNC WORLD <span>↗</span>
          </button>
        </div>
      </header>

      {/* ── Body grid ────────────────────────────────────────────────────────*/}
      <div
        className={`relative z-10 grid min-h-[calc(100vh-88px)] grid-cols-1 ${
          activeView === "timer"
            ? "lg:grid-cols-[220px_minmax(560px,1fr)_400px]"
            : "lg:grid-cols-[220px_1fr]"
        }`}
      >
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <aside className="order-2 flex flex-col border-t border-white/10 bg-[#171511]/85 p-5 backdrop-blur-md lg:order-none lg:border-r lg:border-t-0 lg:p-7">
          <div className="profile-hud">
            <div className="steve-head"><span>■</span><span>■</span></div>
            <div>
              <p className="text-sm font-bold">{profile.username}</p>
              <p className="mt-1 text-xs text-amber-200">
                LEVEL {profile.level} <span className="text-stone-500">· {profile.xp} XP</span>
              </p>
            </div>
          </div>

          <nav className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {(
              [
                ["◷", "TIMER"],
                ["▦", "INVENTORY"],
                ["✦", "ADVANCEMENTS"],
                ["⚙", "SETTINGS"],
              ] as [string, string][]
            ).map(([icon, label]) => {
              const key = label.toLowerCase() as ActiveView;
              return (
                <button
                  key={label}
                  onClick={() => setActiveView(key)}
                  className={`side-link ${activeView === key ? "active" : ""}`}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 flex items-center justify-between lg:mt-auto">
            <button onClick={() => setActiveModal("add-task")} className="add-orb" aria-label="Add task" title="Add new task">
              +
            </button>
            <button onClick={() => announce("You have been safely logged out")} className="logout">
              ⇥ LOGOUT
            </button>
          </div>
        </aside>

        {/* ── Centre: Timer or Panel ────────────────────────────────────────── */}
        {activeView === "timer" ? (
          <section className="relative flex min-w-0 flex-col items-center justify-center px-5 py-10 lg:px-10">

            {/* ── Ambient controls (left column, vertically centred) ─────────── */}
            <div className="ambient-dock hidden lg:flex">
              {/* Brightness */}
              <div className="ambient-card">
                <span className="amb-icon">☀</span>
                <div className="amb-slider-wrap">
                  <input
                    aria-label="Brightness"
                    type="range" min="25" max="100" value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                  />
                </div>
                <span className="amb-val">{brightness}%</span>
              </div>
              {/* Rain */}
              <div className="ambient-card">
                <span className="amb-icon">☂</span>
                <div className="amb-slider-wrap">
                  <input
                    aria-label="Rain"
                    type="range" min="0" max="100" value={rain}
                    onChange={(e) => setRain(Number(e.target.value))}
                  />
                </div>
                <span className="amb-val">{rain > 0 ? `${rain}%` : "Off"}</span>
              </div>
            </div>

            {/* Advancement badge */}
            <div className="advancement">
              <span>✦</span>
              <div><b>ADVANCEMENT MADE!</b><p>Home Sweet Home</p></div>
              <button onClick={() => setToast("")}>×</button>
            </div>

            {/* Timer panel */}
            <div className="timer-panel">
              <p className="focus-tag">FOCUS TIME</p>
              <div className="timer-digits">
                {mins}<span>:</span>{secs2}
              </div>
              <div className="stage-bars">
                {Array.from({ length: sessionsGoal }).map((_, i) => (
                  <i key={i} className={i < sessionsCompleted.current % (sessionsGoal || 4) ? "filled" : ""} />
                ))}
              </div>
              <p className="mt-3 text-xs uppercase tracking-[.24em] text-stone-400">
                Session {sessionNumber} of {sessionsGoal}
              </p>
              <div className="mt-7 flex gap-3">
                <button className="timer-button secondary" onClick={() => { setSeconds(sessionDuration * 60); setRunning(false); }}>
                  RESET
                </button>
                <button className="timer-button primary" onClick={() => setRunning(!running)}>
                  {running ? "PAUSE" : "START FOCUS"}
                </button>
              </div>
            </div>

            {/* Music player */}
            <div className="music-player">
              <button onClick={() => setTrack("Minecraft Volume Alpha · Sweden")}>⏮</button>
              <button className="play" onClick={() => announce("Music streaming coming soon!")}>▶</button>
              <button onClick={() => setTrack("Minecraft Volume Alpha · Wet Hands")}>⏭</button>
              <div className="music-info">
                <span>NOW PLAYING</span>
                <p>{track}</p>
              </div>
            </div>
          </section>
        ) : (
          /* ── Full-width panel view ─────────────────────────────────────── */
          <div className="panel-view">
            <button className="panel-back-btn" onClick={() => setActiveView("timer")}>
              ← BACK TO TIMER
            </button>
            {renderPanel()}
          </div>
        )}

        {/* ── Right sidebar (tasks + session log) — only in timer view ──────── */}
        {activeView === "timer" && (
          <aside className="space-y-6 border-t border-white/10 bg-[#171511]/85 p-6 backdrop-blur-md lg:border-l lg:border-t-0 lg:p-7">
            {/* Tasks widget */}
            <section className="widget">
              <div className="widget-title">
                <div>
                  <p>CURRENT TASKS</p>
                  <span>{done}/{tasks.length} Done</span>
                </div>
                <button onClick={() => setActiveModal("add-task")}>+ ADD TASK</button>
              </div>
              <div className="task-list">
                {tasksLoading ? (
                  <p className="py-4 text-center text-xs text-stone-500">Loading quests…</p>
                ) : tasks.length === 0 ? (
                  <p className="py-4 text-center text-xs text-stone-500">No tasks yet — tap + ADD TASK!</p>
                ) : (
                  tasks.map((task) => (
                    <label key={task.id} className={`task ${task.done ? "completed" : ""}`}>
                      <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                      <span className="checkmark">✓</span>
                      <span>
                        <b>{task.title}</b>
                        <small>{task.course}</small>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>

            {/* Session log */}
            <section className="book">
              <div className="book-ribbon">SESSION LOG · TODAY</div>
              <h2>Dear adventurer,</h2>
              <p>
                You mined through{" "}
                <b>
                  {sessionLog.totalMinutesToday > 0
                    ? `${sessionLog.totalMinutesToday} focused minutes`
                    : "no minutes yet — start the timer!"}
                </b>{" "}
                today.
                {sessionLog.subjects.length > 0
                  ? ` ${sessionLog.subjects.join(" & ")} ${sessionLog.subjects.length > 1 ? "are" : "is"} safely stored in your memory chest.`
                  : ""}
              </p>
              <div className="book-line" />
              <p className="quote">"{quote}"</p>
              <button onClick={() => setActiveModal("share-log")}>SHARE YOUR RESULT ↗</button>
            </section>
          </aside>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Add Task ─────────────────────────────────────────────────────────*/}
      {activeModal === "add-task" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr">
              <span className="modal-icon">◆</span>
              <h3>NEW QUEST</h3>
            </div>
            <p className="modal-desc">What do you need to study? Add a title and optional subject tag.</p>

            <div className="modal-field">
              <label className="field-label">TASK TITLE *</label>
              <input
                ref={taskInputRef}
                className="field-input"
                placeholder="e.g. Study Chapter 5 — Thermodynamics"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAddTask()}
                maxLength={100}
              />
            </div>
            <div className="modal-field">
              <label className="field-label">COURSE / TAG</label>
              <input
                className="field-input"
                placeholder="e.g. PHYSICS · Tomorrow"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAddTask()}
                maxLength={60}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => { setActiveModal(null); setNewTitle(""); setNewCourse(""); }}
              >
                CANCEL
              </button>
              <button
                className="modal-confirm"
                onClick={submitAddTask}
                disabled={!newTitle.trim()}
              >
                ADD QUEST ◆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Coming Soon ───────────────────────────────────────────────────────*/}
      {activeModal === "coming-soon" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box modal-cs" onClick={(e) => e.stopPropagation()}>
            <div className="cs-emoji">🚧</div>
            <div className="modal-hdr" style={{ justifyContent: "center" }}>
              <h3>COMING SOON</h3>
            </div>
            <p className="modal-desc" style={{ textAlign: "center", whiteSpace: "pre-line" }}>
              {comingSoonMsg}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="modal-confirm" onClick={() => setActiveModal(null)}>
                GOT IT ◆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Log ─────────────────────────────────────────────────────────*/}
      {activeModal === "share-log" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="share-wrapper">
            {/* Shareable card */}
            <div className="share-card">
              <div className="sc-brand">◆ CRAFT&amp;FOCUS</div>
              <div className="sc-mins">
                {sessionLog.totalMinutesToday}
                <span>min</span>
              </div>
              <div className="sc-label">FOCUSED TODAY</div>
              {sessionLog.subjects.length > 0 && (
                <div className="sc-tags">
                  {sessionLog.subjects.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              )}
              <div className="sc-divider" />
              <p className="sc-quote">"{quote}"</p>
              <div className="sc-footer">
                Level {profile.level} · {profile.xp} XP · 🔥 {profile.streak} day streak
              </div>
            </div>

            {/* Actions */}
            <button
              className="share-copy-btn"
              onClick={() => {
                const text = [
                  `◆ CRAFT&FOCUS — Study Log`,
                  `I mined ${sessionLog.totalMinutesToday} focused minutes today!`,
                  sessionLog.subjects.length > 0 ? `Subjects: ${sessionLog.subjects.join(", ")}` : "",
                  ``,
                  `"${quote}"`,
                  ``,
                  `Level ${profile.level} · ${profile.xp} XP · 🔥 ${profile.streak} day streak`,
                ]
                  .filter(Boolean)
                  .join("\n");
                navigator.clipboard
                  .writeText(text)
                  .then(() => { announce("Copied to clipboard! 📋"); setActiveModal(null); })
                  .catch(() => announce("Copy failed — try again"));
              }}
            >
              📋 COPY TO CLIPBOARD
            </button>
            <button className="share-close-btn" onClick={() => setActiveModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
