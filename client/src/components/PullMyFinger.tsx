import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import rawSoundLibrary from "../soundLibrary.json";

type SoundEntry = { file: string | null; prompt: string; isSurprise: boolean };
const fartPool = (rawSoundLibrary as SoundEntry[]).filter((s) => !s.isSurprise && s.file);

interface Props { masterVolume: number }

type State = "idle" | "countdown" | "fired";

export function PullMyFinger({ masterVolume }: Props) {
  const [state, setState] = useState<State>("idle");
  const [count, setCount]  = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* Cleanup interval on unmount */
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const start = useCallback(() => {
    if (state !== "idle") return;
    setState("countdown");
    setCount(3);
    let remaining = 3;

    timerRef.current = setInterval(() => {
      remaining--;
      setCount(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setState("fired");

        const vol   = Math.min(1, (masterVolume / 100) * 1.1);
        const sound = fartPool[Math.floor(Math.random() * fartPool.length)];
        if (sound?.file) {
          const audio = new Audio(sound.file);
          audio.volume = vol;
          audio.play().catch(() => {});
        }

        confetti({
          particleCount : 55,
          shapes        : ["💨", "💩"].map((e) => confetti.shapeFromText({ text: e, scalar: 2.2 })),
          scalar        : 2.2,
          spread        : 80,
          startVelocity : 22,
          origin        : { x: 0.5, y: 0.72 },
          gravity       : 1.3,
          ticks         : 90,
        });

        setTimeout(() => setState("idle"), 1600);
      }
    }, 1000);
  }, [state, masterVolume]);

  const label =
    state === "countdown"
      ? count > 0 ? `${count}…` : "RIIIIIP!"
      : state === "fired"
      ? "RIPPED!"
      : "Pull My Finger";

  return (
    <motion.button
      onClick={start}
      disabled={state === "countdown"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors select-none"
      style={{
        background : state === "fired" ? "rgba(255,120,0,0.3)" : "rgba(255,150,50,0.12)",
        border     : `1px solid rgba(255,150,50,${state === "fired" ? "0.7" : "0.35"})`,
        color      : "#fb923c",
      }}
      whileTap={{ scale: 0.93 }}
      data-testid="button-pull-finger"
    >
      <span style={{ fontSize: 13 }}>☞</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.13 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
