/**
 * Flagsmith dashboard links (FR-10.4). The results page is the source of truth; Redis numbers are
 * live counters. Override with FLAGSMITH_EXPERIMENT_URL (e.g. the Development experiment locally).
 */
export const FLAGSMITH_PROJECT_ID = 56121;
export const FLAGSMITH_PRODUCTION_ENV_KEY = 'iKpcbAp4Uc2tHEaYZuwCre';
export const FLAGSMITH_PRODUCTION_EXPERIMENT_ID = 485;

export function flagsmithExperimentUrl(): string {
  return (
    process.env.FLAGSMITH_EXPERIMENT_URL?.trim() ||
    `https://app.flagsmith.com/project/${FLAGSMITH_PROJECT_ID}/environment/${FLAGSMITH_PRODUCTION_ENV_KEY}/experiments/${FLAGSMITH_PRODUCTION_EXPERIMENT_ID}`
  );
}

export function flagsmithSegmentsUrl(): string {
  return `https://app.flagsmith.com/project/${FLAGSMITH_PROJECT_ID}/segments`;
}
