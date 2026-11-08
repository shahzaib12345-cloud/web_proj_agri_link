import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nContext';

interface ModalProps {
  onClose: () => void;
  /** Accessible name for the dialog (a visible heading is better; pass its text). */
  label: string;
  children: ReactNode;
  /** Tailwind classes for the card (max width etc.). */
  className?: string;
  scroll?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Shared accessible dialog: role/aria, Escape to close, focus trap, focus restore, scroll lock. */
export function Modal({
  onClose,
  label,
  children,
  className = 'max-w-md',
  scroll = false,
}: ModalProps) {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  // Keep the latest onClose in a ref so the effect below runs only once per open.
  // (Depending on onClose re-ran it on every keystroke and stole focus to the close button.)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    const firstFocusable = card?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? card)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !card) return;
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/50 backdrop-blur-sm animate-fade-in ${scroll ? 'overflow-y-auto' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className={`bg-white rounded-2xl w-full p-6 shadow-2xl border border-emerald-950/10 outline-none ${scroll ? 'my-8' : ''} ${className}`}
      >
        <span id={labelId} className="sr-only">
          {label}
        </span>
        {children}
        <span className="sr-only">{t('a11y.dialog_end')}</span>
      </div>
    </div>
  );
}
