import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Play, Trash2, CheckCircle, Radio } from "lucide-react";
import { CustomRecording } from "../hooks/useCustomSounds";

interface Props {
  recordings    : CustomRecording[];
  selectedId    : string | null;
  accentColor   : string;
  masterVolume  : number;
  onSaveRecording : (blob: Blob, label: string) => void;
  onDeleteRecording: (id: string) => void;
  onSelectSound   : (id: string | null) => void;
}

type RecordState = "idle" | "recording";

export function RecorderSection({
  recordings, selectedId, accentColor, masterVolume,
  onSaveRecording, onDeleteRecording, onSelectSound,
}: Props) {
  const [recState, setRecState] = useState<RecordState>("idle");
  const [error, setError]       = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);

  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const streamRef     = useRef<MediaStream | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const animFrameRef  = useRef<number | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Canvas visualizer loop ── */
  const drawVisualizer = useCallback(() => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx  = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);

    ctx.clearRect(0, 0, W, H);
    const bw = W / bins.length;
    bins.forEach((v, i) => {
      const barH = Math.max(2, (v / 255) * H);
      const alpha = 0.3 + (v / 255) * 0.7;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(i * bw, H - barH, Math.max(1, bw - 2), barH, 2);
      ctx.fill();
    });

    animFrameRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  /* ── Start recording ── */
  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio analyser for visualizer
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src     = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const mtype = mimeType || "audio/webm";
        const blob  = new Blob(chunksRef.current, { type: mtype });
        const date  = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        onSaveRecording(blob, `Custom Recording ${date}`);
        // Cleanup
        stream.getTracks().forEach((t) => t.stop());
        audioCtxRef.current?.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        const c = canvasRef.current;
        if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
        setRecState("idle");
        setRecSeconds(0);
      };

      recorder.start(100); // collect chunks every 100ms
      recorderRef.current = recorder;
      setRecState("recording");

      // Start visualizer + timer
      drawVisualizer();
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);

    } catch {
      setError("Microphone permission denied. Please allow access and try again.");
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current)     clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  /* ── Play a recording preview ── */
  function playPreview(url: string) {
    const a  = new Audio(url);
    a.volume = Math.min(1, masterVolume / 100);
    a.play().catch(() => {});
  }

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isRecording = recState === "recording";

  return (
    <section className="space-y-3">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
        Record Your Own
      </label>

      {/* Selected sound status */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5" style={{ color: selectedId ? accentColor : "rgba(255,255,255,0.3)" }} />
          <span className="text-xs" style={{ color: selectedId ? "white" : "rgba(255,255,255,0.4)" }}>
            {selectedId
              ? (recordings.find((r) => r.id === selectedId)?.label ?? "Custom Recording")
              : "Random Mix"}
          </span>
        </div>
        {selectedId && (
          <button
            onClick={() => onSelectSound(null)}
            className="text-xs px-2 py-0.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}
            data-testid="button-sound-random-mix"
          >
            Use Random
          </button>
        )}
      </div>

      {/* Record button */}
      <motion.button
        onClick={isRecording ? stopRecording : startRecording}
        data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all"
        style={{
          background:  isRecording ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
          border:      `2px solid ${isRecording ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"}`,
          color:       isRecording ? "#f87171" : "rgba(255,255,255,0.7)",
        }}
        whileTap={{ scale: 0.97 }}
      >
        {isRecording ? (
          <>
            <MicOff className="w-5 h-5" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Tap to Record
          </>
        )}
      </motion.button>

      {/* Recording in progress indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>

              {/* Pulsing REC dot + timer */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-mono font-bold text-red-400">
                  REC {fmtSecs(recSeconds)}
                </span>
                <span className="text-xs text-white/30 ml-auto">Tap again to save</span>
              </div>

              {/* Frequency visualizer canvas */}
              <canvas
                ref={canvasRef}
                width={256}
                height={44}
                className="w-full rounded-lg"
                style={{ background: "rgba(0,0,0,0.2)" }}
                data-testid="canvas-visualizer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-400 px-1"
          data-testid="text-recorder-error"
        >
          {error}
        </motion.p>
      )}

      {/* Saved recordings list */}
      <AnimatePresence>
        {recordings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">
              Saved ({recordings.length}/{10})
            </p>
            {recordings.map((r) => {
              const isSelected = r.id === selectedId;
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: isSelected ? `${accentColor}12` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isSelected ? accentColor + "35" : "rgba(255,255,255,0.07)"}`,
                  }}
                  data-testid={`recording-item-${r.id}`}
                >
                  {/* Play preview */}
                  <button
                    onClick={() => playPreview(r.url)}
                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110 active:scale-95"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                    data-testid={`button-play-${r.id}`}
                    title="Preview"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                  </button>

                  {/* Label */}
                  <span className="flex-1 text-xs truncate" style={{ color: isSelected ? "white" : "rgba(255,255,255,0.6)" }}>
                    {r.label}
                  </span>

                  {/* Select / active badge */}
                  <button
                    onClick={() => onSelectSound(isSelected ? null : r.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isSelected ? `${accentColor}25` : "rgba(255,255,255,0.07)",
                      color:      isSelected ? accentColor : "rgba(255,255,255,0.4)",
                    }}
                    data-testid={`button-select-${r.id}`}
                    title={isSelected ? "Currently active — click to deselect" : "Use this sound"}
                  >
                    {isSelected ? (
                      <><CheckCircle className="w-3 h-3" /> Active</>
                    ) : "Use"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteRecording(r.id)}
                    className="flex-shrink-0 text-white/25 hover:text-red-400 transition-colors p-1"
                    data-testid={`button-delete-${r.id}`}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
