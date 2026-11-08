import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { isSafeImageUrl } from '@/utils/validators';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Pass true for decorative images (empty alt). */
  decorative?: boolean;
  eager?: boolean;
}

/** Image with a state-based fallback (no DOM mutation) and URL validation (https or local only). */
export function SafeImage({
  src,
  alt,
  className = '',
  decorative = false,
  eager = false,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed || !isSafeImageUrl(src)) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        role="img"
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
      >
        <ImageOff className="w-6 h-6" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
