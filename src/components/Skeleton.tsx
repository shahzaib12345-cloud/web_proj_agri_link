import { useI18n } from '@/i18n/I18nContext';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />
  );
}

/** Placeholder grid shown while the first data load is in flight. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-80" />
      ))}
    </div>
  );
}
