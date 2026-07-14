"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type { FoodLog, MealType } from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { ToastProvider, useToast } from "../components/Toast";
import { SkeletonList } from "../components/Skeleton";
import { SunriseIcon, SunIcon, MoonIcon, AppleIcon, MealsIcon, CameraIcon, NoteIcon, ChevronDownIcon } from "../components/Icons";

function fmt(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function mealLabel(type?: MealType | null) {
  if (!type) return "Meal";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function MealIcon({ type, className = "w-6 h-6 text-primary" }: { type?: MealType | null; className?: string }) {
  switch (type) {
    case "breakfast": return <SunriseIcon className={className} />;
    case "lunch": return <SunIcon className={className} />;
    case "dinner": return <MoonIcon className={className} />;
    case "snack": return <AppleIcon className={className} />;
    default: return <MealsIcon className={className} />;
  }
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type ModalMode = "photo" | "manual" | null;
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const PER_PAGE = 10;

function MealsContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [filter, setFilter] = useState<MealType | "all">("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [revisions, setRevisions] = useState<Record<string, unknown>[] | null>(null);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "", mealType: "lunch" as MealType, notes: "",
    totalCalories: "", totalProtein: "", totalCarbs: "", totalFat: "",
  });
  const [manualForm, setManualForm] = useState({
    title: "", mealType: "lunch" as MealType, notes: "",
    totalCalories: "", totalProtein: "", totalCarbs: "", totalFat: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMealType, setPhotoMealType] = useState<MealType>("lunch");

  useEffect(() => { load(); }, []);

  // Poll for pending items
  useEffect(() => {
    const hasPending = foodLogs.some((l) => l.status === "pending");
    if (!hasPending) return;
    const interval = setInterval(async () => {
      try {
        const client = createApiClient(window.location.origin, { credentials: "include" });
        const res = await client.getFoodLogs();
        const updated = res.data ?? [];
        setFoodLogs(updated);
        if (!updated.some((l) => l.status === "pending")) {
          toast("Meal analysis complete", "success");
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [foodLogs]);

  async function load() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const session = await client.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);
      const res = await client.getFoodLogs();
      setFoodLogs(res.data ?? []);
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  async function loadRevisions(id: string) {
    setLoadingRevisions(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const res = await client.getFoodHistory(id);
      setRevisions(res.data ?? []);
    } catch {
      toast("Failed to load revision history", "error");
    } finally {
      setLoadingRevisions(false);
    }
  }

  async function handlePhotoUpload() {
    if (!photoFile) return;
    setSubmitting(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const formData = new FormData();
      formData.append("image", photoFile);
      formData.append("mealType", photoMealType);
      await client.uploadFoodPhoto(formData);
      toast("Meal photo uploaded — AI is analyzing", "success");
      setModalMode(null); setPhotoFile(null); setPhotoPreview(null);
      await load();
    } catch {
      toast("Failed to upload photo", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSubmit() {
    setSubmitting(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.createManualFoodLog({
        title: manualForm.title || undefined,
        mealType: manualForm.mealType,
        notes: manualForm.notes || undefined,
        totalCalories: manualForm.totalCalories ? Number(manualForm.totalCalories) : undefined,
        totalProtein: manualForm.totalProtein ? Number(manualForm.totalProtein) : undefined,
        totalCarbs: manualForm.totalCarbs ? Number(manualForm.totalCarbs) : undefined,
        totalFat: manualForm.totalFat ? Number(manualForm.totalFat) : undefined,
      });
      toast("Meal logged successfully", "success");
      setModalMode(null);
      setManualForm({ title: "", mealType: "lunch", notes: "", totalCalories: "", totalProtein: "", totalCarbs: "", totalFat: "" });
      await load();
    } catch {
      toast("Failed to log meal", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.deleteFoodLog(id);
      setFoodLogs((prev) => prev.filter((l) => l.id !== id));
      setExpandedId(null);
      toast("Meal deleted", "info");
    } catch {
      toast("Failed to delete meal", "error");
    }
  }

  async function handleEditSave(id: string) {
    setSubmitting(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      await client.updateFoodLog(id, {
        title: editForm.title || undefined,
        mealType: editForm.mealType,
        notes: editForm.notes || undefined,
        totalCalories: editForm.totalCalories ? Number(editForm.totalCalories) : undefined,
        totalProtein: editForm.totalProtein ? Number(editForm.totalProtein) : undefined,
        totalCarbs: editForm.totalCarbs ? Number(editForm.totalCarbs) : undefined,
        totalFat: editForm.totalFat ? Number(editForm.totalFat) : undefined,
      });
      toast("Meal updated", "success");
      setEditingId(null);
      await load();
    } catch {
      toast("Failed to update meal", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(log: FoodLog) {
    setEditingId(log.id);
    setRevisions(null);
    setEditForm({
      title: log.title ?? "", mealType: log.mealType ?? "lunch", notes: log.notes ?? "",
      totalCalories: log.totalCalories?.toString() ?? "", totalProtein: log.totalProtein?.toString() ?? "",
      totalCarbs: log.totalCarbs?.toString() ?? "", totalFat: log.totalFat?.toString() ?? "",
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setRevisions(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
      setRevisions(null);
      setEditingId(null);
    }
  }

  const filtered = filter === "all" ? foodLogs : foodLogs.filter((l) => l.mealType === filter);
  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = filtered.length > paginated.length;

  const grouped = paginated.reduce<Record<string, FoodLog[]>>((acc, log) => {
    const date = log.createdAt ? new Date(log.createdAt).toDateString() : "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const totalCals = filtered.reduce((sum, l) => sum + (l.totalCalories ?? 0), 0);
  const totalProtein = filtered.reduce((sum, l) => sum + (l.totalProtein ?? 0), 0);

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* Hero */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Your Food Journal</p>
              <h2 className="text-5xl font-extrabold tracking-tight text-primary">Nourish &amp; Thrive.</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalMode("photo")} className="px-6 py-3 rounded-full bg-primary-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all">
                <CameraIcon className="w-4 h-4" /> Photo Log
              </button>
              <button onClick={() => setModalMode("manual")} className="px-6 py-3 rounded-full bg-surface-highest text-primary font-bold text-sm hover:bg-surface-high transition-all">
                <NoteIcon className="w-4 h-4" /> Manual Entry
              </button>
            </div>
          </div>
        </section>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Total Meals</p>
            <p className="text-3xl font-extrabold text-primary">{filtered.length}</p>
          </div>
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Calories</p>
            <p className="text-3xl font-extrabold text-primary">{fmt(totalCals)}<span className="text-sm text-stone-400 ml-1">kcal</span></p>
          </div>
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Protein</p>
            <p className="text-3xl font-extrabold text-primary">{fmt(totalProtein)}<span className="text-sm text-stone-400 ml-1">g</span></p>
          </div>
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Photo Logs</p>
            <p className="text-3xl font-extrabold text-primary">{filtered.filter((l) => l.entryMode === "photo").length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(["all", ...MEAL_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setFilter(t); setPage(1); }}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
                filter === t ? "bg-surface-highest text-primary" : "text-stone-400 hover:text-primary"
              }`}
            >
              {t === "all" ? "All Meals" : mealLabel(t)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <SkeletonList rows={4} />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-surface-low rounded-[2rem] p-16 text-center">
            <div className="mb-4"><MealsIcon className="w-14 h-14 text-primary/30 mx-auto" /></div>
            <h3 className="text-xl font-bold text-primary mb-2">No meals yet</h3>
            <p className="text-stone-400 max-w-md mx-auto">
              Start logging your meals by taking a photo or adding a manual entry.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([dateStr, logs]) => (
              <section key={dateStr}>
                <h3 className="text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 ml-2">
                  {new Date(dateStr).toDateString() === new Date().toDateString() ? "Today" : formatDate(dateStr)}
                </h3>
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id}>
                      <div
                        className={`bg-white/80 rounded-[1.5rem] p-6 cursor-pointer hover:bg-white transition-all ${expandedId === log.id ? "ring-2 ring-primary/10" : ""}`}
                        onClick={() => handleExpand(log.id)}
                      >
                        <div className="flex items-start gap-4">
                          {log.imageUrl ? (
                            <div className="w-16 h-16 rounded-2xl bg-surface-high overflow-hidden flex-shrink-0">
                              <img src={createApiClient(window.location.origin).resolveAssetUrl(log.imageUrl) ?? ""} alt={log.title ?? "Meal"} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-surface-low flex items-center justify-center flex-shrink-0"><MealIcon type={log.mealType} className="w-7 h-7 text-primary/60" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-primary truncate">{log.title ?? mealLabel(log.mealType)}</h4>
                              {log.status === "pending" && <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-secondary text-[10px] font-bold uppercase tracking-wider">Processing</span>}
                              {log.status === "failed" && <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold uppercase tracking-wider">Failed</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-stone-400">
                              <span className="font-bold">{mealLabel(log.mealType)}</span>
                              <span>{timeAgo(log.createdAt)}</span>
                              {log.entryMode === "photo" && <span className="text-primary/50 flex items-center gap-1"><CameraIcon className="w-3 h-3" /> Photo</span>}
                            </div>
                          </div>
                          <div className="hidden md:flex items-center gap-6 text-right flex-shrink-0">
                            {([
                              { val: log.totalCalories, unit: "kcal", opacity: "" },
                              { val: log.totalProtein, unit: "protein", opacity: "/70" },
                              { val: log.totalCarbs, unit: "carbs", opacity: "/50" },
                              { val: log.totalFat, unit: "fat", opacity: "/40" },
                            ] as const).map((m) => (
                              <div key={m.unit}>
                                <p className={`text-lg font-${m.unit === "kcal" ? "extrabold" : "bold"} text-primary${m.opacity}`}>
                                  {fmt(m.val)}{m.unit !== "kcal" ? "g" : ""}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">{m.unit}</p>
                              </div>
                            ))}
                          </div>
                          <ChevronDownIcon className={`w-5 h-5 text-stone-300 transition-transform flex-shrink-0 ${expandedId === log.id ? "rotate-180" : ""}`} />
                        </div>
                        {/* Mobile macros */}
                        <div className="md:hidden flex gap-4 mt-4">
                          {([
                            { val: log.totalCalories, label: "kcal", suffix: "" },
                            { val: log.totalProtein, label: "protein", suffix: "g" },
                            { val: log.totalCarbs, label: "carbs", suffix: "g" },
                            { val: log.totalFat, label: "fat", suffix: "g" },
                          ] as const).map((m) => (
                            <div key={m.label} className="flex-1 bg-surface-low rounded-xl p-3 text-center">
                              <p className="text-sm font-bold text-primary">{fmt(m.val)}{m.suffix}</p>
                              <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expanded */}
                      {expandedId === log.id && (
                        <div className="bg-surface-low rounded-[1.5rem] p-6 mt-2 space-y-6">
                          {editingId === log.id ? (
                            /* Edit Mode */
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Title</label>
                                  <input className="w-full bg-white rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Meal title" />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Meal Type</label>
                                  <div className="flex gap-2">
                                    {MEAL_TYPES.map((t) => (
                                      <button key={t} onClick={() => setEditForm({ ...editForm, mealType: t })} className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${editForm.mealType === t ? "bg-primary text-white" : "bg-white text-stone-400"}`}>{mealLabel(t)}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {(["totalCalories", "totalProtein", "totalCarbs", "totalFat"] as const).map((field) => (
                                  <div key={field}>
                                    <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">{field.replace("total", "")}</label>
                                    <input className="w-full bg-white rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed" type="number" value={editForm[field]} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })} placeholder="0" />
                                  </div>
                                ))}
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Notes</label>
                                <textarea className="w-full bg-white rounded-[14px] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed resize-none" rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." />
                              </div>
                              <div className="flex gap-3 justify-end">
                                <button onClick={() => setEditingId(null)} className="px-5 py-2 rounded-full text-sm font-bold text-stone-400 hover:text-primary transition-colors">Cancel</button>
                                <button onClick={() => handleEditSave(log.id)} disabled={submitting} className="px-6 py-2 rounded-full bg-primary-gradient text-white text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50">{submitting ? "Saving..." : "Save Changes"}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Detected Foods */}
                              {log.detectedFoods && log.detectedFoods.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-3">Detected Foods</p>
                                  <div className="space-y-3">
                                    {log.detectedFoods.map((food, i) => (
                                      <div key={i} className="flex items-center justify-between bg-white rounded-2xl p-4">
                                        <div>
                                          <p className="font-bold text-sm text-primary">{food.name}</p>
                                          <p className="text-xs text-stone-400">{food.estimatedPortion}</p>
                                        </div>
                                        <div className="flex gap-4 text-right">
                                          <div><p className="text-sm font-bold text-primary">{fmt(food.calories)}</p><p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">kcal</p></div>
                                          <div><p className="text-sm font-bold text-primary/60">{fmt(food.protein)}g</p><p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">P</p></div>
                                          <div><p className="text-sm font-bold text-primary/40">{fmt(food.carbs)}g</p><p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">C</p></div>
                                          <div><p className="text-sm font-bold text-primary/30">{fmt(food.fat)}g</p><p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">F</p></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {log.notes && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2">Notes</p>
                                  <p className="text-sm text-on-surface-variant leading-relaxed">{log.notes}</p>
                                </div>
                              )}

                              {/* Revision History */}
                              <div>
                                {revisions === null ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); loadRevisions(log.id); }}
                                    className="text-xs font-bold text-primary/50 hover:text-primary transition-colors uppercase tracking-wider"
                                  >
                                    View Edit History
                                  </button>
                                ) : loadingRevisions ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs text-stone-400">Loading history...</span>
                                  </div>
                                ) : revisions.length === 0 ? (
                                  <p className="text-xs text-stone-400 italic">No revision history.</p>
                                ) : (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-3">Edit History</p>
                                    <div className="space-y-2">
                                      {revisions.map((rev, i) => (
                                        <div key={i} className="bg-white rounded-2xl p-4 flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-bold text-primary">
                                              {(rev.source as string) === "ai_initial" ? "AI Analysis" :
                                               (rev.source as string) === "manual_initial" ? "Manual Entry" :
                                               "User Edit"}
                                            </p>
                                            <p className="text-[10px] text-stone-400">
                                              {rev.createdAt ? timeAgo(rev.createdAt as string) : ""}
                                            </p>
                                          </div>
                                          <div className="flex gap-3 text-right text-xs">
                                            <span className="font-bold text-primary">{fmt(rev.totalCalories as number)} kcal</span>
                                            <span className="text-primary/60">{fmt(rev.totalProtein as number)}g P</span>
                                            <span className="text-primary/40">{fmt(rev.totalCarbs as number)}g C</span>
                                            <span className="text-primary/30">{fmt(rev.totalFat as number)}g F</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3 justify-end">
                                <button onClick={(e) => { e.stopPropagation(); startEdit(log); }} className="px-5 py-2 rounded-full bg-surface-highest text-primary text-sm font-bold hover:bg-surface-high transition-all">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }} className="px-5 py-2 rounded-full text-sm font-bold text-error/70 hover:text-error hover:bg-error-container/30 transition-all">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 rounded-full bg-surface-low text-primary text-sm font-bold hover:bg-surface-high transition-all"
              >
                Load More ({filtered.length - paginated.length} remaining)
              </button>
            )}
          </div>
        )}
      </main>

      {/* Photo Upload Modal */}
      {modalMode === "photo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => { setModalMode(null); setPhotoFile(null); setPhotoPreview(null); }} />
          <div className="relative bg-surface rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-2xl font-extrabold text-primary mb-1">Photo Log</h3>
            <p className="text-sm text-stone-400 mb-6">Snap a meal and let AI analyze the nutrition.</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {photoPreview ? (
              <div className="w-full h-52 rounded-2xl bg-surface-low overflow-hidden mb-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-52 rounded-2xl bg-surface-low flex flex-col items-center justify-center gap-3 mb-6 hover:bg-surface-high transition-colors">
                <CameraIcon className="w-10 h-10 text-stone-400" />
                <span className="text-sm font-bold text-stone-400">Tap to select a photo</span>
              </button>
            )}
            <div className="mb-6">
              <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 block">Meal Type</label>
              <div className="flex gap-2">
                {MEAL_TYPES.map((t) => (
                  <button key={t} onClick={() => setPhotoMealType(t)} className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${photoMealType === t ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"}`}>{mealLabel(t)}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModalMode(null); setPhotoFile(null); setPhotoPreview(null); }} className="flex-1 py-3 rounded-full text-sm font-bold text-stone-400 hover:text-primary transition-colors">Cancel</button>
              <button onClick={handlePhotoUpload} disabled={!photoFile || submitting} className="flex-1 py-3 rounded-full bg-primary-gradient text-white text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-40 hover:translate-y-[-1px] transition-all">{submitting ? "Uploading..." : "Analyze Meal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {modalMode === "manual" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => setModalMode(null)} />
          <div className="relative bg-surface rounded-[2rem] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-extrabold text-primary mb-1">Manual Entry</h3>
            <p className="text-sm text-stone-400 mb-6">Log a meal with nutrition details.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Title</label>
                <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} placeholder="e.g. Grilled Chicken Salad" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2 block">Meal Type</label>
                <div className="flex gap-2">
                  {MEAL_TYPES.map((t) => (
                    <button key={t} onClick={() => setManualForm({ ...manualForm, mealType: t })} className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${manualForm.mealType === t ? "bg-primary text-white" : "bg-surface-low text-stone-400 hover:text-primary"}`}>{mealLabel(t)}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(["totalCalories", "totalProtein", "totalCarbs", "totalFat"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">{field === "totalCalories" ? "Calories" : field.replace("total", "")}</label>
                    <input className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all" type="number" value={manualForm[field]} onChange={(e) => setManualForm({ ...manualForm, [field]: e.target.value })} placeholder={field === "totalCalories" ? "kcal" : "grams"} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 block">Notes</label>
                <textarea className="w-full bg-surface-low rounded-[14px] px-4 py-3 text-sm outline-none focus:bg-primary-fixed/30 focus:ring-2 focus:ring-primary-fixed/30 transition-all resize-none" rows={2} value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="How was the meal?" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalMode(null)} className="flex-1 py-3 rounded-full text-sm font-bold text-stone-400 hover:text-primary transition-colors">Cancel</button>
              <button onClick={handleManualSubmit} disabled={submitting} className="flex-1 py-3 rounded-full bg-primary-gradient text-white text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-40 hover:translate-y-[-1px] transition-all">{submitting ? "Saving..." : "Log Meal"}</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="meals" />
    </div>
  );
}

export default function MealsPage() {
  return (
    <ToastProvider>
      <MealsContent />
    </ToastProvider>
  );
}
