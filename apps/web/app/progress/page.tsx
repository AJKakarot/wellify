"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type {
  NutritionProgress,
  NutritionProgressPoint,
  AdherenceSummary,
  WeeklyInsight,
  WeightLog,
} from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { SkeletonDashboard } from "../components/Skeleton";
import { MusclIcon, WaterIcon, FireIcon, ExerciseIcon, NoteIcon, WeightIcon, InsightIcon } from "../components/Icons";

function fmt(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function InsightTypeIcon({ type }: { type: WeeklyInsight["type"] }) {
  const cls = "w-5 h-5";
  switch (type) {
    case "protein": return <MusclIcon className={cls} />;
    case "hydration": return <WaterIcon className={cls} />;
    case "calories": return <FireIcon className={cls} />;
    case "exercise": return <ExerciseIcon className={cls} />;
    case "logging": return <NoteIcon className={cls} />;
    case "weight": return <WeightIcon className={cls} />;
    default: return <InsightIcon className={cls} />;
  }
}

function severityStyle(severity: WeeklyInsight["severity"]) {
  switch (severity) {
    case "positive": return "bg-primary-fixed text-primary";
    case "warning": return "bg-secondary-fixed text-secondary";
    default: return "bg-surface-highest text-on-surface-variant";
  }
}

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [progress, setProgress] = useState<NutritionProgress | null>(null);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [metric, setMetric] = useState<"calories" | "protein" | "carbs" | "fat">("calories");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const session = await client.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const [progRes, adhRes, insRes, wtRes] = await Promise.all([
        client.getNutritionProgress(30),
        client.getAdherence(7),
        client.getWeeklyInsights(),
        client.getWeightLogs(),
      ]);

      setProgress(progRes.data ?? null);
      setAdherence(adhRes.data ?? null);
      setInsights(insRes.data?.insights ?? []);
      setWeightLogs(wtRes.data ?? []);
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  const points = progress?.points ?? [];
  const maxVal = Math.max(...points.map((p) => p[metric] ?? 0), 1);
  const goalKey = `goal${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof NutritionProgressPoint;

  const adhItems = adherence ? [
    { label: "Calorie Goal", hit: adherence.calorieGoalDaysHit, total: adherence.days, icon: <FireIcon className="w-4 h-4" /> },
    { label: "Protein Goal", hit: adherence.proteinGoalDaysHit, total: adherence.days, icon: <MusclIcon className="w-4 h-4" /> },
    { label: "Hydration", hit: adherence.hydrationDaysHit, total: adherence.days, icon: <WaterIcon className="w-4 h-4" /> },
    { label: "Exercise", hit: adherence.exerciseDaysHit, total: adherence.days, icon: <ExerciseIcon className="w-4 h-4" /> },
    { label: "Logging", hit: adherence.loggingDaysHit, total: adherence.days, icon: <NoteIcon className="w-4 h-4" /> },
  ] : [];

  const recentWeights = weightLogs.slice(0, 14).reverse();
  const maxWeight = Math.max(...recentWeights.map((w) => w.weightKg), 1);
  const minWeight = Math.min(...recentWeights.map((w) => w.weightKg), 0);
  const weightRange = maxWeight - minWeight || 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
        <Header user={null} />
        <main className="max-w-7xl mx-auto px-6 pt-8"><SkeletonDashboard /></main>
        <BottomNav active="progress" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <section className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2">30-Day Overview</p>
          <h2 className="text-5xl font-extrabold tracking-tight text-primary">Patterns &amp; Progress.</h2>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Nutrition Trend */}
          <div className="md:col-span-8 bg-white/80 rounded-[2rem] p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Nutrition Trend</p>
                <h3 className="text-xl font-bold text-primary">Daily {metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
              </div>
              <div className="flex gap-2">
                {(["calories", "protein", "carbs", "fat"] as const).map((m) => (
                  <button key={m} onClick={() => setMetric(m)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${metric === m ? "bg-surface-highest text-primary" : "text-stone-400 hover:text-primary"}`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {points.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data yet. Start logging to see trends.</div>
            ) : (
              <div className="relative">
                {points[0]?.[goalKey] && (
                  <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${((points[0][goalKey] as number) / maxVal) * 100}%` }}>
                    <div className="flex-1 border-t-2 border-dashed border-primary/20" />
                    <span className="text-[10px] text-primary/40 font-bold ml-2">Goal</span>
                  </div>
                )}
                <div className="flex items-end gap-1 h-48">
                  {points.map((p, i) => {
                    const val = p[metric] ?? 0;
                    const height = (val / maxVal) * 100;
                    const isToday = i === points.length - 1;
                    return (
                      <div key={p.date} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute -top-10 bg-on-surface text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {shortDate(p.date)}: {fmt(val)}{metric === "calories" ? " kcal" : "g"}
                        </div>
                        <div className={`w-full rounded-t-lg transition-all ${isToday ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/50"}`} style={{ height: `${Math.max(height, 2)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-stone-400 font-bold">{points[0] ? shortDate(points[0].date) : ""}</span>
                  <span className="text-[10px] text-stone-400 font-bold">{points[points.length - 1] ? shortDate(points[points.length - 1].date) : ""}</span>
                </div>
              </div>
            )}

            {points.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-surface-low rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary">{fmt(points.reduce((s, p) => s + (p[metric] ?? 0), 0) / points.length)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Daily Avg</p>
                </div>
                <div className="bg-surface-low rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary">{fmt(Math.max(...points.map((p) => p[metric] ?? 0)))}</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Peak</p>
                </div>
                <div className="bg-surface-low rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary">{fmt(Math.min(...points.filter((p) => (p[metric] ?? 0) > 0).map((p) => p[metric] ?? 0)))}</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mt-1">Low</p>
                </div>
              </div>
            )}
          </div>

          {/* Adherence */}
          <div className="md:col-span-4 bg-primary-gradient rounded-[2rem] p-8 text-white">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">Weekly Adherence</p>
            <h3 className="text-2xl font-bold mb-6">Goal Consistency</h3>
            <div className="space-y-5">
              {adhItems.map((item) => {
                const pct = item.total > 0 ? Math.round((item.hit / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold flex items-center gap-2"><span>{item.icon}</span>{item.label}</span>
                      <span className="text-sm font-extrabold">{item.hit}/{item.total}</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {adherence?.summaryText && (
              <p className="text-white/70 text-sm mt-6 italic leading-relaxed">{adherence.summaryText}</p>
            )}
          </div>

          {/* Weight Trend */}
          <div className="md:col-span-6 bg-surface-low rounded-[2rem] p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Body Composition</p>
                <h3 className="text-xl font-bold text-primary">Weight Trend</h3>
              </div>
              {recentWeights.length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-primary">{recentWeights[recentWeights.length - 1]?.weightKg.toFixed(1)}<span className="text-sm text-stone-400 ml-1">kg</span></p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Latest</p>
                </div>
              )}
            </div>
            {recentWeights.length < 2 ? (
              <div className="h-32 flex items-center justify-center text-stone-400 text-sm">Log at least 2 weights to see your trend.</div>
            ) : (
              <div>
                <svg viewBox="0 0 400 120" className="w-full h-32" preserveAspectRatio="none">
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <line key={pct} x1="0" y1={pct * 110 + 5} x2="400" y2={pct * 110 + 5} stroke="#e4e2e1" strokeWidth="1" />
                  ))}
                  <polyline fill="none" stroke="#4d6359" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    points={recentWeights.map((w, i) => {
                      const x = (i / (recentWeights.length - 1)) * 390 + 5;
                      const y = 110 - ((w.weightKg - minWeight) / weightRange) * 100 + 5;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  <polygon fill="url(#weightGrad)" opacity="0.15"
                    points={[
                      ...recentWeights.map((w, i) => {
                        const x = (i / (recentWeights.length - 1)) * 390 + 5;
                        const y = 110 - ((w.weightKg - minWeight) / weightRange) * 100 + 5;
                        return `${x},${y}`;
                      }),
                      `395,115`, `5,115`,
                    ].join(" ")}
                  />
                  {recentWeights.map((w, i) => {
                    const x = (i / (recentWeights.length - 1)) * 390 + 5;
                    const y = 110 - ((w.weightKg - minWeight) / weightRange) * 100 + 5;
                    return <circle key={w.id} cx={x} cy={y} r="3" fill="#4d6359" />;
                  })}
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4d6359" />
                      <stop offset="100%" stopColor="#4d6359" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-stone-400 font-bold">{shortDate(recentWeights[0].loggedAt)}</span>
                  <span className="text-[10px] text-stone-400 font-bold">{shortDate(recentWeights[recentWeights.length - 1].loggedAt)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Insights */}
          <div className="md:col-span-6 bg-white/80 rounded-[2rem] p-8">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">AI Analysis</p>
            <h3 className="text-xl font-bold text-primary mb-6">Weekly Insights</h3>
            {insights.length === 0 ? (
              <div className="text-center py-8">
                <div className="mb-3"><InsightIcon className="w-8 h-8 text-primary/30 mx-auto" /></div>
                <p className="text-stone-400 text-sm">Keep logging for a few more days to unlock AI-powered insights about your health patterns.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${severityStyle(insight.severity)}`}><InsightTypeIcon type={insight.type} /></div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-primary">{insight.title}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav active="progress" />
    </div>
  );
}
