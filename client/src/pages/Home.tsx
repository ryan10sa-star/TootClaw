import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, RotateCcw, Crosshair, Settings, Swords, Wand2 } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { WhoopyCushion } from "../components/WhoopyCushion";
import { BuilderPanel } from "../components/BuilderPanel";
import { SommelierCharacter } from "../components/SommelierCharacter";
import { ParentalSettings } from "../components/ParentalSettings";
import { ComboCounter } from "../components/ComboCounter";
import { PullMyFinger } from "../components/PullMyFinger";
import { ForeverTootButton } from "../components/ForeverTootButton";
import { useCushionSettings } from "../hooks/useCushionSettings";
import { useParentalSettings } from "../hooks/useParentalSettings";
import { useCustomImage } from "../hooks/useCustomImage";
import { useCustomSounds } from "../hooks/useCustomSounds";
import { NukeButton } from "../components/NukeButton";

/* ── Reaction messages ──────────────────────────────────── */
const FART_MESSAGES    = ["Nicely done.", "Classic.", "Was that you?!", "Oops.", "Ripppp!", "Beautiful.", "Chef's kiss.", "Legendary.", "A masterpiece.", "Art."];
const SURPRISE_MESSAGES = ["WHAT WAS THAT?!", "Surprise!!", "Nobody expected that.", "Plot twist.", "Wild."];
const COMBO_MESSAGES   = ["COMBO KING!", "ON FIRE!", "CAN'T STOP!", "UNSTOPPABLE!", "LEGENDARY!"];

/* ── Dynamic subtitle ───────────────────────────────────── */
const IDLE_SUBTITLES = ["Tap to toot.", "The world needs this.", "Are you afraid?", "Don't be shy.", "Science."];
let   idleIdx = 0;
function nextIdleSubtitle() { return IDLE_SUBTITLES[idleIdx++ % IDLE_SUBTITLES.length]; }

