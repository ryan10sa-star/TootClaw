import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import rawSoundLibrary from "../soundLibrary.json";

type SoundEntry = { file: string | null; prompt: string; isSurprise: boolean };
const fartPool = (rawSoundLibrary as SoundEntry[]).filter((s) => !s.isSurprise && s.file);

const FADE_STEPS    = 12;
const FADE_INTERVAL = 45; // ms  — total ~540ms fade

interface Props {
  masterVolume: number;
  selectedSoundUrl?: string | null;
}

export function ForeverTootButton({ masterVolume, selectedSoundUrl }: Props) {
  const [active, setActive] = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const fadeRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFade = () => {
    if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; }
  };

  const stop = useCallback(() => {
    if (!audioRef.current) { setActive(false); return; }
    const audio     = audioRef.current;
    const startVol  = audio.volume;
    let   step      = 0;

    clearFade();
    fadeRef.current = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        clearFade();
        audio.pause();
        audioRef.current = null;
      }
    }, FADE_INTERVAL);

    setActive(false);
  }, []);

  const toggle = useCallback(() => {
    if (active) { stop(); return; }

    const src       = selectedSoundUrl ?? fartPool[Math.floor(Math.random() * fartPool.length)]?.file;
    if (!src) return;

    const targetVol = Math.min(0.75, masterVolume / 100);
    const audio     = new Audio(src);
    audio.loop      = true;
    audio.volume    = 0;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setActive(true);

    /* Fade in */
    let step = 0;
    clearFade();
    fadeRef.current = setInterval(() => {
      step++;
      if (audioRef.current) {
        audioRef.current.volume = Math.min(targetVol, targetVol * (step / FADE_STEPS));
      }
      if (step >= FADE_STEPS) clearFade();
    }, FADE_INTERVAL);
  }, [active, stop, masterVolume, selectedSoundUrl]);

  /* Cleanup on unmount */
  useEffect(() => () => { clearFade(); audioRef.current?.pause(); }, []);

  return (
    <motion.button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black select-none"
      style={{
        background : active ? "rgba(220,38,38,0.28)" : "rgba(220,38,38,0.1)",
        border     : `1px solid rgba(220,38,38,${active ? "0.65" : "0.3"})`,
        color      : "#f87171",
        transition : "background 0.25s, border-color 0.25s",
      }}
      whileTap={{ scale: 0.92 }}
      data-testid="button-forever-toot"
    >
      {active ? (
        <>
          <motion.span
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 0.42, repeat: Infinity }}
            style={{ display: "inline-block", fontSize: 11 }}
          >
            ■
          </motion.span>
          Stop Ripping
        </>
      ) : (
        <>
          <span style={{ fontSize: 13 }}>∞</span>
          Forever Toot
        </>
      )}
    </motion.button>
  );
}
