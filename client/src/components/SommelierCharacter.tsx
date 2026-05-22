import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  visible: boolean;
  loading: boolean;
  review: string | null;
  onDismiss: () => void;
  muteSommelier: boolean;
  onSpeechEnd?: () => void;
}

/* ── Speech synthesis helpers ──────────────────────────────── */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang.startsWith("en-GB")) ||
    voices.find((v) => v.name.toLowerCase().includes("british")) ||
    voices.find((v) => v.name.toLowerCase().includes("uk")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null
  );
}

function speakText(
  text: string,
  onStart: () => void,
  onEnd: () => void,
) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  function doSpeak() {
    const utter = new SpeechSynthesisUtterance(text);
    utter.pitch = 0.4;
    utter.rate = 0.8;
    const voice = getBestVoice();
    if (voice) utter.voice = voice;
    utter.onstart = onStart;
    utter.onend = onEnd;
    utter.onerror = onEnd;
    window.speechSynthesis.speak(utter);
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
  }
}

/* ── Thinking dots ─────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Sommelier SVG character ───────────────────────────────── */
function SommelierSVG({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <svg
      viewBox="-12 0 124 128"
      xmlns="http://www.w3.org/2000/svg"
      width="95"
      height="117"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* TOP HAT */}
      <rect x="17" y="29" width="66" height="6" rx="3" fill="#0f1623" />
      <rect x="24" y="6" width="52" height="25" rx="5" fill="#0f1623" />
      <rect x="24" y="27" width="52" height="5" fill="#C8A84B" />
      <rect x="28" y="9" width="8" height="18" rx="4" fill="rgba(255,255,255,0.07)" />

      {/* HEAD */}
      <circle cx="50" cy="54" r="24" fill="#F5C5A3" />
      <ellipse cx="33" cy="60" rx="7" ry="5" fill="#F08080" fillOpacity="0.35" />
      <ellipse cx="67" cy="60" rx="7" ry="5" fill="#F08080" fillOpacity="0.35" />

      {/* Snooty eyebrows */}
      <path d="M34,43 Q40,40 46,42" stroke="#8B6045" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M54,42 Q60,40 66,43" stroke="#8B6045" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="41" cy="50" r="4.5" fill="#2a2a2a" />
      <circle cx="59" cy="50" r="4.5" fill="#2a2a2a" />
      <circle cx="42.8" cy="48.2" r="1.6" fill="white" />
      <circle cx="60.8" cy="48.2" r="1.6" fill="white" />

      {/* Monocle */}
      <circle cx="59" cy="50" r="8" fill="none" stroke="#C8A84B" strokeWidth="1.8" />
      <path d="M66,56 Q70,61 69,68" stroke="#C8A84B" strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <ellipse cx="50" cy="57" rx="3.5" ry="2.8" fill="#E8A070" />

      {/* Mouth — opens while speaking */}
      {isSpeaking ? (
        <ellipse cx="50" cy="67" rx="5" ry="3.5" fill="#8B6045" />
      ) : (
        <path
          d="M36,65 Q40,70 44,66 Q47,68 50,66 Q53,68 56,66 Q60,70 64,65"
          stroke="#8B6045" strokeWidth="2.5" fill="none" strokeLinecap="round"
        />
      )}

      {/* NECK */}
      <rect x="44" y="76" width="12" height="10" rx="3" fill="#F5C5A3" />

      {/* TUXEDO BODY */}
      <path d="M 8,128 L 10,84 Q 15,76 44,76 L 50,85 L 56,76 Q 85,76 90,84 L 92,128 Z" fill="#0f1623" />
      <path d="M 44,76 L 50,85 L 56,76 L 53,128 L 47,128 Z" fill="white" />
      <circle cx="50" cy="95" r="1.6" fill="#D4D4D4" />
      <circle cx="50" cy="103" r="1.6" fill="#D4D4D4" />
      <circle cx="50" cy="111" r="1.6" fill="#D4D4D4" />
      <path d="M 44,78 L 50,83 L 56,78 L 50,73 Z" fill="#E8445A" />
      <path d="M 44,76 L 18,90 L 18,76 Z" fill="white" fillOpacity="0.88" />
      <path d="M 56,76 L 82,90 L 82,76 Z" fill="white" fillOpacity="0.88" />

      {/* LEFT ARM + NAPKIN */}
      <path d="M 10,88 Q 2,96 4,108" stroke="#0f1623" strokeWidth="13" strokeLinecap="round" fill="none" />
      <circle cx="4" cy="108" r="7" fill="#F5C5A3" />
      <path d="M 2,92 Q -6,100 -2,113 Q 4,120 11,114 Q 10,100 2,92 Z" fill="white" stroke="#E4E4E4" strokeWidth="1.2" />
      <path d="M 1,95 Q 4,103 3,112" stroke="#DEDEDE" strokeWidth="0.8" fill="none" />
      <path d="M 5,93 Q 7,102 6,111" stroke="#DEDEDE" strokeWidth="0.6" fill="none" />

      {/* RIGHT ARM + TASTING PLATE */}
      <path d="M 90,88 Q 98,96 96,106" stroke="#0f1623" strokeWidth="13" strokeLinecap="round" fill="none" />
      <circle cx="96" cy="106" r="7" fill="#F5C5A3" />
      <ellipse cx="96" cy="101" rx="9" ry="4" fill="white" fillOpacity="0.9" />
      <ellipse cx="96" cy="101" rx="7" ry="3" fill="none" stroke="#E0E0E0" strokeWidth="1" />
    </svg>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function SommelierCharacter({ visible, loading, review, onDismiss, muteSommelier, onSpeechEnd }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  /* ── Trigger speech when review arrives ── */
  useEffect(() => {
    if (!review || muteSommelier || !visible) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    speakText(
      review,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        onSpeechEnd?.();
      },
    );

    return () => {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    };
  }, [review, muteSommelier, visible, onSpeechEnd]);

  /* ── Cancel speech when hidden/dismissed ── */
  useEffect(() => {
    if (!visible) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 right-4 z-30 flex items-end gap-2 pointer-events-none"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          data-testid="sommelier-container"
        >
          {/* Speech bubble */}
          <motion.div
            className="relative pointer-events-auto"
            initial={{ opacity: 0, scale: 0.85, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 24 }}
            style={{ maxWidth: 260 }}
          >
            <div
              className="relative rounded-2xl px-4 py-3 shadow-xl"
              style={{
                background: "linear-gradient(135deg, #fffef9 0%, #f9f6ee 100%)",
                border: "1.5px solid rgba(200,168,75,0.4)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(200,168,75,0.15)",
              }}
            >
              {/* Dismiss */}
              <button
                onClick={onDismiss}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center hover-elevate"
                data-testid="button-dismiss-sommelier"
              >
                <X className="w-3 h-3 text-white" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-black tracking-widest uppercase" style={{ color: "#C8A84B" }}>
                  The Sommelier
                </span>
                <span className="text-xs" style={{ color: "#C8A84B" }}>★★★★★</span>
                {isSpeaking && (
                  <motion.span
                    className="ml-auto text-xs"
                    style={{ color: "#C8A84B" }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    data-testid="status-speaking"
                    title="Sommelier is speaking"
                  >
                    ♪
                  </motion.span>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <ThinkingDots />
              ) : (
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: "#2D2416", fontFamily: "Georgia, serif" }}
                  data-testid="text-sommelier-review"
                >
                  {review}
                </p>
              )}

              {/* Bubble tail */}
              <div
                className="absolute bottom-3 -right-3"
                style={{
                  width: 0, height: 0,
                  borderTop: "10px solid transparent",
                  borderBottom: "10px solid transparent",
                  borderLeft: "14px solid #f9f6ee",
                  filter: "drop-shadow(2px 0 1px rgba(200,168,75,0.3))",
                }}
              />
            </div>
          </motion.div>

          {/* Character */}
          <motion.div
            className="flex-shrink-0"
            animate={{ rotate: [0, -2, 2, -1, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <SommelierSVG isSpeaking={isSpeaking} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
