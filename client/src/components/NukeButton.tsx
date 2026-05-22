import { useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import rawSoundLibrary from "../soundLibrary.json";

/* ── Sound pool ─────────────────────────────────────────── */
type SoundEntry = { file: string | null; prompt: string; isSurprise: boolean };
const nukePool = (rawSoundLibrary as SoundEntry[]).filter((s) => s.file);

/* ── CSS shake animation (injected once into <head>) ────── */
const SHAKE_STYLE_ID = "nuke-shake-keyframes";
const SHAKE_CSS = `
  @keyframes nukeShake {
    0%,100%{ transform: translate(0,0) rotate(0deg); }
    7%  { transform: translate(-15px,-10px) rotate(-2.5deg); }
    14% { transform: translate( 15px, 10px) rotate( 2.5deg); }
    21% { transform: translate(-12px,  7px) rotate(-2deg);   }
    28% { transform: translate( 12px, -9px) rotate( 2deg);   }
    35% { transform: translate(-18px,  8px) rotate(-3deg);   }
    42% { transform: translate( 18px, -8px) rotate( 3deg);   }
    49% { transform: translate(-10px, 15px) rotate(-2deg);   }
    56% { transform: translate( 10px,-15px) rotate( 2deg);   }
    63% { transform: translate(-14px,  6px) rotate(-2.5deg); }
    70% { transform: translate( 14px, -6px) rotate( 2.5deg); }
    77% { transform: translate( -7px, 12px) rotate(-1.5deg); }
    84% { transform: translate(  7px,-12px) rotate( 1.5deg); }
    91% { transform: translate( -4px,  5px) rotate(-1deg);   }
    97% { transform: translate(  4px, -5px) rotate( 1deg);   }
  }
  .nuke-shake {
    animation: nukeShake 0.11s ease-in-out infinite;
    transform-origin: center center;
  }
`;

function ensureShakeStyles() {
  if (document.getElementById(SHAKE_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = SHAKE_STYLE_ID;
  el.textContent = SHAKE_CSS;
  document.head.appendChild(el);
}

/* ── Confetti emoji shapes ───────────────────────────────── */
const NUKE_EMOJIS = ["🔥", "💥", "💨", "🦖"];

/* ── NukeButton ─────────────────────────────────────────── */
interface Props { masterVolume: number }

export function NukeButton({ masterVolume }: Props) {
  const isNukingRef = useRef(false);

  const triggerNuke = useCallback(() => {
    if (isNukingRef.current) return;
    isNukingRef.current = true;

    ensureShakeStyles();

    /* 1 — Aggressive screen shake on <body> for 3 seconds */
    document.body.classList.add("nuke-shake");

    /* 1b — Green toxic gas cloud overlay */
    if (!document.getElementById("nuke-gas-style")) {
      const gs = document.createElement("style");
      gs.id = "nuke-gas-style";
      gs.textContent = `
        @keyframes gasCloud {
          0%   { opacity:0; background:rgba(40,220,40,0.0); }
          12%  { opacity:1; background:rgba(40,220,40,0.22); }
          55%  { opacity:1; background:rgba(80,200,40,0.16); }
          100% { opacity:0; background:rgba(40,220,40,0.0); }
        }
        .nuke-gas { animation: gasCloud 3s ease-in-out forwards; }
      `;
      document.head.appendChild(gs);
    }
    const cloud = document.createElement("div");
    cloud.className = "nuke-gas";
    cloud.style.cssText = "position:fixed;inset:0;z-index:9998;pointer-events:none;";
    document.body.appendChild(cloud);
    setTimeout(() => cloud.remove(), 3100);

    /* 2 — Override any playing audio; then play 5 overlapping random sounds */
    document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => {
      try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
    });

    const vol = Math.min(1.0, (masterVolume / 100) * 1.15); // slightly louder for effect
    [0, 85, 170, 255, 340].forEach((delay) => {
      setTimeout(() => {
        const s = nukePool[Math.floor(Math.random() * nukePool.length)];
        if (!s?.file) return;
        const audio = new Audio(s.file);
        audio.volume = Math.min(1, vol);
        audio.play().catch(() => {});
      }, delay);
    });

    /* 3 — Massive confetti explosion from screen center */
    const shapes = NUKE_EMOJIS.map((e) => confetti.shapeFromText({ text: e, scalar: 2.6 }));

    // Primary blast
    confetti({
      particleCount    : 380,
      shapes,
      scalar           : 2.6,
      spread           : 360,
      startVelocity    : 58,
      origin           : { x: 0.5, y: 0.5 },
      gravity          : 0.65,
      ticks            : 320,
      disableForReducedMotion: false,
    });

    // Secondary shockwave ring
    setTimeout(() => {
      confetti({
        particleCount  : 220,
        shapes,
        scalar         : 2.2,
        spread         : 290,
        startVelocity  : 42,
        origin         : { x: 0.5, y: 0.48 },
        gravity        : 1.05,
        ticks          : 260,
      });
    }, 420);

    /* 4 — Stop shake at 3s; reset cooldown at 4s */
    setTimeout(() => { document.body.classList.remove("nuke-shake"); }, 3000);
    setTimeout(() => { isNukingRef.current = false; }, 4000);
  }, [masterVolume]);

  return (
    <button
      onDoubleClick={triggerNuke}
      className="fixed bottom-1 left-1 z-30 select-none leading-none"
      style={{
        fontSize   : 17,
        color      : "rgba(255,255,255,0.1)",
        transition : "color 0.4s, transform 0.25s",
        background : "none",
        border     : "none",
        cursor     : "default",
        padding    : 2,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "rgba(255, 210, 0, 0.3)";
        e.currentTarget.style.transform = "scale(1.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255,255,255,0.1)";
        e.currentTarget.style.transform = "scale(1)";
      }}
      data-testid="button-nuke"
      aria-label="secret"
    >
      ☢
    </button>
  );
}
