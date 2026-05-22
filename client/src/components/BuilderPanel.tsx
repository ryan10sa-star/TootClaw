import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, RotateCcw, Settings2, Upload, Camera, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CushionSettings, CushionShape, CushionDecal,
  COLOR_PALETTE, SHAPES, DECALS,
} from "../hooks/useCushionSettings";
import { RecorderSection } from "./RecorderSection";
import { CustomRecording } from "../hooks/useCustomSounds";

interface Props {
  open          : boolean;
  onClose       : () => void;
  settings      : CushionSettings;
  onUpdate      : (partial: Partial<CushionSettings>) => void;
  onRandomize   : () => void;
  onReset       : () => void;
  customImageUrl: string | null;
  onImageUpload : (file: File) => void;
  onImageClear  : () => void;
  /* Sound recording */
  recordings       : CustomRecording[];
  selectedSoundId  : string | null;
  masterVolume     : number;
  onSaveRecording  : (blob: Blob, label: string) => void;
  onDeleteRecording: (id: string) => void;
  onSelectSound    : (id: string | null) => void;
}

type DecalTab = "defaults" | "upload" | "camera";

/* ── Shape icons ── */
const SHAPE_ICONS: Record<CushionShape, JSX.Element> = {
  round: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="10" ry="9" />
    </svg>
  ),
  square: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" />
    </svg>
  ),
};

