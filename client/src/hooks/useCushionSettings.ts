import { useState, useEffect } from "react";

export type CushionShape = "round" | "square" | "star";
export type CushionDecal = "none" | "classic" | "skull" | "smiley" | "dino" | "image";

export interface CushionSettings {
  color: string;
  shape: CushionShape;
  decal: CushionDecal;
  size: number;
}

export const DEFAULT_SETTINGS: CushionSettings = {
  color: "#E8445A",
  shape: "round",
  decal: "classic",
  size:  1,
};

export const COLOR_PALETTE = [
  { name: "Classic Red",  value: "#E8445A" },
  { name: "Hot Pink",     value: "#FF6B9D" },
  { name: "Sunshine",     value: "#FFD93D" },
  { name: "Teal",         value: "#4ECDC4" },
  { name: "Lime",         value: "#6BCB77" },
  { name: "Purple",       value: "#9B5DE5" },
  { name: "Orange",       value: "#FF9F43" },
  { name: "Blue",         value: "#4A90D9" },
];

export const SHAPES: { id: CushionShape; label: string }[] = [
  { id: "round",  label: "Round"  },
  { id: "square", label: "Square" },
  { id: "star",   label: "Star"   },
];

export const DECALS: { id: CushionDecal; label: string }[] = [
  { id: "none",    label: "None"    },
  { id: "classic", label: "Classic" },
  { id: "skull",   label: "Skull"   },
  { id: "smiley",  label: "Smiley"  },
  { id: "dino",    label: "Dino"    },
];

const STORAGE_KEY = "toot-master-3000-settings";

export function useCushionSettings() {
  const [settings, setSettings] = useState<CushionSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (partial: Partial<CushionSettings>) =>
    setSettings((s) => ({ ...s, ...partial }));

  const randomize = () => {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    setSettings({
      color: pick(COLOR_PALETTE).value,
      shape: pick(SHAPES).id,
      decal: pick(DECALS).id,
      size:  Math.round((0.6 + Math.random() * 0.8) * 10) / 10,
    });
  };

  const reset = () => setSettings(DEFAULT_SETTINGS);

  return { settings, update, randomize, reset };
}
