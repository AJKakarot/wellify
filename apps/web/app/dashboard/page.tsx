"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type {
  AdherenceSummary,
  DashboardData,
  ExerciseLog,
  NutritionGoals,
  WeeklyInsight,
  WeightLog,
  NutritionPeriod,
} from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { SkeletonDashboard } from "../components/Skeleton";
import { WaterIcon, ExerciseIcon, MusclIcon } from "../components/Icons";

function fmt(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function pct(current?: number | null, goal?: number | null): number {
  if (!current || !goal || goal === 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
}

function ringOffset(progress: number, circumference: number) {
  return circumference * (1 - Math.min(progress, 1));
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [period, setPeriod] = useState<NutritionPeriod>("day");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);

  useEffect(() => {
    load();
  }, [period]);

  async function load() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });

      const session = await client.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      setUser(session.user);

      const [dashRes, adhRes, exRes, wtRes, insRes, goalsRes] = await Promise.all([
        client.getDashboard(period),
        client.getAdherence(7),
        client.getExerciseLogs(),
        client.getWeightLogs(),
        client.getWeeklyInsights(),
        client.getGoals(),
      ]);

      setDashboard(dashRes.data ?? null);
      setAdherence(adhRes.data ?? null);
      setExerciseLogs(exRes.data ?? []);
      setWeightLogs(wtRes.data ?? []);
      setInsights(insRes.data?.insights ?? []);
      setGoals(goalsRes.data ?? null);
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
        <Header user={null} />
        <main className="max-w-7xl mx-auto px-6 pt-8">
          <SkeletonDashboard />
        </main>
        <BottomNav active="dashboard" />
      </div>
    );
  }

  const cals = dashboard?.totals?.calories ?? 0;
  const calGoal = dashboard?.goals?.calories ?? goals?.dailyCalories ?? 2200;
  const protein = dashboard?.totals?.protein ?? 0;
  const proteinGoal = dashboard?.goals?.protein ?? goals?.dailyProtein ?? 150;
  const carbs = dashboard?.totals?.carbs ?? 0;
  const carbsGoal = dashboard?.goals?.carbs ?? goals?.dailyCarbs ?? 250;
  const fat = dashboard?.totals?.fat ?? 0;
  const fatGoal = dashboard?.goals?.fat ?? goals?.dailyFat ?? 70;
  const water = dashboard?.totals?.waterMl ?? 0;
  const waterGoal = 2000;
  const exerciseMin = dashboard?.totals?.exerciseMinutes ?? 0;
  const latestWeight = dashboard?.latestWeightKg ?? weightLogs[0]?.weightKg ?? null;
  const latestExercise = exerciseLogs[0];
  const latestInsight = insights[0];

  const calCirc = 2 * Math.PI * 100;
  const waterCirc = 2 * Math.PI * 78;

  const adhScore = adherence
    ? Math.round(
        ((adherence.calorieGoalDaysHit + adherence.proteinGoalDaysHit + adherence.hydrationDaysHit + adherence.exerciseDaysHit) /
          (adherence.days * 4)) *
          100,
      )
    : 0;

  const prevWeight = weightLogs[1]?.weightKg;
  const weightDiff = latestWeight && prevWeight ? latestWeight - prevWeight : null;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* Hero */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">
                {period === "day" ? "Today's Narrative" : "Weekly Overview"}
              </p>
              <h2 className="text-5xl font-extrabold tracking-tight text-primary">
                Restore &amp; Flourish.
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${period === "day" ? "bg-surface-highest text-primary" : "text-stone-400 hover:text-primary"}`}
                onClick={() => setPeriod("day")}
              >
                Today
              </button>
              <button
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${period === "week" ? "bg-surface-highest text-primary" : "text-stone-400 hover:text-primary"}`}
                onClick={() => setPeriod("week")}
              >
                Week
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Nutrition Card */}
          <div className="md:col-span-8 bg-white/80 rounded-[2rem] p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-56 h-56 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
                {/* Calorie track */}
                <circle cx="112" cy="112" r="100" fill="transparent" stroke="#eae8e7" strokeWidth="16" />
                {/* Calorie progress */}
                <circle
                  cx="112" cy="112" r="100" fill="transparent"
                  stroke="#4d6359" strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={calCirc}
                  strokeDashoffset={ringOffset(cals! / calGoal!, calCirc)}
                />
                {/* Water track */}
                <circle cx="112" cy="112" r="78" fill="transparent" stroke="#eae8e7" strokeWidth="16" />
                {/* Water progress */}
                <circle
                  cx="112" cy="112" r="78" fill="transparent"
                  stroke="#8ca398" strokeWidth="16" strokeLinecap="round"
                  strokeDasharray={waterCirc}
                  strokeDashoffset={ringOffset(water! / waterGoal, waterCirc)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Calories</span>
                <span className="text-4xl font-extrabold text-primary">{fmt(cals)}</span>
                <span className="text-[10px] text-stone-400">/ {fmt(calGoal)} kcal</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6 w-full">
              {([
                { label: "Protein", value: protein, goal: proteinGoal, unit: "g", opacity: "", usePrimContainer: false },
                { label: "Carbs", value: carbs, goal: carbsGoal, unit: "g", opacity: "opacity-60", usePrimContainer: false },
                { label: "Fat", value: fat, goal: fatGoal, unit: "g", opacity: "opacity-40", usePrimContainer: false },
                { label: "Hydration", value: water, goal: waterGoal, unit: "ml", opacity: "", usePrimContainer: true },
              ]).map((m) => (
                <div key={m.label}>
                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">{m.label}</p>
                  <p className="text-2xl font-bold text-primary">
                    {fmt(m.value)}{m.unit}
                  </p>
                  <div className="w-full h-1.5 bg-surface-highest rounded-full mt-2">
                    <div
                      className={`h-full rounded-full ${m.usePrimContainer ? "bg-primary-container" : `bg-primary-gradient ${m.opacity}`}`}
                      style={{ width: `${pct(m.value, m.goal)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence Card */}
          <div className="md:col-span-4 bg-primary-gradient rounded-[2rem] p-8 text-white flex flex-col justify-between">
            <div>
              <svg className="w-9 h-9 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold leading-tight">
                {adhScore >= 80 ? "Elite Adherence" : adhScore >= 50 ? "Good Progress" : "Building Momentum"}
              </h3>
              <p className="text-white/80 mt-2 text-sm">
                {adherence?.summaryText ?? "Keep logging to see your adherence score."}
              </p>
            </div>
            <div className="mt-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-extrabold">{adhScore}%</span>
                <span className="text-xs tracking-widest uppercase opacity-70">Weekly Score</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${adhScore}%` }} />
              </div>
            </div>
          </div>

          {/* Exercise Module */}
          <div className="md:col-span-4 bg-surface-low rounded-[2rem] p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Movement</p>
                <h4 className="text-xl font-bold text-primary">Daily Exercise</h4>
              </div>
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="mt-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-primary">{fmt(exerciseMin)}</span>
              <span className="text-stone-500 font-bold">min</span>
            </div>
            <p className="text-stone-400 text-xs mt-2 italic">
              {latestExercise ? `${latestExercise.activityType} • ${latestExercise.durationMinutes} min` : "No activity logged today"}
            </p>
          </div>

          {/* Weight Tracking */}
          <div className="md:col-span-4 bg-surface-low rounded-[2rem] p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Body Composition</p>
                <h4 className="text-xl font-bold text-primary">Current Weight</h4>
              </div>
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-extrabold text-primary">{latestWeight ? latestWeight.toFixed(1) : "--"}</span>
                <span className="text-stone-500 font-bold ml-1">kg</span>
                {weightDiff !== null && (
                  <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${weightDiff <= 0 ? "text-primary-container" : "text-secondary"}`}>
                    {weightDiff <= 0 ? "↓" : "↑"} {Math.abs(weightDiff).toFixed(1)}kg from last
                  </div>
                )}
              </div>
              <div className="flex items-end gap-1 h-12">
                {weightLogs.slice(0, 5).reverse().map((w, i) => (
                  <div
                    key={w.id}
                    className={`w-1.5 rounded-full ${i === weightLogs.slice(0, 5).length - 1 ? "bg-primary-container" : "bg-surface-highest"}`}
                    style={{ height: `${Math.max(16, Math.min(48, ((w.weightKg - 50) / 60) * 48))}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="md:col-span-4 bg-secondary-container rounded-[2rem] p-8 flex flex-col">
            <p className="text-[10px] uppercase tracking-widest text-on-secondary-container font-bold mb-4">AI Insight</p>
            <p className="text-lg font-medium text-on-secondary-container leading-relaxed italic flex-1">
              {latestInsight
                ? `"${latestInsight.message}"`
                : "\"Log a few more days and I'll share personalized insights about your patterns.\""}
            </p>
          </div>
        </div>

        {/* Goals Section */}
        <section className="mt-16 mb-8">
          <h3 className="text-2xl font-bold text-primary mb-8 ml-2">Active Objectives</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              { icon: <WaterIcon className="w-6 h-6 text-primary" />, label: "Hydration", score: pct(water, waterGoal) },
              { icon: <ExerciseIcon className="w-6 h-6 text-primary" />, label: "Energy Balance", score: pct(cals, calGoal) },
              { icon: <MusclIcon className="w-6 h-6 text-primary" />, label: "Protein Target", score: pct(protein, proteinGoal) },
            ]).map((g) => (
              <div key={g.label} className="bg-surface-low p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  {g.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-primary">{g.label}</span>
                    <span className="text-xs text-stone-500 font-bold">{g.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white rounded-full">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${g.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="dashboard" />
    </div>
  );
}
