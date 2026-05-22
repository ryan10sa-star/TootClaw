import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { CushionSettings, CushionDecal, CushionShape } from "../hooks/useCushionSettings";
import rawSoundLibrary from "../soundLibrary.json";

/* ─── Sound library ──────────────────────────────────────────────── */
type SoundEntry = { file: string | null; prompt: string; isSurprise: boolean; error?: string };
const soundLibrary   = rawSoundLibrary as SoundEntry[];
const fartSounds     = soundLibrary.filter((s) => !s.isSurprise && s.file);
const surpriseSounds = soundLibrary.filter((s) =>  s.isSurprise && s.file);

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function playToot(
  masterVolume  = 75,
  allowSurprise = true,
  selectedUrl?: string | null,
): { isSurprise: boolean; prompt: string } {
  const vol = Math.min(0.75, masterVolume / 100);

  /* Custom recording takes priority */
  if (selectedUrl) {
    const audio  = new Audio(selectedUrl);
    audio.volume = vol;
    audio.play().catch(() => {});
    return { isSurprise: false, prompt: "Custom Recording" };
  }

  const isSurprise = allowSurprise && Math.random() < 0.15;
  const pool  = isSurprise ? surpriseSounds : fartSounds;
  const sound = pickRandom(pool);
  if (sound?.file) {
    const audio  = new Audio(sound.file);
    audio.volume = vol;
    audio.play().catch(() => {});
  }
  return { isSurprise, prompt: sound?.prompt ?? "" };
}

/* ─── Colour helpers ─────────────────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function shiftColor(hex: string, amount: number): string {
  const [r,g,b] = hexToRgb(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,"0");
  return `#${c(r+amount)}${c(g+amount)}${c(b+amount)}`;
}

/* ─── Confetti engine ────────────────────────────────────────────── */
function fireParticles(originEl: HTMLDivElement, isSurprise: boolean) {
  const rect    = originEl.getBoundingClientRect();
  const originX = (rect.left + rect.width  / 2) / window.innerWidth;
  const originY = (rect.top  + rect.height * 0.87) / window.innerHeight;

  const emojis = isSurprise ? ["🐶", "🦖"] : ["💨", "💩"];
  const shapes = emojis.map((e) => confetti.shapeFromText({ text: e, scalar: 2 }));

  confetti({
    particleCount: 22,
    shapes,
    scalar: 2.2,
    spread: 65,
    startVelocity: 28,
    origin: { x: originX, y: originY },
    gravity: 1.1,
    ticks: 110,
    disableForReducedMotion: true,
  });
}

/* ─── SVG geometry helpers ──────────────────────────────────────── */
function starPolygon(cx: number, cy: number, outerR: number, innerR: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = (i * Math.PI / n) - Math.PI / 2;
    const r     = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(" ");
}
function starburst(cx: number, cy: number, r1: number, r2: number, n = 8): string {
  return starPolygon(cx, cy, r1, r2, n);
}

/* ─── Shape helpers ─────────────────────────────────────────────── */
function getClipPath(shape: CushionShape) {
  switch (shape) {
    case "round":  return <ellipse cx="100" cy="100" rx="84" ry="74" />;
    case "square": return <rect x="16" y="20" width="168" height="160" rx="22" />;
    case "star":   return <polygon points={starPolygon(100, 100, 84, 37)} />;
  }
}
function getShadowEl(shape: CushionShape) {
  switch (shape) {
    case "round":  return <ellipse cx="104" cy="108" rx="84" ry="74" />;
    case "square": return <rect x="20" y="27" width="168" height="160" rx="22" />;
    case "star":   return <polygon points={starPolygon(104, 108, 84, 37)} />;
  }
}
function getValveY(shape: CushionShape): number {
  switch (shape) { case "round": return 170; case "square": return 177; case "star": return 168; }
}

/* ─── Decals ────────────────────────────────────────────────────── */
interface DecalProps { dark: string; light: string }

