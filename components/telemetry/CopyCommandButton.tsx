'use client';

import { CopyButton } from '@/components/ui/CopyButton';
import type { HeroLayout } from '@/lib/flagsmith/variants';
import { trackConversion } from '@/lib/telemetry/client';
import { EVENTS, type ConversionSource } from '@/lib/telemetry/events';

/** Copy button that records `clone_command_copied` (+ the visitor's first `developer_intent`). */
export function CopyCommandButton({
  text,
  label,
  repoSlug,
  variant,
  source,
}: {
  text: string;
  label?: string;
  repoSlug: string;
  variant: HeroLayout;
  /** Which copy button this is, for the Redis confound check. */
  source: Extract<ConversionSource, 'clone_box' | 'quickstart_copy'>;
}) {
  return (
    <CopyButton
      text={text}
      label={label}
      onCopied={() => trackConversion(EVENTS.CLONE_COMMAND_COPIED, { repoSlug, variant }, { source })}
    />
  );
}
