import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import rawSoundLibrary from "../soundLibrary.json";
import { ArrowLeft, Zap, Trophy, RefreshCcw } from "lucide-react";

type SoundEntry = { file: string | null; prompt: string; isSurprise: boolean };
const fartPool = (rawSoundLibrary as SoundEntry[]).filter((s) => !s.isSurprise && s.file);

const ROUND_MS   = 5000;
const p1Color    = "#a855f7";
const p2Color    = "#22d3ee";

type Phase = "intro" | "ready1" | "p1" | "between" | "ready2" | "p2" | "result";

function playFart(vol = 75) {
  const s = fartPool[Math.floor(Math.random() * fartPool.length)];
  if (!s?.file) return;
  const a = new Audio(s.file);
  a.volume = Math.min(1, vol / 100);
  a.play().catch(() => {});
}

/* ── Pre-round countdown display ─────────────────────────────── */
function PreRound({ player, color, onDone }: { player: 1 | 2; color: string; onDone: () => void }) {
  const [num, setNum] = useState(3);

  useEffect(() => {
    let n = 3;
    const id = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(id); onDone(); }
      else         setNum(n);
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
    >
      <div className="text-sm font-black tracking-widest uppercase" style={{ color }}>
        Player {player} — Get Ready!
      </div>
      <motion.div
        key={num}
        className="font-black tabular-nums"
        style={{ fontSize: 100, lineHeight: 1, color }}
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {num}
      </motion.div>
      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>seconds until your turn…</div>
    </motion.div>
  );
}

/* ── Big tappable battle cushion ─────────────────────────────── */
function BattleCushion({ color, onTap, disabled }: { color: string; onTap: () => void; disabled: boolean }) {
  const [deflate, setDeflate] = useState(false);
  const [ripple, setRipple]   = useState(false);

  function handleTap() {
    if (disabled) return;
    navigator.vibrate?.([18]);
    onTap();
    setDeflate(true);
    setRipple(true);
    setTimeout(() => setDeflate(false), 190);
    setTimeout(() => setRipple(false), 350);
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: "min(72vw, 320px)", height: "min(72vw, 320px)" }}>
      {/* Ripple ring */}
      {ripple && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `3px solid ${color}`,
            animation: "battleRipple 0.35s ease-out forwards",
          }}
        />
      )}
      <style>{`
        @keyframes battleRipple {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.4);  opacity: 0; }
        }
      `}</style>

      <button
        onClick={handleTap}
        disabled={disabled}
        className="select-none flex items-center justify-center rounded-full w-full h-full"
        style={{
          background : `radial-gradient(circle at 38% 32%, ${color}ee, ${color}88 55%, ${color}44)`,
          boxShadow  : `0 10px 55px ${color}55, 0 0 0 3px ${color}44, inset 0 2px 12px rgba(255,255,255,0.15)`,
          border     : `3px solid ${color}88`,
          opacity    : disabled ? 0.45 : 1,
          cursor     : disabled ? "default" : "pointer",
          transform  : deflate ? "scale(0.82) rotate(-2.5deg)" : "scale(1)",
          transition : "transform 0.19s ease-out, opacity 0.2s, box-shadow 0.2s",
          outline    : "none",
        }}
        data-testid="battle-cushion"
      >
        <span style={{ fontSize: "min(16vw, 80px)", userSelect: "none", pointerEvents: "none" }}>💨</span>
      </button>
    </div>
  );
}

/* ── Circular countdown ring ─────────────────────────────────── */
function TimerRing({ elapsed, total, color }: { elapsed: number; total: number; color: string }) {
  const r      = 44;
  const circ   = 2 * Math.PI * r;
  const pct    = Math.min(1, elapsed / total);
  const remain = Math.max(0, Math.ceil((total - elapsed) / 1000));
  const isLow  = remain <= 1;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 108, height: 108 }}>
      <svg width="108" height="108" style={{ position: "absolute", inset: 0 }}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="54" cy="54" r={r}
          fill="none"
          stroke={isLow ? "#ef4444" : color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * pct}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
        />
      </svg>
      <motion.span
        key={remain}
        className="font-black tabular-nums"
        style={{ fontSize: 30, color: isLow ? "#ef4444" : "white", zIndex: 1 }}
        animate={isLow ? { scale: [1, 1.25, 1] } : {}}
        transition={{ duration: 0.25 }}
        data-testid="text-battle-timer"
      >
        {remain}
      </motion.span>
    </div>
  );
}

/* ── Live score bar ──────────────────────────────────────────── */
function ScoreBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center"
      animate={score > 0 ? { scale: [1, 1.18, 1] } : {}}
      transition={{ duration: 0.18 }}
      key={score}
    >
      <div className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color }}>{label}</div>
      <div className="text-5xl font-black tabular-nums leading-none" style={{ color }} data-testid={`text-${label.toLowerCase().replace(" ", "")}-score`}>{score}</div>
      <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>toots</div>
    </motion.div>
  );
}