function DecalClassic({ dark, light }: DecalProps) {
  return (
    <g>
      <polygon points={starburst(0, 0, 28, 20)} fill={light} fillOpacity="0.92" />
      <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="900"
        fontFamily="Impact, Arial Black, sans-serif" fill={dark} letterSpacing="1">
        TOOT!
      </text>
    </g>
  );
}
function DecalSkull({ dark }: DecalProps) {
  return (
    <g fill="white" fillOpacity="0.93">
      <ellipse cx="0" cy="-9" rx="13" ry="13" />
      <rect x="-9" y="2" width="18" height="8" rx="4" />
      <rect x="-7" y="9" width="4" height="6" rx="2" />
      <rect x="-1" y="9" width="4" height="6" rx="2" />
      <rect x="5"  y="9" width="4" height="6" rx="2" />
      <circle cx="-5" cy="-10" r="3.8" fill={dark} fillOpacity="1" />
      <circle cx="5"  cy="-10" r="3.8" fill={dark} fillOpacity="1" />
      <ellipse cx="0" cy="-3"  rx="2"  ry="2.5" fill={dark} fillOpacity="1" />
      <g stroke="white" strokeOpacity="0.93" strokeWidth="4" strokeLinecap="round" fill="none">
        <line x1="-22" y1="22" x2="22" y2="30" />
        <line x1="-22" y1="30" x2="22" y2="22" />
      </g>
      <circle cx="-24" cy="26" r="5" />
      <circle cx="24"  cy="26" r="5" />
    </g>
  );
}
function DecalSmiley({ dark }: DecalProps) {
  return (
    <g>
      <circle cx="0" cy="0" r="24" fill="#FFD93D" />
      <circle cx="0" cy="0" r="24" fill="none" stroke="#E6B800" strokeWidth="1.5" />
      <circle cx="-8" cy="-6" r="3.5" fill={dark} fillOpacity="0.85" />
      <circle cx="8"  cy="-6" r="3.5" fill={dark} fillOpacity="0.85" />
      <path d="M-11,6 Q0,18 11,6" stroke={dark} strokeOpacity="0.85" strokeWidth="2.5"
        fill="none" strokeLinecap="round" />
    </g>
  );
}
function DecalDino({ dark, light }: DecalProps) {
  return (
    <g fill={light} fillOpacity="0.92">
      <ellipse cx="-3" cy="6" rx="12" ry="9" />
      <ellipse cx="10" cy="-7" rx="8" ry="7" />
      <path d="M16,-2 L21,-5 L22,0 L16,-2 Z" />
      <circle cx="13" cy="-9" r="2.2" fill={dark} fillOpacity="1" />
      <circle cx="13.8" cy="-9.8" r="0.9" fill="white" fillOpacity="0.8" />
      <path d="M-13,10 Q-22,14 -23,8 Q-17,5 -13,10 Z" />
      <line x1="3" y1="0" x2="9" y2="4" stroke={dark} strokeWidth="2" strokeOpacity="1" strokeLinecap="round" />
      <line x1="9" y1="4" x2="7" y2="7" stroke={dark} strokeWidth="2" strokeOpacity="1" strokeLinecap="round" />
    </g>
  );
}

function getDecal(decal: CushionDecal, props: DecalProps) {
  switch (decal) {
    case "classic": return <DecalClassic {...props} />;
    case "skull":   return <DecalSkull   {...props} />;
    case "smiley":  return <DecalSmiley  {...props} />;
    case "dino":    return <DecalDino    {...props} />;
    case "none":
    case "image":   return null;
  }
}

/* ─── Animation constants ───────────────────────────────────────── */
const DEFLATE_TRANSFORM = "scaleX(1.26) scaleY(0.60)";
const NORMAL_TRANSFORM  = "scaleX(1) scaleY(1)";
const DEFLATE_MS  = 90;
const INFLATE_MS  = 3000;

