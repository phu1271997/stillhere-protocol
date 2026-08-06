import React from 'react';

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', rounded = 'rounded-xl' }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 ${rounded} ${className}`}
    aria-hidden="true"
  />
);

export const CaseCardSkeleton: React.FC = () => (
  <div className="glass-card p-6 flex flex-col gap-4" aria-busy="true" aria-live="polite">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
  </div>
);

export const VerdictSkeleton: React.FC = () => (
  <div className="glass-panel p-8 flex flex-col gap-6" aria-busy="true" aria-live="polite">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10" rounded="rounded-2xl" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-12 w-16" />
    </div>
    <Skeleton className="h-24 w-full" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);
