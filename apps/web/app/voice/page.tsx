"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@health-tracker/api-client";
import type { AuthUser } from "@health-tracker/api-client";
import type { VoiceLog } from "@health-tracker/types";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { ToastProvider, useToast } from "../components/Toast";
import { SkeletonList } from "../components/Skeleton";
import { MicIcon, ClockIcon, CheckIcon } from "../components/Icons";

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

function VoicePageContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    load();
  }, []);

  // Poll for pending transcriptions
  useEffect(() => {
    const hasPending = voiceLogs.some((v) => v.status === "pending");
    if (!hasPending) return;
    const interval = setInterval(async () => {
      try {
        const client = createApiClient(window.location.origin, { credentials: "include" });
        const res = await client.getVoiceLogs();
        const updated = res.data ?? [];
        setVoiceLogs(updated);
        if (!updated.some((v) => v.status === "pending")) {
          toast("Transcription complete", "success");
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [voiceLogs]);

  async function load() {
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const session = await client.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const res = await client.getVoiceLogs();
      setVoiceLogs(res.data ?? []);
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });
      const formData = new FormData();
      formData.append("audio", file);
      await client.uploadVoiceLog(formData);
      toast("Voice log uploaded — transcribing in background", "success");
      await load();
    } catch {
      toast("Failed to upload voice log", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const paginated = voiceLogs.slice(0, page * perPage);
  const hasMore = voiceLogs.length > paginated.length;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface pb-32">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-6 pt-8">
        {/* Hero */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary font-bold">Voice Journal</p>
              <h2 className="text-5xl font-extrabold tracking-tight text-primary">
                Speak &amp; Reflect.
              </h2>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-3 rounded-full bg-primary-gradient text-white font-bold text-sm shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all disabled:opacity-50"
              >
                {uploading ? "Uploading..." : <><MicIcon className="w-4 h-4 inline-block mr-1" /> Upload Audio</>}
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Total Logs</p>
            <p className="text-3xl font-extrabold text-primary">{voiceLogs.length}</p>
          </div>
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Transcribed</p>
            <p className="text-3xl font-extrabold text-primary">{voiceLogs.filter((v) => v.status === "completed").length}</p>
          </div>
          <div className="bg-white/80 rounded-[1.5rem] p-5">
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Processing</p>
            <p className="text-3xl font-extrabold text-primary">{voiceLogs.filter((v) => v.status === "pending").length}</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <SkeletonList rows={4} />
        ) : voiceLogs.length === 0 ? (
          <div className="bg-surface-low rounded-[2rem] p-16 text-center">
            <div className="mb-4"><MicIcon className="w-14 h-14 text-primary/30 mx-auto" /></div>
            <h3 className="text-xl font-bold text-primary mb-2">No voice logs yet</h3>
            <p className="text-stone-400 max-w-md mx-auto">
              Upload an audio recording and AI will transcribe it into a health log entry. Great for on-the-go tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginated.map((log) => (
              <div key={log.id}>
                <div
                  className={`bg-white/80 rounded-[1.5rem] p-6 cursor-pointer hover:bg-white transition-all ${
                    expandedId === log.id ? "ring-2 ring-primary/10" : ""
                  }`}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-xl flex-shrink-0">
                      {log.status === "pending" ? <ClockIcon className="w-6 h-6 text-secondary" /> : log.status === "failed" ? <CheckIcon className="w-6 h-6 text-error" /> : <MicIcon className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-primary text-sm">Voice Log</h4>
                        {log.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-secondary text-[10px] font-bold uppercase tracking-wider">
                            Transcribing
                          </span>
                        )}
                        {log.status === "failed" && (
                          <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold uppercase tracking-wider">
                            Failed
                          </span>
                        )}
                        {log.status === "completed" && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[10px] font-bold uppercase tracking-wider">
                            Transcribed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">{timeAgo(log.createdAt)}</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-stone-300 transition-transform flex-shrink-0 ${expandedId === log.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedId === log.id && (
                  <div className="bg-surface-low rounded-[1.5rem] p-6 mt-2">
                    {log.transcript ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-2">Transcript</p>
                        <p className="text-sm text-on-surface leading-relaxed">{log.transcript}</p>
                        {log.createdLogEntryId && (
                          <p className="text-xs text-primary/50 mt-3 italic">
                            Linked to health log for AI processing
                          </p>
                        )}
                      </div>
                    ) : log.status === "pending" ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-stone-400">Transcription in progress...</p>
                      </div>
                    ) : (
                      <p className="text-sm text-stone-400 italic">Transcription not available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 rounded-full bg-surface-low text-primary text-sm font-bold hover:bg-surface-high transition-all"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </main>

      <BottomNav active="dashboard" />
    </div>
  );
}

export default function VoicePage() {
  return (
    <ToastProvider>
      <VoicePageContent />
    </ToastProvider>
  );
}
