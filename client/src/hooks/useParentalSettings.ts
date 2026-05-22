import { useState } from "react";

export interface ParentalSettings {
  masterVolume: number;
  allowSurprise: boolean;
  enableSommelier: boolean;
  muteSommelier: boolean;
}

const STORAGE_KEY = "toot-master-3000-parental";

const DEFAULTS: ParentalSettings = {
  masterVolume: 75,
  allowSurprise: true,
  enableSommelier: true,
  muteSommelier: false,
};

export function readParentalSettings(): ParentalSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useParentalSettings() {
  const [settings, setSettings] = useState<ParentalSettings>(readParentalSettings);

  function update(patch: Partial<ParentalSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return { settings, update };
}
