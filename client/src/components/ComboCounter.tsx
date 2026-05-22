import { motion, AnimatePresence } from "framer-motion";

interface Props {
  combo: number;
  highCombo: number;
  totalToots: number;
  cushionColor: string;
}

export function ComboCounter({ combo, highCombo, totalToots, cushionColor }: Props) {
  const isUltra = combo >= 15;
  const isMega  = combo >= 8;
  const isActive = combo >= 2;

  const label    = isUltra ? "ULTRA TOOT" : isMega ? "MEGA TOOT" : "COMBO";
  const bolts    = isUltra ? "⚡⚡⚡" : isMega ? "⚡⚡" : "⚡";
  const numColor = isUltra ? "#ff3333" : isMega ? "#ff8800" : cushionColor;
  const numSize  = Math.min(54, 22 + combo * 2.2);

  return (
    /* Corner HUD — top-right, never blocks the cushion */
    <div className="fixed top-16 right-2 z-40 pointer-events-none select-none flex flex-col items-end gap-0.5">

      {/* ── Live combo panel ── */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="hud"
            className="flex flex-col items-end"
            initial={{ opacity: 0, x: 24, scale: 0.75 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit  ={{ opacity: 0, x: 24, scale: 0.75, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 440, damping: 26 }}
          >
            {/* Label */}
            <div
              className="text-[9px] font-black tracking-[0.22em] uppercase leading-none mb-0.5"
              style={{ color: numColor, textShadow: `0 0 10px ${numColor}88` }}
            >
              {bolts} {label}
            </div>

            {/* Number — bursts bigger on each new hit */}
            <motion.div
              key={combo}
              className="font-black tabular-nums leading-none"
              style={{
                fontSize: numSize,
                color: numColor,
                textShadow: `0 0 24px ${numColor}99, 0 0 48px ${numColor}44`,
              }}
              initial={{ scale: 1.55, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              transition={{ duration: 0.11, ease: "easeOut" }}
              data-testid="text-combo-count"
            >
              x{combo}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Persistent stats ── */}
      <div className="flex flex-col items-end gap-0 mt-1">
        {highCombo >= 3 && (
          <div
            className="text-[9px] font-semibold leading-none"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            best x{highCombo}
          </div>
        )}
        {totalToots >= 5 && (
          <div
            className="text-[9px] leading-none mt-0.5"
            style={{ color: "rgba(255,255,255,0.14)" }}
          >
            {totalToots} toots
          </div>
        )}
      </div>
    </div>
  );
}
