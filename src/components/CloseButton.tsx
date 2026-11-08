import { X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

/** Icon-only close button with an accessible name and a 48px touch target. */
export function CloseButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('a11y.close')}
      className="w-12 h-12 -m-2 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <X className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