/* ── Decal previews ── */
const DECAL_PREVIEWS: Record<Exclude<CushionDecal, "image">, JSX.Element> = {
  none: (
    <svg viewBox="0 0 48 48" width="38" height="38">
      <circle cx="24" cy="24" r="22" fill="#1a1a2e" />
      <line x1="14" y1="14" x2="34" y2="34" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="14" x2="14" y2="34" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  classic: (
    <svg viewBox="0 0 48 48" width="38" height="38">
      <circle cx="24" cy="24" r="22" fill="#E8445A" />
      <polygon points="24,6 26.5,16 37,16 28.8,22.5 31.5,33 24,27 16.5,33 19.2,22.5 11,16 21.5,16" fill="#FFD93D" />
      <text x="24" y="29" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="Impact,sans-serif" fill="#8B0000">TOOT!</text>
    </svg>
  ),
  skull: (
    <svg viewBox="0 0 48 48" width="38" height="38">
      <circle cx="24" cy="24" r="22" fill="#333" />
      <ellipse cx="24" cy="22" rx="10" ry="10" fill="white" />
      <rect x="17" y="29" width="14" height="7" rx="3" fill="white" />
      <circle cx="20" cy="21" r="2.8" fill="#333" />
      <circle cx="28" cy="21" r="2.8" fill="#333" />
      <rect x="19" y="29" width="3" height="7" fill="#333" />
      <rect x="23" y="29" width="3" height="7" fill="#333" />
      <rect x="27" y="29" width="3" height="7" fill="#333" />
      <line x1="14" y1="40" x2="34" y2="44" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="44" x2="34" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  smiley: (
    <svg viewBox="0 0 48 48" width="38" height="38">
      <circle cx="24" cy="24" r="22" fill="#1a1a2e" />
      <circle cx="24" cy="24" r="16" fill="#FFD93D" />
      <circle cx="19" cy="21" r="2.5" fill="#333" />
      <circle cx="29" cy="21" r="2.5" fill="#333" />
      <path d="M17,29 Q24,36 31,29" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  dino: (
    <svg viewBox="0 0 48 48" width="38" height="38">
      <circle cx="24" cy="24" r="22" fill="#1a3a1a" />
      <ellipse cx="22" cy="27" rx="9" ry="7" fill="#6BCB77" />
      <ellipse cx="32" cy="19" rx="7" ry="6" fill="#6BCB77" />
      <polygon points="38,22 43,19 43,24" fill="#6BCB77" />
      <circle cx="35" cy="17" r="2" fill="#1a1a1a" />
      <path d="M10,30 Q4,33 3,28 Q8,26 10,30 Z" fill="#6BCB77" />
    </svg>
  ),
};

/* ── File input helper ── */
function FileInputZone({
  accept, capture, icon, label, sublabel, onFile,
}: {
  accept: string;
  capture?: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { onFile(file); e.target.value = ""; }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        {...(capture ? { capture: capture as "user" | "environment" } : {})}
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <motion.button
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center gap-3 py-7 rounded-2xl border-2 border-dashed"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.6)",
        }}
        whileHover={{ borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.06)" }}
        whileTap={{ scale: 0.98 }}
        data-testid={`button-${capture ? "camera" : "upload"}-file`}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}>
          {icon}
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{sublabel}</p>
        </div>
      </motion.button>
    </>
  );
}

/* ── Main BuilderPanel ── */
export function BuilderPanel({
  open, onClose, settings, onUpdate, onRandomize, onReset,
  customImageUrl, onImageUpload, onImageClear,
  recordings, selectedSoundId, masterVolume,
  onSaveRecording, onDeleteRecording, onSelectSound,
}: Props) {
  const [decalTab, setDecalTab] = useState<DecalTab>("defaults");

  function handleFile(file: File) {
    onImageUpload(file);
    onUpdate({ decal: "image" });
  }

  function handleClearImage() {
    onImageClear();
    onUpdate({ decal: "classic" });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="builder-backdrop"
          />

          {/* Panel slides from right */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 320,
              background: "linear-gradient(180deg, #16102a 0%, #0e0a1e 100%)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            data-testid="builder-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-white/50" />
                <span className="text-white font-semibold text-sm tracking-wide">Customise Cushion</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white p-1 rounded-md transition-colors"
                data-testid="button-close-builder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* COLOR */}
              <section>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => onUpdate({ color: c.value })}
                      title={c.name}
                      data-testid={`color-swatch-${c.name.toLowerCase().replace(/ /g, "-")}`}
                      className="relative rounded-xl aspect-square transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: c.value, boxShadow: settings.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : "none" }}
                    >
                      {settings.color === c.value && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="2" />
                            <circle cx="7" cy="7" r="3" fill="white" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* SHAPE */}
              <section>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                  Shape
                </label>
                <div className="flex gap-2">
                  {SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onUpdate({ shape: s.id })}
                      data-testid={`shape-${s.id}`}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all hover:scale-105 active:scale-95"
                      style={{
                        borderColor: settings.shape === s.id ? settings.color : "rgba(255,255,255,0.08)",
                        background:  settings.shape === s.id ? `${settings.color}20` : "rgba(255,255,255,0.03)",
                        color:       settings.shape === s.id ? settings.color : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {SHAPE_ICONS[s.id]}
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* DECAL & TEXTURE */}
              <section>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                  Decal & Texture
                </label>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {(["defaults", "upload", "camera"] as DecalTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDecalTab(tab)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={{
                        background: decalTab === tab ? "rgba(255,255,255,0.12)" : "transparent",
                        color:      decalTab === tab ? "white" : "rgba(255,255,255,0.35)",
                      }}
                      data-testid={`tab-decal-${tab}`}
                    >
                      {tab === "defaults" ? "Designs" : tab === "upload" ? "Upload" : "Camera"}
                    </button>
                  ))}
                </div>

                {/* Defaults tab */}
                {decalTab === "defaults" && (
                  <div className="grid grid-cols-3 gap-2">
                    {DECALS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onUpdate({ decal: d.id });
                          if (d.id !== "image") onImageClear();
                        }}
                        data-testid={`decal-${d.id}`}
                        className="flex flex-col items-center gap-2 py-3 px-1 rounded-xl border transition-all hover:scale-105 active:scale-95"
                        style={{
                          borderColor: settings.decal === d.id ? settings.color : "rgba(255,255,255,0.08)",
                          background:  settings.decal === d.id ? `${settings.color}20` : "rgba(255,255,255,0.03)",
                        }}
                      >
                        {DECAL_PREVIEWS[d.id as keyof typeof DECAL_PREVIEWS]}
                        <span
                          className="text-xs font-medium"
                          style={{ color: settings.decal === d.id ? settings.color : "rgba(255,255,255,0.4)" }}
                        >
                          {d.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Upload tab */}
                {decalTab === "upload" && (
                  <div className="space-y-3">
                    <FileInputZone
                      accept="image/*"
                      icon={<Upload className="w-6 h-6 text-white/60" />}
                      label="Upload from Gallery"
                      sublabel="JPG, PNG, GIF, WEBP"
                      onFile={handleFile}
                    />
                    {customImageUrl && settings.decal === "image" && (
                      <ImagePreview url={customImageUrl} onClear={handleClearImage} />
                    )}
                  </div>
                )}

                {/* Camera tab */}
                {decalTab === "camera" && (
                  <div className="space-y-3">
                    <FileInputZone
                      accept="image/*"
                      capture="environment"
                      icon={<Camera className="w-6 h-6 text-white/60" />}
                      label="Take a Photo"
                      sublabel="Opens your device camera"
                      onFile={handleFile}
                    />
                    {customImageUrl && settings.decal === "image" && (
                      <ImagePreview url={customImageUrl} onClear={handleClearImage} />
                    )}
                  </div>
                )}

                {/* Active image indicator (shown in any tab) */}
                {settings.decal === "image" && customImageUrl && decalTab === "defaults" && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: `${settings.color}15`, border: `1px solid ${settings.color}30` }}>
                    <ImagePlus className="w-4 h-4 flex-shrink-0" style={{ color: settings.color }} />
                    <span className="text-xs flex-1" style={{ color: settings.color }}>Custom photo active</span>
                    <button
                      onClick={handleClearImage}
                      className="text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: `${settings.color}25`, color: settings.color }}
                      data-testid="button-clear-image"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </section>

              {/* RECORD YOUR OWN */}
              <RecorderSection
                recordings={recordings}
                selectedId={selectedSoundId}
                accentColor={settings.color}
                masterVolume={masterVolume}
                onSaveRecording={onSaveRecording}
                onDeleteRecording={onDeleteRecording}
                onSelectSound={onSelectSound}
              />
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 flex-shrink-0 space-y-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <Button
                onClick={onRandomize}
                className="w-full gap-2"
                variant="secondary"
                data-testid="button-randomize"
              >
                <Shuffle className="w-4 h-4" />
                Randomize
              </Button>
              <Button
                onClick={onReset}
                className="w-full gap-2"
                variant="outline"
                data-testid="button-reset"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", background: "transparent" }}
              >
                <RotateCcw className="w-4 h-4" />
                Classic Default
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Image preview strip ── */
function ImagePreview({ url, onClear }: { url: string; onClear: () => void }) {
  return (
    <motion.div
      className="flex items-center gap-3 p-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <img
        src={url}
        alt="Custom decal"
        className="rounded-lg object-cover flex-shrink-0"
        style={{ width: 52, height: 52 }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold">Custom photo applied</p>
        <p className="text-white/40 text-xs mt-0.5">Blended on your cushion</p>
      </div>
      <button
        onClick={onClear}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
        data-testid="button-remove-image"
        title="Remove photo"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
