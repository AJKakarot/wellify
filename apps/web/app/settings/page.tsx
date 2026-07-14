"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type { NutritionGoals, GoalType, ActivityLevel, GoalRecommendation } from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { ToastProvider, useToast } from "../components/Toast";
import { LockIcon, MicIcon, DashboardIcon, ChevronRightIcon } from "../components/Icons";

const GOAL_TYPES: { key: GoalType; label: string }[] = [
  { key: "lose", label: "Lose Weight" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Gain Weight" },
];

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string }[] = [
  { key: "sedentary", label: "Sedentary" },
  { key: "light", label: "Light" },
  { key: "moderate", label: "Moderate" },
  { key: "active", label: "Active" },
  { key: "very_active", label: "Very Active" },
];

function SettingsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Goals
  const [dailyCalories, setDailyCalories] = useState("");
  const [dailyProtein, setDailyProtein] = useState("");
  const [dailyCarbs, setDailyCarbs] = useState("");
  const [dailyFat, setDailyFat] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  // AI Recommendations
  const [recommendation, setRecommendation] = useState<GoalRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // API Key (stored in localStorage)
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    load();
    setGeminiKey(localStorage.getItem("wellify_gemini_key") ?? "");
  }, []);

  async function load() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const session = await client.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const res = await client.getGoals();
      const goals = res.data;
      if (goals) {
        setDailyCalories(goals.dailyCalories?.toString() ?? "");
        setDailyProtein(goals.dailyProtein?.toString() ?? "");
        setDailyCarbs(goals.dailyCarbs?.toString() ?? "");
        setDailyFat(goals.dailyFat?.toString() ?? "");
        setGoalType(goals.goalType ?? "maintain");
        setActivityLevel(goals.activityLevel ?? "moderate");
      }
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGoals() {
    setSaving(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.updateGoals({
        dailyCalories: dailyCalories ? Number(dailyCalories) : null,
        dailyProtein: dailyProtein ? Number(dailyProtein) : null,
        dailyCarbs: dailyCarbs ? Number(dailyCarbs) : null,
        dailyFat: dailyFat ? Number(dailyFat) : null,
        goalType,
        activityLevel,
      });
      toast("Nutrition goals saved", "success");
    } catch {
      toast("Failed to save goals", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGetRecommendation() {
    setLoadingRec(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const res = await client.getGoalRecommendations(14);
      const rec = res.data?.recommendation;
      if (rec) {
        setRecommendation(rec);
        toast("AI recommendation ready", "success");
      } else {
        toast("Not enough data yet — log a few more days", "info");
      }
    } catch {
      toast("Failed to get recommendations", "error");
    } finally {
      setLoadingRec(false);
    }
  }

  function applyRecommendation() {
    if (!recommendation) return;
    if (recommendation.suggestedCalories) setDailyCalories(String(recommendation.suggestedCalories));
    if (recommendation.suggestedProtein) setDailyProtein(String(recommendation.suggestedProtein));
    if (recommendation.suggestedCarbs) setDailyCarbs(String(recommendation.suggestedCarbs));
    if (recommendation.suggestedFat) setDailyFat(String(recommendation.suggestedFat));
    setRecommendation(null);
    toast("Recommendation applied — save to confirm", "info");
  }

  function handleSaveApiKey() {
    localStorage.setItem("wellify_gemini_key", geminiKey);
    toast("Gemini API key saved locally", "success");
  }

  function handleClearApiKey() {
    localStorage.removeItem("wellify_gemini_key");
    setGeminiKey("");
    toast("API key cleared", "info");
  }

  async function handleSignOut() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.signOut();
    } catch { /* ignore */ }
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant text-sm font-bold tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-3xl mx-auto px-6 pt-8">
        {/* Hero */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-2">Preferences</p>
          <h2 className="text-5xl font-extrabold tracking-tight text-primary">
            Goals &amp; Settings.
          </h2>
        </section>

        {/* Profile Card */}
        <div className="bg-white/80 rounded-[2rem] p-8 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Profile</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-extrabold text-xl">
              {(user?.name?.[0] ?? "W").toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">{user?.name ?? "User"}</h3>
              <p className="text-sm text-stone-400">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nutrition Goals */}
        <div className="bg-white/80 rounded-[2rem] p-8 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Nutrition</p>
          <h3 className="text-xl font-bold text-primary mb-6">Daily Goals</h3>

          <div className="space-y-6">
            {/* Goal Type */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 block">Goal Type</label>
              <div className="flex gap-2">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGoalType(g.key)}
                    className={`flex-1 py-3 rounded-full text-xs font-bold transition-all ${
                      goalType === g.key ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 block">Activity Level</label>
              <div className="flex gap-2 flex-wrap">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setActivityLevel(a.key)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      activityLevel === a.key ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Daily Calories</label>
                <input
                  className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all"
                  type="number"
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(e.target.value)}
                  placeholder="e.g. 2200"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Protein (g)</label>
                <input
                  className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all"
                  type="number"
                  value={dailyProtein}
                  onChange={(e) => setDailyProtein(e.target.value)}
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Carbs (g)</label>
                <input
                  className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all"
                  type="number"
                  value={dailyCarbs}
                  onChange={(e) => setDailyCarbs(e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Fat (g)</label>
                <input
                  className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all"
                  type="number"
                  value={dailyFat}
                  onChange={(e) => setDailyFat(e.target.value)}
                  placeholder="e.g. 70"
                />
              </div>
            </div>

            {/* AI Recommendation */}
            {recommendation ? (
              <div className="bg-primary-fixed rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold">AI Suggestion</p>
                  <button onClick={() => setRecommendation(null)} className="text-xs text-stone-400 hover:text-primary">Dismiss</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{recommendation.suggestedCalories ?? "--"}</p>
                    <p className="text-[9px] uppercase tracking-widest text-primary/60 font-bold">kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{recommendation.suggestedProtein ?? "--"}g</p>
                    <p className="text-[9px] uppercase tracking-widest text-primary/60 font-bold">protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{recommendation.suggestedCarbs ?? "--"}g</p>
                    <p className="text-[9px] uppercase tracking-widest text-primary/60 font-bold">carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-primary">{recommendation.suggestedFat ?? "--"}g</p>
                    <p className="text-[9px] uppercase tracking-widest text-primary/60 font-bold">fat</p>
                  </div>
                </div>
                {recommendation.reasoning.length > 0 && (
                  <div className="space-y-1">
                    {recommendation.reasoning.map((r, i) => (
                      <p key={i} className="text-xs text-primary/70 leading-relaxed">• {r}</p>
                    ))}
                  </div>
                )}
                <button
                  onClick={applyRecommendation}
                  className="w-full py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:translate-y-[-1px] transition-all"
                >
                  Apply Suggestion
                </button>
              </div>
            ) : (
              <button
                onClick={handleGetRecommendation}
                disabled={loadingRec}
                className="w-full py-3 rounded-full bg-surface-low text-primary text-sm font-bold hover:bg-surface-high transition-all disabled:opacity-50"
              >
                {loadingRec ? "Analyzing your data..." : "Get AI Recommendation"}
              </button>
            )}

            <button
              onClick={handleSaveGoals}
              disabled={saving}
              className="w-full py-3.5 rounded-full bg-primary-gradient text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 hover:translate-y-[-1px] transition-all"
            >
              {saving ? "Saving..." : "Save Goals"}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white/80 rounded-[2rem] p-8 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">AI Configuration</p>
          <h3 className="text-xl font-bold text-primary mb-2">Gemini API Key</h3>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed">
            Optionally provide your own Gemini API key. It powers all AI features: chat, food photo analysis, voice transcription, and semantic embeddings. Stored locally in your browser only.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">
                Gemini API Key
                <span className="text-stone-400 normal-case tracking-normal font-normal ml-2">Chat, Vision, Embeddings &amp; Transcription</span>
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-low rounded-[14px] px-4 py-3 pr-12 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all font-mono"
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                />
                <button
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-primary transition-colors"
                >
                  {showGeminiKey ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-surface-low rounded-2xl p-4">
              <div className="flex gap-3">
                <LockIcon className="w-5 h-5 text-primary" />
                <div className="text-xs text-on-surface-variant leading-relaxed">
                  <p className="font-bold text-primary mb-1">How it works</p>
                  <p>Your key is stored in your browser&apos;s localStorage and sent as a header with API requests. It is never stored on our servers. If no key is provided, the server&apos;s default Gemini key is used.</p>
                  <p className="mt-2">Gemini 2.5 Flash powers <strong>AI chat</strong>, <strong>food photo analysis</strong> (vision), <strong>voice transcription</strong>, and <strong>semantic embeddings</strong> for personalized health insights.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-3 rounded-full bg-surface-highest text-primary font-bold text-sm hover:bg-surface-high transition-all"
              >
                Save Key
              </button>
              <button
                onClick={handleClearApiKey}
                className="px-5 py-3 rounded-full text-sm font-bold text-stone-400 hover:text-error hover:bg-error-container/20 transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="bg-white/80 rounded-[2rem] p-8 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Quick Links</p>
          <div className="space-y-1">
            <a href="/voice" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-surface-low transition-colors">
              <MicIcon className="w-5 h-5 text-primary/60" />
              <span className="font-bold text-sm text-primary">Voice Logs</span>
              <ChevronRightIcon className="w-4 h-4 text-stone-300 ml-auto" />
            </a>
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-surface-low transition-colors">
              <DashboardIcon className="w-5 h-5 text-primary/60" />
              <span className="font-bold text-sm text-primary">Dashboard</span>
              <ChevronRightIcon className="w-4 h-4 text-stone-300 ml-auto" />
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white/80 rounded-[2rem] p-8 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Account</p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold text-error/70 hover:text-error hover:bg-error-container/20 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </main>

      <BottomNav active="dashboard" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsContent />
    </ToastProvider>
  );
}