/* ── Main battle page ────────────────────────────────────────── */
export default function BattleMode() {
  const [, setLocation] = useLocation();
  const [phase, setPhase]   = useState<Phase>("intro");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef(0);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startRound = useCallback((player: 1 | 2) => {
    setElapsed(0);
    setPhase(player === 1 ? "p1" : "p2");
    startRef.current = Date.now();

    tickRef.current = setInterval(() => {
      const e = Date.now() - startRef.current;
      setElapsed(e);
      if (e >= ROUND_MS) {
        stopTick();
        setPhase(player === 1 ? "between" : "result");
      }
    }, 55);
  }, [stopTick]);

  /* Winner confetti */
  useEffect(() => {
    if (phase !== "result") return;
    const col    = p1Score > p2Score ? p1Color : p2Score > p1Score ? p2Color : "#facc15";
    const shapes = ["🏆", "💨", "🎉", "⚡"].map((e) => confetti.shapeFromText({ text: e, scalar: 2.4 }));
    const fire = (delay: number, pc: number, sv: number, sp: number) =>
      setTimeout(() => confetti({ particleCount: pc, shapes, scalar: 2.2, spread: sp, startVelocity: sv, origin: { x: 0.5, y: 0.45 }, gravity: 0.8, ticks: 280, colors: [col, "#fff"] }), delay);
    fire(0, 250, 50, 360);
    fire(500, 150, 35, 280);
  }, [phase, p1Score, p2Score]);

  useEffect(() => stopTick, [stopTick]);

  function handleTap(player: 1 | 2) {
    if (Date.now() - startRef.current >= ROUND_MS) return;
    playFart(75);
    if (player === 1) setP1Score((n) => n + 1);
    else              setP2Score((n) => n + 1);
  }

  function reset() {
    stopTick();
    setPhase("intro");
    setP1Score(0);
    setP2Score(0);
    setElapsed(0);
  }

  const isTie   = p1Score === p2Score;
  const p1Wins  = p1Score > p2Score;
  const winColor = isTie ? "#facc15" : p1Wins ? p1Color : p2Color;
  const winLabel = isTie ? "PERFECTLY TIED!" : p1Wins ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 30% 20%, #1f0b3a 0%, #0d1117 55%, #071428 100%)" }}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => { stopTick(); setLocation("/"); }}
          className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
          data-testid="button-battle-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-white tracking-tight leading-none">Fart Battle</h1>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Who toots the most in 5 seconds?</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Zap className="w-3.5 h-3.5" style={{ color: "#facc15" }} />
          <span className="text-xs font-black" style={{ color: "#facc15" }}>BATTLE</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ─ INTRO ─ */}
          {phase === "intro" && (
            <motion.div key="intro" className="flex flex-col items-center gap-6 text-center w-full max-w-sm"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div>
                <div style={{ fontSize: 64 }}>💨</div>
                <h2 className="text-2xl font-black text-white mt-2">WHO'S THE</h2>
                <h2 className="text-3xl font-black" style={{ color: "#a855f7" }}>TOOT MASTER?</h2>
                <p className="text-xs mt-2.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Each player gets <strong className="text-white">5 seconds</strong> to tap as many times as possible.<br/>
                  Most toots wins the crown!
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <div className="flex-1 rounded-2xl py-3 text-center" style={{ background: `${p1Color}14`, border: `1.5px solid ${p1Color}44` }}>
                  <div className="text-[10px] font-black tracking-widest uppercase" style={{ color: p1Color }}>Player 1</div>
                  <div className="text-xl font-black text-white/20 mt-0.5">?</div>
                </div>
                <div className="flex items-center font-black text-white/20 text-sm">VS</div>
                <div className="flex-1 rounded-2xl py-3 text-center" style={{ background: `${p2Color}14`, border: `1.5px solid ${p2Color}44` }}>
                  <div className="text-[10px] font-black tracking-widest uppercase" style={{ color: p2Color }}>Player 2</div>
                  <div className="text-xl font-black text-white/20 mt-0.5">?</div>
                </div>
              </div>

              <motion.button
                onClick={() => setPhase("ready1")}
                className="w-full py-4 rounded-2xl font-black tracking-widest uppercase text-white text-base"
                style={{ background: `linear-gradient(135deg, ${p1Color}cc, ${p1Color}88)`, boxShadow: `0 6px 30px ${p1Color}44`, border: `1.5px solid ${p1Color}88` }}
                whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}
                data-testid="button-battle-start"
              >
                Player 1 — Go First!
              </motion.button>
            </motion.div>
          )}

          {/* ─ READY 1 ─ */}
          {phase === "ready1" && (
            <motion.div key="ready1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PreRound player={1} color={p1Color} onDone={() => startRound(1)} />
            </motion.div>
          )}

          {/* ─ PLAYER 1 TURN ─ */}
          {phase === "p1" && (
            <motion.div key="p1" className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div className="flex items-center gap-6 w-full justify-center">
                <ScoreBar score={p1Score} color={p1Color} label="Player 1" />
                <TimerRing elapsed={elapsed} total={ROUND_MS} color={p1Color} />
              </div>
              <BattleCushion color={p1Color} onTap={() => handleTap(1)} disabled={elapsed >= ROUND_MS} />
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: `${p1Color}88` }}>
                TAP LIKE CRAZY!
              </p>
            </motion.div>
          )}

          {/* ─ BETWEEN ─ */}
          {phase === "between" && (
            <motion.div key="between" className="flex flex-col items-center gap-5 text-center max-w-sm w-full"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="w-full rounded-2xl py-5 text-center" style={{ background: `${p1Color}18`, border: `2px solid ${p1Color}55` }}>
                <div className="text-xs font-black tracking-widest uppercase" style={{ color: p1Color }}>Player 1 scored</div>
                <motion.div
                  className="text-7xl font-black tabular-nums" style={{ color: p1Color }}
                  initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                >
                  {p1Score}
                </motion.div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>toots in 5 seconds</div>
              </div>
              <div className="text-lg font-black text-white">Pass to Player 2!</div>
              <motion.button
                onClick={() => setPhase("ready2")}
                className="w-full py-4 rounded-2xl font-black tracking-widest uppercase text-white text-base"
                style={{ background: `linear-gradient(135deg, ${p2Color}cc, ${p2Color}88)`, boxShadow: `0 6px 30px ${p2Color}44`, border: `1.5px solid ${p2Color}88` }}
                whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}
                data-testid="button-battle-p2-go"
              >
                Player 2 — GO!
              </motion.button>
            </motion.div>
          )}

          {/* ─ READY 2 ─ */}
          {phase === "ready2" && (
            <motion.div key="ready2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PreRound player={2} color={p2Color} onDone={() => startRound(2)} />
            </motion.div>
          )}

          {/* ─ PLAYER 2 TURN ─ */}
          {phase === "p2" && (
            <motion.div key="p2" className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <div className="flex items-center gap-6 w-full justify-center">
                <ScoreBar score={p2Score} color={p2Color} label="Player 2" />
                <TimerRing elapsed={elapsed} total={ROUND_MS} color={p2Color} />
              </div>
              <BattleCushion color={p2Color} onTap={() => handleTap(2)} disabled={elapsed >= ROUND_MS} />
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: `${p2Color}88` }}>
                BEAT {p1Score} TOOTS!
              </p>
            </motion.div>
          )}

          {/* ─ RESULT ─ */}
          {phase === "result" && (
            <motion.div key="result" className="flex flex-col items-center gap-5 text-center px-2 max-w-sm w-full"
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}>

              <Trophy className="w-12 h-12" style={{ color: winColor }} />
              <div>
                <motion.div
                  className="text-2xl font-black"
                  style={{ color: winColor }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  data-testid="text-battle-winner"
                >
                  {winLabel}
                </motion.div>
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {isTie ? "Two equally legendary rippers." : `The Toot Master has been crowned.`}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <div className="flex-1 rounded-2xl py-4 text-center" style={{ background: `${p1Color}${p1Wins && !isTie ? "28" : "10"}`, border: `${p1Wins && !isTie ? "2.5px" : "1.5px"} solid ${p1Color}${p1Wins && !isTie ? "77" : "30"}` }}>
                  <div className="text-[9px] font-black tracking-widest uppercase" style={{ color: p1Color }}>Player 1</div>
                  <div className="text-4xl font-black text-white">{p1Score}</div>
                </div>
                <div className="flex items-center font-black text-white/25 text-sm">VS</div>
                <div className="flex-1 rounded-2xl py-4 text-center" style={{ background: `${p2Color}${!p1Wins && !isTie ? "28" : "10"}`, border: `${!p1Wins && !isTie ? "2.5px" : "1.5px"} solid ${p2Color}${!p1Wins && !isTie ? "77" : "30"}` }}>
                  <div className="text-[9px] font-black tracking-widest uppercase" style={{ color: p2Color }}>Player 2</div>
                  <div className="text-4xl font-black text-white">{p2Score}</div>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <motion.button onClick={reset}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-black text-xs text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  whileTap={{ scale: 0.95 }} data-testid="button-battle-rematch">
                  <RefreshCcw className="w-3.5 h-3.5" /> Rematch
                </motion.button>
                <motion.button onClick={() => setLocation("/")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-black text-xs text-white"
                  style={{ background: `${winColor}1e`, border: `1.5px solid ${winColor}55` }}
                  whileTap={{ scale: 0.95 }} data-testid="button-battle-home">
                  <ArrowLeft className="w-3.5 h-3.5" /> Home
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