const transitionFor = (phase: "deflate" | "inflate" | "idle") => {
  if (phase === "deflate") return `transform ${DEFLATE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;
  if (phase === "inflate") return `transform ${INFLATE_MS}ms cubic-bezier(0.15, 0, 0.2, 1)`;
  return "none";
};

const BREATHE = {
  scale     : [1, 1.022, 1],
  transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
};

/* ─── Main component ─────────────────────────────────────────────── */
interface Props {
  settings        : CushionSettings;
  onFart?         : (isSurprise: boolean, soundPrompt: string) => void;
  masterVolume?   : number;
  allowSurprise?  : boolean;
  customImageUrl? : string | null;
  selectedSoundUrl?: string | null;
}

export function WhoopyCushion({
  settings,
  onFart,
  masterVolume    = 75,
  allowSurprise   = true,
  customImageUrl,
  selectedSoundUrl,
}: Props) {
  const breathControls = useAnimation();
  const containerRef   = useRef<HTMLDivElement>(null);
  const innerRef       = useRef<HTMLDivElement>(null);
  const deflateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { color, shape, decal } = settings;
  const light    = shiftColor(color,  65);
  const midLight = shiftColor(color,  28);
  const dark     = shiftColor(color, -45);
  const darker   = shiftColor(color, -70);

  useEffect(() => { breathControls.start(BREATHE); }, [breathControls]);

  const setDeflateStyle = useCallback((phase: "deflate" | "inflate" | "idle") => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = transitionFor(phase);
    el.style.transform  = phase === "deflate" ? DEFLATE_TRANSFORM : NORMAL_TRANSFORM;
  }, []);

  const handleClick = useCallback(() => {
    if (deflateTimerRef.current) clearTimeout(deflateTimerRef.current);
    if (inflateTimerRef.current) clearTimeout(inflateTimerRef.current);
    breathControls.stop();
    breathControls.set({ scale: 1 });
    setDeflateStyle("deflate");
    /* Haptic pulse on mobile */
    navigator.vibrate?.([28]);
    const { isSurprise, prompt } = playToot(masterVolume, allowSurprise, selectedSoundUrl);
    if (containerRef.current) fireParticles(containerRef.current, isSurprise);
    onFart?.(isSurprise, prompt);
    deflateTimerRef.current = setTimeout(() => {
      setDeflateStyle("inflate");
      inflateTimerRef.current = setTimeout(() => {
        setDeflateStyle("idle");
        breathControls.start(BREATHE);
      }, INFLATE_MS);
    }, DEFLATE_MS + 10);
  }, [breathControls, setDeflateStyle, onFart, masterVolume, allowSurprise, selectedSoundUrl]);

  const valveY     = getValveY(shape);
  const decalProps : DecalProps = { dark, light };
  const showImage  = decal === "image" && !!customImageUrl;

  return (
    /* Breathing wrapper — fills whatever container it's placed in */
    <motion.div
      animate={breathControls}
      className="select-none w-full h-full"
    >
      <div
        ref={containerRef}
        data-testid="cushion-main"
        onClick={handleClick}
        className="cursor-pointer w-full h-full"
        style={{ filter: `drop-shadow(0 8px 36px ${color}66)` }}
      >
        <div
          ref={innerRef}
          style={{
            width: "100%", height: "100%",
            transform: NORMAL_TRANSFORM, transition: "none",
            transformOrigin: "center bottom",
          }}
        >
          <svg
            viewBox="0 0 200 200"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: "visible", display: "block" }}
          >
            <defs>
              <radialGradient id="cushBodyGrad" cx="38%" cy="32%" r="72%">
                <stop offset="0%"   stopColor={light} />
                <stop offset="40%"  stopColor={midLight} />
                <stop offset="75%"  stopColor={color} />
                <stop offset="100%" stopColor={dark} />
              </radialGradient>
              <radialGradient id="cushEdgeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="58%"  stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.32)" />
              </radialGradient>
              <clipPath id="cushClip">{getClipPath(shape)}</clipPath>
              <filter id="cushShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="3" dy="7" stdDeviation="9" floodColor="rgba(0,0,0,0.45)" />
              </filter>
            </defs>

            {/* Drop shadow */}
            <g filter="url(#cushShadow)" opacity="0.6">
              <g fill="rgba(0,0,0,0.01)">{getShadowEl(shape)}</g>
            </g>

            {/* Clipped cushion body */}
            <g clipPath="url(#cushClip)">
              {/* Base gradient */}
              <rect x="0" y="0" width="200" height="200" fill="url(#cushBodyGrad)" />

              {/* Custom photo texture — sits beneath surface overlays */}
              {showImage && (
                <image
                  href={customImageUrl!}
                  x="0" y="0" width="200" height="200"
                  preserveAspectRatio="xMidYMid slice"
                  style={{ mixBlendMode: "overlay", opacity: 0.85 } as React.CSSProperties}
                />
              )}

              {/* Fabric wrinkle folds */}
              <g stroke={dark} strokeOpacity="0.13" strokeWidth="1.6" fill="none" strokeLinecap="round">
                <path d="M 30 65 Q 66 86 100 100" />
                <path d="M 170 65 Q 134 86 100 100" />
                <path d="M 20 100 Q 58 100 100 100" />
                <path d="M 180 100 Q 142 100 100 100" />
                <path d="M 30 145 Q 66 124 100 100" />
                <path d="M 170 145 Q 134 124 100 100" />
                <path d="M 100 28 Q 100 63 100 100" />
              </g>

              {/* Edge shadow overlay */}
              <rect x="0" y="0" width="200" height="200" fill="url(#cushEdgeGrad)" />

              {/* Seam ring */}
              <g fill="none" stroke={dark} strokeOpacity="0.35" strokeWidth="2">
                {getClipPath(shape)}
              </g>

              {/* Highlight reflection */}
              <ellipse cx="66" cy="60" rx="30" ry="17" fill="rgba(255,255,255,0.28)" transform="rotate(-18,66,60)" />
              <ellipse cx="68" cy="62" rx="14" ry="7"  fill="rgba(255,255,255,0.18)" transform="rotate(-18,68,62)" />

              {/* Center depression */}
              <ellipse cx="100" cy="100" rx="36" ry="30" fill="rgba(0,0,0,0.09)" />

              {/* SVG Decal (shown when not using a custom photo) */}
              {!showImage && (
                <g transform="translate(100,100)">{getDecal(decal, decalProps)}</g>
              )}
            </g>

            {/* Valve tube */}
            <g>
              <rect x="91" y={valveY - 2} width="18" height="10" rx="5" fill={dark} />
              <rect x="93" y={valveY + 5} width="14" height="7"  rx="3.5" fill={darker} />
              <rect x="94" y={valveY + 9} width="12" height="5"  rx="2.5" fill={dark} />
            </g>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
