"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { ToastProvider, useToast } from "../components/Toast";
import { PageLoader } from "../components/Skeleton";
import { WaterIcon, ExerciseIcon, WeightIcon, NoteIcon } from "../components/Icons";

type EntryMode = "water" | "exercise" | "weight" | "log";

const MODES: { key: EntryMode; icon: React.ReactNode; label: string; color: string }[] = [
  { key: "water", icon: <WaterIcon className="w-6 h-6" />, label: "Water", color: "bg-primary-fixed" },
  { key: "exercise", icon: <ExerciseIcon className="w-6 h-6" />, label: "Exercise", color: "bg-secondary-fixed" },
  { key: "weight", icon: <WeightIcon className="w-6 h-6" />, label: "Weight", color: "bg-surface-highest" },
  { key: "log", icon: <NoteIcon className="w-6 h-6" />, label: "Note", color: "bg-primary-fixed" },
];

const WATER_PRESETS = [100, 200, 250, 330, 500, 750];
const ACTIVITY_PRESETS = ["Walking", "Running", "Cycling", "Swimming", "Yoga", "Strength"];

function AddContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<EntryMode>("water");
  const [submitting, setSubmitting] = useState(false);

  const [waterAmount, setWaterAmount] = useState("250");
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [logContent, setLogContent] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const client = createApiClient(window.location.origin, { credentials: "include" });
        const session = await client.getSession();
        if (!session) { router.replace("/"); return; }
        setUser(session.user);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      switch (mode) {
        case "water":
          await client.createWaterLog({ amountMl: Number(waterAmount) });
          toast(`${waterAmount}ml water logged`, "success");
          setWaterAmount("250");
          break;
        case "exercise":
          await client.createExerciseLog({
            activityType: activityType || "General",
            durationMinutes: Number(duration),
            estimatedCaloriesBurned: caloriesBurned ? Number(caloriesBurned) : undefined,
            notes: exerciseNotes || undefined,
          });
          toast(`${duration} min ${activityType || "exercise"} logged`, "success");
          setActivityType(""); setDuration(""); setCaloriesBurned(""); setExerciseNotes("");
          break;
        case "weight":
          await client.createWeightLog({ weightKg: Number(weightKg), notes: weightNotes || undefined });
          toast(`${weightKg}kg weight logged`, "success");
          setWeightKg(""); setWeightNotes("");
          break;
        case "log":
          await client.createLog(logContent);
          toast("Health note saved", "success");
          setLogContent("");
          break;
      }
    } catch {
      toast("Failed to save — please try again", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = (() => {
    switch (mode) {
      case "water": return Number(waterAmount) > 0;
      case "exercise": return Number(duration) > 0;
      case "weight": return Number(weightKg) > 0;
      case "log": return logContent.trim().length > 0;
    }
  })();

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-2xl mx-auto px-6 pt-8">
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2">Quick Add</p>
          <h2 className="text-5xl font-extrabold tracking-tight text-primary">Track &amp; Record.</h2>
        </section>

        {/* Mode Selector */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex flex-col items-center gap-2 p-5 rounded-[1.5rem] font-bold text-sm transition-all ${
                mode === m.key ? "bg-white/80 text-primary shadow-sm scale-[1.03]" : "bg-surface-low text-stone-400 hover:text-primary"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center text-primary`}>{m.icon}</div>
              <span className="text-xs font-bold tracking-wider uppercase">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Water */}
        {mode === "water" && (
          <div className="bg-white/80 rounded-[2rem] p-8 space-y-6">
            <div className="text-center">
              <p className="text-6xl font-extrabold text-primary">{waterAmount}<span className="text-2xl text-stone-400 ml-1">ml</span></p>
              <p className="text-xs text-stone-400 mt-2">Recommended: 2000ml daily</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-3 block">Quick Select</label>
              <div className="grid grid-cols-3 gap-2">
                {WATER_PRESETS.map((v) => (
                  <button key={v} onClick={() => setWaterAmount(String(v))} className={`py-3 rounded-full text-sm font-bold transition-all ${waterAmount === String(v) ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"}`}>{v}ml</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Custom Amount</label>
              <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" type="number" value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} placeholder="ml" />
            </div>
          </div>
        )}

        {/* Exercise */}
        {mode === "exercise" && (
          <div className="bg-white/80 rounded-[2rem] p-8 space-y-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-3 block">Activity Type</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {ACTIVITY_PRESETS.map((a) => (
                  <button key={a} onClick={() => setActivityType(a)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activityType === a ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"}`}>{a}</button>
                ))}
              </div>
              <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" value={activityType} onChange={(e) => setActivityType(e.target.value)} placeholder="Or type your own..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Duration</label>
                <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="minutes" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Calories Burned</label>
                <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" type="number" value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Notes</label>
              <textarea className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all resize-none" rows={2} value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} placeholder="How did it go?" />
            </div>
          </div>
        )}

        {/* Weight */}
        {mode === "weight" && (
          <div className="bg-white/80 rounded-[2rem] p-8 space-y-6">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <input className="text-6xl font-extrabold text-primary bg-transparent outline-none text-center w-40" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.0" />
                <span className="text-2xl text-stone-400">kg</span>
              </div>
              <p className="text-xs text-stone-400 mt-2">Log your current weight</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Notes</label>
              <textarea className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all resize-none" rows={2} value={weightNotes} onChange={(e) => setWeightNotes(e.target.value)} placeholder="Morning weigh-in, after workout, etc." />
            </div>
          </div>
        )}

        {/* Log */}
        {mode === "log" && (
          <div className="bg-white/80 rounded-[2rem] p-8 space-y-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 block">Health Note</label>
              <textarea className="w-full bg-surface-low rounded-[14px] px-4 py-4 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all resize-none leading-relaxed" rows={6} value={logContent} onChange={(e) => setLogContent(e.target.value)} placeholder="How are you feeling? What did you eat? Any symptoms or observations..." />
              <p className="text-xs text-stone-400 mt-2">This will be processed by AI to extract insights about your health patterns.</p>
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full mt-6 py-4 rounded-full bg-primary-gradient text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-40 hover:translate-y-[-1px] transition-all">
          {submitting ? "Saving..." : `Log ${MODES.find((m) => m.key === mode)?.label}`}
        </button>
      </main>

      <BottomNav active="add" />
    </div>
  );
}

export default function AddPage() {
  return (
    <ToastProvider>
      <AddContent />
    </ToastProvider>
  );
}
