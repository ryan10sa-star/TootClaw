import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Timer, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { io, type Socket } from "socket.io-client";
import soundLibrary from "../soundLibrary.json";
import { readParentalSettings } from "../hooks/useParentalSettings";
import { useCustomSounds } from "../hooks/useCustomSounds";

/* ── Sound ─────────────────────────────────────────────── */
const fartSounds = (soundLibrary as Array<{ file: string; prompt: string; isSurprise: boolean }>)
  .filter((s) => !s.isSurprise);

function playLoudFart(selectedUrl?: string | null) {
  const { masterVolume } = readParentalSettings();
  const vol = Math.min(1.0, masterVolume / 100);

  if (selectedUrl) {
    const audio = new Audio(selectedUrl);
    audio.volume = vol;
    audio.play().catch(() => {});
    return;
  }

  const sound = fartSounds[Math.floor(Math.random() * fartSounds.length)];
  if (!sound) return;
  const audio = new Audio(sound.file);
  audio.volume = vol;
  audio.play().catch(() => {});
}

/* ── Arc / dial math ────────────────────────────────────── */
const CX = 150, CY = 150, TRACK_R = 108;
const MIN_S = 5, MAX_S = 60;
const ARC_START = 30, ARC_END = 330;
const ARC_RANGE = ARC_END - ARC_START;

