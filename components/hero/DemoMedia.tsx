'use client';

import { useState, type ReactNode } from 'react';
import type { MediaKind } from '@/lib/parser/types';

/**
 * FR-4.5: README demo media. GIFs lazy-load; videos are muted/autoplay/loop/playsinline with
 * metadata-only preload. `attachment` (github.com/user-attachments) can be a video or an image,
 * so it tries video first, then image. Any load error falls back to `fallback`.
 */
export function DemoMedia({
  url,
  kind,
  alt,
  fallback,
}: {
  url: string;
  kind: MediaKind;
  alt: string;
  fallback: ReactNode;
}) {
  const [attempt, setAttempt] = useState<'video' | 'image' | 'failed'>(kind === 'gif' ? 'image' : 'video');

  const mediaClass = 'max-h-full max-w-full rounded-md object-contain';

  if (attempt === 'failed') return <>{fallback}</>;

  if (attempt === 'video') {
    return (
      <video
        src={url}
        className={mediaClass}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        onError={() => setAttempt(kind === 'attachment' ? 'image' : 'failed')}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary README hosts; next/image would need remotePatterns for all of them
    <img
      src={url}
      alt={alt}
      className={mediaClass}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setAttempt('failed')}
    />
  );
}
