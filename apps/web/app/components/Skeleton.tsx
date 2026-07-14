"use client";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface-high rounded-full animate-pulse ${className}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white/80 rounded-[2rem] p-8 animate-pulse ${className}`}>
      <SkeletonLine className="h-3 w-24 mb-3" />
      <SkeletonLine className="h-6 w-48 mb-6" />
      <div className="space-y-3">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-3/4" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="bg-white/80 rounded-[1.5rem] p-6 animate-pulse flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-high" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="h-3 w-24" />
      </div>
      <div className="hidden md:flex gap-6">
        <div className="space-y-1">
          <SkeletonLine className="h-5 w-12" />
          <SkeletonLine className="h-2 w-8" />
        </div>
        <div className="space-y-1">
          <SkeletonLine className="h-5 w-12" />
          <SkeletonLine className="h-2 w-8" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-12">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="h-12 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <SkeletonCard className="md:col-span-8" />
        <SkeletonCard className="md:col-span-4" />
        <SkeletonCard className="md:col-span-4" />
        <SkeletonCard className="md:col-span-4" />
        <SkeletonCard className="md:col-span-4" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-on-surface-variant text-sm font-bold tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}