export default function Home() {
  const [, setLocation] = useLocation();
  const { settings, update, randomize, reset } = useCushionSettings();
  const { settings: parental, update: updateParental } = useParentalSettings();
  const { imageUrl, saveImage, clearImage } = useCustomImage();
  const { recordings, selectedId: selectedSoundId, selectedUrl: selectedSoundUrl, saveRecording, deleteRecording, selectSound } = useCustomSounds();

  const [panelOpen, setPanelOpen]       = useState(false);
  const [parentalOpen, setParentalOpen] = useState(false);
  const [message, setMessage]           = useState<string | null>(null);
  const [msgKey, setMsgKey]             = useState(0);
  const [subtitle, setSubtitle]         = useState(nextIdleSubtitle);

  /* ── Sommelier ─────────────────────────────────────── */
  const [sommelierVisible, setSommelierVisible] = useState(false);
  const [sommelierLoading, setSommelierLoading] = useState(false);
  const [review, setReview]                     = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Combo system ──────────────────────────────────── */
  const [combo, setCombo]           = useState(0);
  const [totalToots, setTotalToots] = useState(0);
  const [highCombo, setHighCombo]   = useState(() => parseInt(localStorage.getItem("tm3k-high-combo") ?? "0"));
  const lastFartRef   = useRef(0);
  const comboResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cushionScale, setCushionScale] = useState(1);

  /* ── Reactive glow ─────────────────────────────────── */
  const glowPx = Math.min(4 + combo * 9, 100);
  const glowAlpha = Math.round(Math.min(0.85, 0.15 + combo * 0.055) * 255).toString(16).padStart(2, "0");
  const cushionGlow = combo > 0
    ? `drop-shadow(0 0 ${glowPx}px ${settings.color}${glowAlpha})`
    : undefined;

  useEffect(() => { document.title = "The Toot Master 3000"; }, []);

  /* ── Timer cleanup on unmount ───────────────────────── */
  useEffect(() => () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (comboResetRef.current)   clearTimeout(comboResetRef.current);
  }, []);

  /* ── Subtitle rotation ─────────────────────────────── */
  useEffect(() => {
    if (combo >= 15) { setSubtitle("ULTRA DESTROYER"); return; }
    if (combo >= 8)  { setSubtitle("MEGA RIPPER");     return; }
    if (combo >= 3)  { setSubtitle("Keep going!");      return; }
  }, [combo]);

  useEffect(() => {
    if (combo > 0) return;
    const id = setTimeout(() => setSubtitle(nextIdleSubtitle()), 3500);
    return () => clearTimeout(id);
  }, [combo, totalToots]);

  /* ── Ref mirrors mute state so callbacks stay stable ── */
  const muteSommelierRef = useRef(parental.muteSommelier);
  useEffect(() => { muteSommelierRef.current = parental.muteSommelier; }, [parental.muteSommelier]);

  /* ── Sommelier fetch ──────────────────────────────────
     Dismiss timing:
       • Muted  → 9 s after text arrives (no speech to wait for)
       • Voiced → 40 s safety-net fallback; real dismiss comes via
                  handleSpeechEnd once the browser finishes speaking     */
  const fetchReview = useCallback(async (soundPrompt: string, isSurprise: boolean) => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setSommelierVisible(true);
    setSommelierLoading(true);
    setReview(null);
    try {
      const res  = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soundPrompt, isSurprise }) });
      const data = await res.json();
      setReview(data.review ?? "Magnificent. Simply... magnificent.");
    } catch {
      setReview("I am quite simply overwhelmed. A perfect ten, no notes.");
    } finally {
      setSommelierLoading(false);
      const fallbackMs = muteSommelierRef.current ? 9_000 : 40_000;
      dismissTimerRef.current = setTimeout(() => setSommelierVisible(false), fallbackMs);
    }
  }, []);

  /* ── Called by SommelierCharacter once TTS finishes speaking ─
     Clears the long fallback and schedules a tidy 1.5 s grace pause  */
  const handleSpeechEnd = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setSommelierVisible(false), 1500);
  }, []);

  /* ── Combo side-effects (reactive to combo state) ─── */
  useEffect(() => {
    if (combo <= 0) { setCushionScale(1); return; }

    /* High score */
    if (combo > highCombo) {
      const next = combo;
      setHighCombo(next);
      localStorage.setItem("tm3k-high-combo", String(next));
    }

    /* Milestone every 10 hits */
    if (combo % 10 === 0) {
      const shapes = ["⚡", "💥", "🔥"].map((e) => confetti.shapeFromText({ text: e, scalar: 2 }));
      confetti({ particleCount: 130, shapes, scalar: 2, spread: 150, startVelocity: 42, origin: { x: 0.5, y: 0.5 }, gravity: 0.75, ticks: 210 });
      setMessage(COMBO_MESSAGES[Math.floor(Math.random() * COMBO_MESSAGES.length)]);
      setMsgKey((k) => k + 1);
      setCushionScale(1.22);
      setTimeout(() => setCushionScale(1 + Math.min(combo * 0.018, 0.22)), 155);
    } else {
      setCushionScale(1 + Math.min(combo * 0.018, 0.22));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo]);

  /* ── Core fart handler — stable, no stale combo closure ── */
  const handleFart = useCallback((isSurprise: boolean, soundPrompt: string) => {
    const now = Date.now();
    const gap = now - lastFartRef.current;
    lastFartRef.current = now;

    /* Advance or start combo — threshold generous enough for touch + test latency */
    if (comboResetRef.current) clearTimeout(comboResetRef.current);
    setCombo((prev) => (gap < 2000 ? prev + 1 : 1));
    comboResetRef.current = setTimeout(() => {
      setCombo(0);
      setCushionScale(1);
    }, 2200);

    setTotalToots((n) => n + 1);

    /* Fart reaction message */
    const pool = isSurprise ? SURPRISE_MESSAGES : FART_MESSAGES;
    setMessage(pool[Math.floor(Math.random() * pool.length)]);
    setMsgKey((k) => k + 1);

    if (parental.enableSommelier) fetchReview(soundPrompt, isSurprise);
  }, [fetchReview, parental.enableSommelier]);

  const handleDismissSommelier = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setSommelierVisible(false);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => { await saveImage(file); }, [saveImage]);
  const handleImageClear  = useCallback(async () => { await clearImage(); },             [clearImage]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 30% 20%, #1f0b3a 0%, #0d1117 55%, #071428 100%)" }}
    >
      <Stars />

      {/* Combo HUD — corner, never blocks the cushion */}
      <ComboCounter combo={combo} highCombo={highCombo} totalToots={totalToots} cushionColor={settings.color} />

      {/* ── Top bar ─────────────────────────────────── */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2 gap-2">
        {/* Left: title + dynamic subtitle */}
        <div className="min-w-0">
          <h1
            className="text-base font-black tracking-tight leading-none"
            style={{ color: settings.color, textShadow: `0 0 18px ${settings.color}66` }}
            data-testid="text-app-title"
          >
            Toot Master 3000
          </h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={subtitle}
              className="text-[10px] mt-0.5 font-semibold truncate"
              style={{ color: combo >= 3 ? settings.color : "rgba(255,255,255,0.28)" }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {subtitle}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Right: compact nav icons + make it weirder */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Battle — icon only */}
          <button
            onClick={() => setLocation("/battle")}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-108 active:scale-95"
            style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.28)", color: "#facc15" }}
            title="Fart Battle"
            data-testid="button-battle-mode"
          >
            <Swords className="w-3.5 h-3.5" />
          </button>

          {/* Sneak Attack — icon only */}
          <button
            onClick={() => setLocation("/sneak-attack")}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-108 active:scale-95"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171" }}
            title="Sneak Attack"
            data-testid="button-sneak-attack"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Make it Weirder — icon + short label */}
          <motion.button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black"
            style={{
              background: `linear-gradient(135deg, ${settings.color}24, ${settings.color}12)`,
              border: `1.5px solid ${settings.color}55`,
              color: settings.color,
            }}
            animate={{ boxShadow: [`0 0 4px ${settings.color}22`, `0 0 14px ${settings.color}55`, `0 0 4px ${settings.color}22`] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            data-testid="button-open-builder"
          >
            <Wand2 className="w-3 h-3 flex-shrink-0" />
            Weirdify
          </motion.button>
        </div>
      </header>

      {/* ── Main cushion area ────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center min-h-0 overflow-hidden">

        {/* Reaction message */}
        <div className="absolute top-1 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <AnimatePresence mode="wait">
            {message && (
              <motion.span
                key={msgKey}
                className="text-sm font-black tracking-wide px-4 py-1 rounded-full"
                style={{
                  color: settings.color,
                  background: `${settings.color}18`,
                  border: `1px solid ${settings.color}30`,
                  textShadow: `0 0 12px ${settings.color}80`,
                }}
                initial={{ opacity: 0, y: 10, scale: 0.88 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit  ={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                data-testid="text-fart-message"
              >
                {message}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Cushion — inflates with combo + reactive glow */}
        <motion.div
          animate={{ scale: cushionScale }}
          transition={{ type: "spring", stiffness: 250, damping: 18 }}
          style={{
            width:  "min(85vw, calc(100vh - 80px))",
            height: "min(85vw, calc(100vh - 80px))",
            filter: cushionGlow,
            transition: "filter 0.35s ease",
          }}
        >
          <WhoopyCushion
            settings={settings}
            onFart={handleFart}
            masterVolume={parental.masterVolume}
            allowSurprise={parental.allowSurprise}
            customImageUrl={imageUrl}
            selectedSoundUrl={selectedSoundUrl}
          />
        </motion.div>

        {/* ── Bottom strip ─── two clean rows ── */}
        <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 z-20 px-4">
          {/* Row 1: Utility */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={randomize}
              className="gap-1 text-xs h-7 px-3"
              style={{ color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)" }}
              data-testid="button-randomize-main">
              <Shuffle className="w-3 h-3" /> Randomize
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}
              className="gap-1 text-xs h-7 px-3"
              style={{ color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)" }}
              data-testid="button-reset-main">
              <RotateCcw className="w-3 h-3" /> Classic
            </Button>
          </div>
          {/* Row 2: Fun extras */}
          <div className="flex gap-2">
            <PullMyFinger masterVolume={parental.masterVolume} />
            <ForeverTootButton masterVolume={parental.masterVolume} selectedSoundUrl={selectedSoundUrl} />
          </div>
        </div>
      </main>

      {/* ── Panels / overlays ───────────────────────── */}
      <BuilderPanel
        open={panelOpen} onClose={() => setPanelOpen(false)}
        settings={settings} onUpdate={update}
        onRandomize={() => { randomize(); setPanelOpen(false); }}
        onReset={() => { reset(); setPanelOpen(false); }}
        customImageUrl={imageUrl} onImageUpload={handleImageUpload} onImageClear={handleImageClear}
        recordings={recordings} selectedSoundId={selectedSoundId}
        masterVolume={parental.masterVolume} onSaveRecording={saveRecording}
        onDeleteRecording={deleteRecording} onSelectSound={selectSound}
      />

      <SommelierCharacter
        visible={sommelierVisible} loading={sommelierLoading}
        review={review} onDismiss={handleDismissSommelier}
        muteSommelier={parental.muteSommelier}
        onSpeechEnd={handleSpeechEnd}
      />

      {/* Parental gear — subtle fixed icon */}
      <button
        onClick={() => setParentalOpen(true)}
        className="fixed bottom-4 left-12 z-20 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300"
        style={{ color: "rgba(255,255,255,0.13)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.13)")}
        data-testid="button-parental-settings"
        title="Parental Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      <NukeButton masterVolume={parental.masterVolume} />

      <ParentalSettings
        open={parentalOpen} settings={parental}
        onUpdate={updateParental} onClose={() => setParentalOpen(false)}
      />
    </div>
  );
}

/* ── Animated star field ─────────────────────────────── */
const STAR_COUNT = 55;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  r: 0.5 + Math.random() * 1.2,
  delay: Math.random() * 4,
  dur: 2.5 + Math.random() * 3,
}));

function Stars() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
            opacity: 0.12 + Math.random() * 0.22,
            animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes starTwinkle {
          0%,100% { opacity:0.08; transform:scale(1);   }
          50%     { opacity:0.45; transform:scale(1.5); }
        }
      `}</style>
    </div>
  );
}
