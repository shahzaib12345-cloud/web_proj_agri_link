import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
      {hint && <p className="text-xs text-slate-600 mb-4 leading-relaxed">{hint}</p>}
      {action}
    </div>
  );
}
