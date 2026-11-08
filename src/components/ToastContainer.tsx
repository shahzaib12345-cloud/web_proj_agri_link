import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/i18n/I18nContext';
import { CloseButton } from './CloseButton';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('a11y.notifications')}
      className="fixed bottom-20 md:bottom-6 inset-x-4 sm:inset-x-auto sm:end-4 sm:w-96 z-[60] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let bgStyle = 'bg-emerald-900 text-white border-emerald-800';
        if (toast.type === 'error') {
          Icon = AlertCircle;
          bgStyle = 'bg-rose-900 text-white border-rose-800';
        } else if (toast.type === 'warning') {
          Icon = AlertCircle;
          bgStyle = 'bg-amber-900 text-white border-amber-800';
        } else if (toast.type === 'info') {
          Icon = Info;
          bgStyle = 'bg-slate-900 text-white border-slate-800';
        }
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-lg ${bgStyle} animate-slide-up text-sm`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="font-medium text-xs sm:text-sm leading-snug">{toast.message}</span>
            </div>
            <div className="text-white">
              <CloseButton onClick={() => removeToast(toast.id)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