function secsToDeg(s: number) {
  return ARC_START + ((s - MIN_S) / (MAX_S - MIN_S)) * ARC_RANGE;
}
function degToSecs(d: number): number {
  const v = Math.round(((d - ARC_START) / ARC_RANGE) * (MAX_S - MIN_S) + MIN_S);
  return Math.min(Math.max(v, MIN_S), MAX_S);
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(startDeg: number, endDeg: number): string {
  if (endDeg <= startDeg) return "";
  const s = polar(CX, CY, TRACK_R, startDeg);
  const e = polar(CX, CY, TRACK_R, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${TRACK_R} ${TRACK_R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const TICK_SECS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const LABEL_SECS = [5, 15, 30, 45, 60];

/* ── Stealth overlay ────────────────────────────────────── */
interface StealthProps {
  remaining?: number;
  triggered: boolean;
  onDone?: () => void;
}
function StealthOverlay({ remaining, triggered, onDone }: StealthProps) {
  useEffect(() => {
    if (triggered) {
      const t = setTimeout(() => onDone?.(), 3200);
      return () => clearTimeout(t);
    }
  }, [triggered, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={
        triggered
          ? {
              opacity: 1,
              x: [0, -14, 14, -11, 11, -7, 7, -4, 4, -2, 2, 0],
              y: [0, -5, 5, -4, 4, -3, 3, -2, 2, -1, 1, 0],
            }
          : { opacity: 1 }
      }
      transition={
        triggered
          ? { duration: 0.65, times: [0, 0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.86, 0.93, 1] }
          : { duration: 0.4 }
      }
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      {/* White flash on trigger */}
      <AnimatePresence>
        {triggered && (
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none z-10"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Pulsing indicator (pre-trigger) */}
      <AnimatePresence>
        {!triggered && (
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-full"
              style={{ width: 32, height: 32, background: "#cc2200" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.07, 0.18, 0.07] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {remaining !== undefined && remaining > 0 && (
              <motion.span
                key={remaining}
                className="font-mono font-black"
                style={{ fontSize: 72, color: "rgba(255,255,255,0.05)" }}
                initial={{ scale: 1.15, opacity: 0.1 }}
                animate={{ scale: 1, opacity: 0.05 }}
                transition={{ duration: 0.3 }}
                data-testid="text-stealth-countdown"
              >
                {remaining}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-trigger */}
      <AnimatePresence>
        {triggered && (
          <motion.div
            className="flex flex-col items-center gap-4 z-20"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.2 }}
          >
            <span style={{ fontSize: 96 }}>💨</span>
            <p
              className="font-black tracking-widest uppercase"
              style={{ color: "#ff4400", fontSize: 32, textShadow: "0 0 40px #ff4400aa" }}
            >
              DETONATED
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Timer Dial ─────────────────────────────────────────── */
interface DialProps {
  seconds: number;
  onChange: (s: number) => void;
}
function TimerDial({ seconds, onChange }: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const prevSecs = useRef(seconds);

  const getAngle = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 300;
    const ny = ((clientY - rect.top) / rect.height) * 300;
    const dx = nx - CX, dy = ny - CY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const applyAngle = useCallback((angle: number) => {
    if (angle >= ARC_START && angle <= ARC_END) {
      const s = degToSecs(angle);
      prevSecs.current = s;
      onChange(s);
    } else {
      const s = prevSecs.current <= 32 ? MIN_S : MAX_S;
      onChange(s);
    }
  }, [onChange]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    applyAngle(getAngle(e.clientX, e.clientY));
  }, [applyAngle, getAngle]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true;
    const t = e.touches[0];
    applyAngle(getAngle(t.clientX, t.clientY));
  }, [applyAngle, getAngle]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      applyAngle(getAngle(e.clientX, e.clientY));
    }
    function onTMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      applyAngle(getAngle(t.clientX, t.clientY));
    }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [applyAngle, getAngle]);

  const activeDeg = secsToDeg(seconds);
  const knob = polar(CX, CY, TRACK_R, activeDeg);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      width="260"
      height="260"
      className="cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      data-testid="dial-timer"
    >
      {/* Outer glow ring */}
      <circle cx={CX} cy={CY} r={TRACK_R + 6} fill="none" stroke="#ffffff08" strokeWidth={14} />

      {/* Track */}
      <path
        d={arcPath(ARC_START, ARC_END)}
        fill="none"
        stroke="#2a1a3a"
        strokeWidth={10}
        strokeLinecap="round"
      />

      {/* Active arc */}
      <path
        d={arcPath(ARC_START, activeDeg)}
        fill="none"
        stroke="url(#arcGrad)"
        strokeWidth={10}
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse"
          x1={polar(CX, CY, TRACK_R, ARC_START).x}
          y1={polar(CX, CY, TRACK_R, ARC_START).y}
          x2={polar(CX, CY, TRACK_R, ARC_END).x}
          y2={polar(CX, CY, TRACK_R, ARC_END).y}
        >
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Tick marks */}
      {TICK_SECS.map((s) => {
        const deg = secsToDeg(s);
        const outer = polar(CX, CY, TRACK_R - 14, deg);
        const inner = polar(CX, CY, TRACK_R - 22, deg);
        const isMajor = LABEL_SECS.includes(s);
        return (
          <line
            key={s}
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke={isMajor ? "#ffffff40" : "#ffffff18"}
            strokeWidth={isMajor ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}

      {/* Tick labels */}
      {LABEL_SECS.map((s) => {
        const deg = secsToDeg(s);
        const pos = polar(CX, CY, TRACK_R + 22, deg);
        return (
          <text
            key={s}
            x={pos.x} y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="rgba(255,255,255,0.3)"
            fontFamily="monospace"
          >
            {s}
          </text>
        );
      })}

      {/* Center display */}
      <text
        x={CX} y={CY - 10}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={48}
        fontWeight="900"
        fill="white"
        fontFamily="monospace"
        letterSpacing="-2"
      >
        {String(seconds).padStart(2, "0")}
      </text>
      <text
        x={CX} y={CY + 26}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill="rgba(255,255,255,0.3)"
        fontFamily="sans-serif"
        letterSpacing="3"
      >
        SECONDS
      </text>

      {/* Draggable knob */}
      <circle
        cx={knob.x} cy={knob.y} r={13}
        fill="#1a0a2a"
        stroke="url(#arcGrad)"
        strokeWidth={2.5}
        style={{ cursor: "grab", filter: "drop-shadow(0 0 8px #db277788)" }}
      />
      <circle cx={knob.x} cy={knob.y} r={5} fill="white" fillOpacity={0.9} />
    </svg>
  );
}

/* ── Booby Trap mode ────────────────────────────────────── */
type BoobyStatus = "setting" | "armed" | "triggered";
function BoobyTrapMode({ onBack }: { onBack: () => void }) {
  const [seconds, setSeconds] = useState(30);
  const [status, setStatus] = useState<BoobyStatus>("setting");
  const [remaining, setRemaining] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { selectedUrl } = useCustomSounds();
  const selectedUrlRef = useRef(selectedUrl);
  useEffect(() => { selectedUrlRef.current = selectedUrl; }, [selectedUrl]);

  function arm() {
    setRemaining(seconds);
    setStatus("armed");
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setStatus("triggered");
          playLoudFart(selectedUrlRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function abort() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("setting");
    setRemaining(seconds);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {status === "setting" && (
          <motion.div
            key="setting"
            className="flex flex-col items-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-tight">Set the Timer</h2>
              <p className="text-white/40 text-sm mt-1">Drag the dial. Then sneak away.</p>
            </div>

            <TimerDial seconds={seconds} onChange={setSeconds} />

            <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: 260 }}>
              <motion.button
                onClick={arm}
                className="w-full py-4 rounded-2xl font-black tracking-widest uppercase text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                  fontSize: 18,
                  boxShadow: "0 4px 24px rgba(219,39,119,0.35)",
                }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                data-testid="button-arm-timer"
              >
                ARM IT
              </motion.button>
              <button
                onClick={onBack}
                className="text-white/30 text-sm hover:text-white/50 transition-colors"
                data-testid="button-back-from-booby"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(status === "armed" || status === "triggered") && (
          <StealthOverlay
            remaining={status === "armed" ? remaining : 0}
            triggered={status === "triggered"}
            onDone={onBack}
          />
        )}
      </AnimatePresence>

      {/* Abort button (barely visible on stealth screen) */}
      {status === "armed" && (
        <button
          onClick={abort}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-white/10 text-xs"
          style={{ background: "transparent" }}
          data-testid="button-abort-timer"
        >
          abort
        </button>
      )}
    </>
  );
}

/* ── Remote mode ────────────────────────────────────────── */
type RemoteStatus = "waiting" | "connected" | "stealth" | "triggered";
function RemoteMode({ onBack }: { onBack: () => void }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<RemoteStatus>("waiting");
  const socketRef = useRef<Socket | null>(null);
  const { selectedUrl } = useCustomSounds();
  const selectedUrlRef = useRef(selectedUrl);
  useEffect(() => { selectedUrlRef.current = selectedUrl; }, [selectedUrl]);

  const fireUrl = `${window.location.origin}/fire/${sessionId}`;

  useEffect(() => {
    const socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-session", sessionId);
    });

    socket.on("peer-joined", () => {
      setStatus("connected");
      setTimeout(() => setStatus("stealth"), 1800);
    });

    socket.on("fire", () => {
      setStatus("triggered");
      playLoudFart(selectedUrlRef.current);
    });

    return () => { socket.disconnect(); };
  }, [sessionId]);

  return (
    <>
      <AnimatePresence mode="wait">
        {(status === "waiting" || status === "connected") && (
          <motion.div
            key="qr"
            className="flex flex-col items-center gap-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-tight">Remote Trigger</h2>
              <p className="text-white/40 text-sm mt-1">
                {status === "waiting"
                  ? "Scan with your phone to get the FIRE button"
                  : "Phone connected! Entering stealth mode..."}
              </p>
            </div>

            {/* QR code */}
            <div
              className="p-4 rounded-2xl"
              style={{ background: "white", boxShadow: "0 0 40px rgba(255,255,255,0.1)" }}
              data-testid="qr-code"
            >
              <QRCodeSVG
                value={fireUrl}
                size={180}
                bgColor="white"
                fgColor="#0a0005"
                level="M"
              />
            </div>

            {status === "connected" && (
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 text-sm font-semibold">Phone connected!</span>
              </motion.div>
            )}

            {status === "waiting" && (
              <p className="text-white/20 text-xs font-mono tracking-wider">
                {fireUrl.replace("https://", "").replace("http://", "").slice(0, 40)}...
              </p>
            )}

            <button
              onClick={onBack}
              className="text-white/30 text-sm hover:text-white/50 transition-colors"
              data-testid="button-back-from-remote"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(status === "stealth" || status === "triggered") && (
          <StealthOverlay
            triggered={status === "triggered"}
            onDone={onBack}
          />
        )}
      </AnimatePresence>

      {status === "stealth" && (
        <button
          onClick={onBack}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-white/10 text-xs"
          style={{ background: "transparent" }}
          data-testid="button-abort-remote"
        >
          abort
        </button>
      )}
    </>
  );
}

/* ── Main SneakAttack page ──────────────────────────────── */
type Mode = "choose" | "booby-trap" | "remote";

export default function SneakAttack() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("choose");

  useEffect(() => {
    document.title = "Sneak Attack — Toot Master 3000";
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 30% 20%, #1a0530 0%, #0a0a14 55%, #040812 100%)" }}
    >
      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0">
        <button
          onClick={() => (mode === "choose" ? setLocation("/") : setMode("choose"))}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
          data-testid="button-sneak-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight leading-none">
            Sneak Attack Mode
          </h1>
          <p className="text-xs text-white/30 mt-0.5">
            {mode === "choose" ? "Choose your weapon" : mode === "booby-trap" ? "Booby Trap" : "Remote Trigger"}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <AnimatePresence mode="wait">
          {mode === "choose" && (
            <motion.div
              key="choose"
              className="w-full flex flex-col gap-5"
              style={{ maxWidth: 400 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
            >
              <p className="text-white/50 text-sm text-center mb-2">
                Set up an ambush. Pick your trigger method.
              </p>

              {/* Booby Trap card */}
              <motion.button
                onClick={() => setMode("booby-trap")}
                className="w-full p-6 rounded-3xl text-left flex gap-5 items-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(219,39,119,0.12) 100%)",
                  border: "1.5px solid rgba(124,58,237,0.3)",
                }}
                whileHover={{ scale: 1.02, borderColor: "rgba(124,58,237,0.6)" }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-choose-booby-trap"
              >
                <div
                  className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width: 56, height: 56, background: "rgba(124,58,237,0.25)" }}
                >
                  <Timer className="w-7 h-7 text-purple-300" />
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">The Booby Trap</p>
                  <p className="text-white/45 text-sm mt-1">
                    Set a countdown timer. Hide the device. Walk away innocently.
                  </p>
                </div>
              </motion.button>

              {/* Remote card */}
              <motion.button
                onClick={() => setMode("remote")}
                className="w-full p-6 rounded-3xl text-left flex gap-5 items-center"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(249,115,22,0.10) 100%)",
                  border: "1.5px solid rgba(239,68,68,0.3)",
                }}
                whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.6)" }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-choose-remote"
              >
                <div
                  className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width: 56, height: 56, background: "rgba(239,68,68,0.2)" }}
                >
                  <Smartphone className="w-7 h-7 text-red-300" />
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">The Remote</p>
                  <p className="text-white/45 text-sm mt-1">
                    Scan a QR code on your phone. Press FIRE from across the room.
                  </p>
                </div>
              </motion.button>
            </motion.div>
          )}

          {mode === "booby-trap" && (
            <motion.div
              key="booby-trap"
              className="w-full flex items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <BoobyTrapMode onBack={() => setMode("choose")} />
            </motion.div>
          )}

          {mode === "remote" && (
            <motion.div
              key="remote"
              className="w-full flex items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <RemoteMode onBack={() => setMode("choose")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
