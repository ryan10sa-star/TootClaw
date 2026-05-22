import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Zap, BrainCircuit, Lock, MicOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { type ParentalSettings } from "../hooks/useParentalSettings";

/* ── Math gate problem generator ── */
interface Problem {
  label: string;
  answer: number;
}
function makeProblem(): Problem {
  const a = Math.floor(Math.random() * 11) + 2;
  const b = Math.floor(Math.random() * 11) + 2;
  const useAdd = Math.random() > 0.4;
  if (useAdd) {
    return { label: `${a} + ${b}`, answer: a + b };
  }
  const big = Math.max(a, b), small = Math.min(a, b);
  return { label: `${big} - ${small}`, answer: big - small };
}

/* ── Math gate screen ── */
function MathGate({ onUnlock }: { onUnlock: () => void }) {
  const [problem] = useState<Problem>(makeProblem);
  const [input, setInput] = useState("");
  const [shaking, setShaking] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit() {
    const val = parseInt(input.trim(), 10);
    if (!isNaN(val) && val === problem.answer) {
      onUnlock();
    } else {
      setWrongCount((n) => n + 1);
      setShaking(true);
      setInput("");
      setTimeout(() => { setShaking(false); inputRef.current?.focus(); }, 500);
    }
  }

  const snarks = [
    "Nice try, kid.",
    "That's not right. Ask a grown-up.",
    "Still no. Maybe use your fingers.",
    "Nope! Put down the tablet.",
    "Wrong again. Impressive persistence.",
  ];
  const snark = wrongCount > 0 ? snarks[Math.min(wrongCount - 1, snarks.length - 1)] : null;

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-8" style={{ maxWidth: 340 }}>
      {/* Lock icon */}
      <motion.div
        className="flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)" }}
        animate={shaking ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.45 }}
      >
        <Lock className="w-7 h-7 text-white/50" />
      </motion.div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">Parental Settings</h2>
        <p className="text-white/40 text-sm mt-1">Prove you're not a kid to continue.</p>
      </div>

      {/* Math problem */}
      <div
        className="flex flex-col items-center gap-2 w-full px-6 py-5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-white/40 text-xs tracking-widest uppercase">What is...</p>
        <p
          className="font-black text-white"
          style={{ fontSize: 42, fontFamily: "monospace", letterSpacing: 2 }}
          data-testid="text-math-problem"
        >
          {problem.label} = ?
        </p>

        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your answer"
          className="mt-2 w-full text-center rounded-xl px-4 py-3 font-black text-xl text-white outline-none"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            fontFamily: "monospace",
          }}
          data-testid="input-math-answer"
        />

        {/* Wrong answer snark */}
        <AnimatePresence>
          {snark && (
            <motion.p
              className="text-red-400 text-sm text-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              data-testid="text-math-wrong"
            >
              {snark}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        onClick={submit}
        className="w-full py-4 rounded-2xl font-black tracking-widest uppercase text-white"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1e4a8a 100%)",
          border: "1.5px solid rgba(59,130,246,0.35)",
          fontSize: 15,
          boxShadow: "0 4px 20px rgba(59,130,246,0.2)",
        }}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        data-testid="button-math-submit"
      >
        Unlock
      </motion.button>
    </div>
  );
}

/* ── Settings row ── */
function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">{label}</p>
        <p className="text-white/40 text-xs mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* ── Dashboard screen ── */
function Dashboard({
  settings,
  onUpdate,
  onClose,
}: {
  settings: ParentalSettings;
  onUpdate: (patch: Partial<ParentalSettings>) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 px-6 py-8 w-full" style={{ maxWidth: 420 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Parental Settings</h2>
          <p className="text-white/35 text-sm mt-1">Kid-proof controls for grown-ups.</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mt-0.5"
          data-testid="button-close-parental"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Master Volume */}
        <SettingRow
          icon={<Volume2 className="w-5 h-5 text-blue-300" />}
          label="Master Volume"
          description={`Caps the max volume. Currently: ${settings.masterVolume}%`}
        >
          <span className="text-white/60 text-sm font-mono w-8 text-right">{settings.masterVolume}%</span>
        </SettingRow>
        {/* Volume slider lives outside the row for full-width control */}
        <div className="px-4">
          <Slider
            min={10}
            max={100}
            step={5}
            value={[settings.masterVolume]}
            onValueChange={([v]) => onUpdate({ masterVolume: v })}
            className="w-full"
            data-testid="slider-master-volume"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-white/20 text-xs">10%</span>
            <span className="text-white/20 text-xs">100%</span>
          </div>
        </div>

        {/* Allow Surprise Noises */}
        <SettingRow
          icon={<Zap className="w-5 h-5 text-yellow-300" />}
          label="Surprise Noises"
          description="Enables random T-Rex roars, dog barks, and other unexpected sounds."
        >
          <Switch
            checked={settings.allowSurprise}
            onCheckedChange={(v) => onUpdate({ allowSurprise: v })}
            data-testid="toggle-allow-surprise"
          />
        </SettingRow>

        {/* Enable Sommelier */}
        <SettingRow
          icon={<BrainCircuit className="w-5 h-5 text-purple-300" />}
          label="Fart Sommelier (AI)"
          description="Enables the Gemini AI sommelier reviews after each toot. Disabling saves API usage."
        >
          <Switch
            checked={settings.enableSommelier}
            onCheckedChange={(v) => onUpdate({ enableSommelier: v })}
            data-testid="toggle-enable-sommelier"
          />
        </SettingRow>

        {/* Mute Sommelier Voice */}
        <SettingRow
          icon={<MicOff className="w-5 h-5 text-rose-300" />}
          label="Mute Sommelier Voice"
          description="Silences the snooty British text-to-speech voice. Reviews still display on screen."
        >
          <Switch
            checked={settings.muteSommelier}
            onCheckedChange={(v) => onUpdate({ muteSommelier: v })}
            data-testid="toggle-mute-sommelier"
          />
        </SettingRow>
      </div>

      <div
        className="px-4 py-3 rounded-xl text-xs text-white/25 leading-relaxed"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        All settings saved automatically. Tap anywhere outside to close.
      </div>
    </div>
  );
}

/* ── Main ParentalSettings modal ── */
interface Props {
  open: boolean;
  settings: ParentalSettings;
  onUpdate: (patch: Partial<ParentalSettings>) => void;
  onClose: () => void;
}

export function ParentalSettings({ open, settings, onUpdate, onClose }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  function handleClose() {
    setUnlocked(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full flex flex-col items-center overflow-y-auto"
              style={{
                maxWidth: 520,
                maxHeight: "90vh",
                background: "linear-gradient(180deg, #12091f 0%, #0a0612 100%)",
                borderTop: "1.5px solid rgba(255,255,255,0.08)",
                borderLeft: "1.5px solid rgba(255,255,255,0.06)",
                borderRight: "1.5px solid rgba(255,255,255,0.06)",
                borderRadius: "28px 28px 0 0",
                boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
              }}
              data-testid="parental-settings-panel"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/15 mt-3 mb-1 flex-shrink-0" />

              <AnimatePresence mode="wait">
                {!unlocked ? (
                  <motion.div
                    key="gate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full flex justify-center"
                  >
                    <MathGate onUnlock={() => setUnlocked(true)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <Dashboard settings={settings} onUpdate={onUpdate} onClose={handleClose} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
