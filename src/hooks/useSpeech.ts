import { useCallback, useSyncExternalStore } from 'react';
import { useI18n } from '@/i18n/I18nContext';

/** Text-to-speech via the browser's Web Speech API (no network, no AI service). */
let speaking = false;
const listeners = new Set<() => void>();
const emit = (value: boolean) => {
  speaking = value;
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useSpeech() {
  const { language } = useI18n();
  const isSpeaking = useSyncExternalStore(subscribe, () => speaking);

  const stopAudio = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    emit(false);
  }, []);

  const readAloud = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ur' ? 'ur-PK' : 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => emit(false);
      utterance.onerror = () => emit(false);
      emit(true);
      window.speechSynthesis.speak(utterance);
    },
    [language],
  );

  return { isSpeaking, readAloud, stopAudio, supported };
}
