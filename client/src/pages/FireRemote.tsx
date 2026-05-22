import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { io, type Socket } from "socket.io-client";

export default function FireRemote() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "";

  const [connected, setConnected] = useState(false);
  const [fired, setFired] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    document.title = "FIRE — Toot Master 3000";
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(window.location.origin, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-session", sessionId);
      setConnected(true);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => { socket.disconnect(); };
  }, [sessionId]);

  function handleFire() {
    if (!connected || fired) return;
    socketRef.current?.emit("fire", sessionId);
    setFired(true);
    setTimeout(() => setFired(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "#0a0005", userSelect: "none" }}
    >
      {/* Connection indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <motion.div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: connected ? "#22c55e" : "#ef4444" }}
          animate={connected ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-white/30 text-xs">
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* Label */}
      <AnimatePresence mode="wait">
        {!fired ? (
          <motion.div
            key="ready"
            className="flex flex-col items-center gap-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <p
              className="font-black tracking-[0.3em] uppercase"
              style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}
            >
              Toot Master Remote
            </p>

            {/* Giant FIRE button */}
            <motion.button
              onClick={handleFire}
              disabled={!connected}
              className="rounded-full flex items-center justify-center font-black tracking-widest"
              style={{
                width: 240,
                height: 240,
                fontSize: 52,
                background: connected
                  ? "radial-gradient(circle at 40% 35%, #ff5500 0%, #cc0020 60%, #7a000f 100%)"
                  : "radial-gradient(circle at 40% 35%, #551100 0%, #330010 100%)",
                color: "white",
                border: "3px solid rgba(255,80,0,0.3)",
                boxShadow: connected
                  ? "0 0 60px rgba(255,60,0,0.4), 0 0 120px rgba(255,0,30,0.15), inset 0 -6px 20px rgba(0,0,0,0.4), inset 0 4px 10px rgba(255,150,80,0.2)"
                  : "0 0 20px rgba(80,0,0,0.3), inset 0 -4px 10px rgba(0,0,0,0.4)",
                cursor: connected ? "pointer" : "not-allowed",
                opacity: connected ? 1 : 0.45,
              }}
              whileTap={connected ? { scale: 0.92, boxShadow: "0 0 90px rgba(255,60,0,0.7)" } : {}}
              whileHover={connected ? { scale: 1.04 } : {}}
              data-testid="button-fire"
            >
              FIRE
            </motion.button>

            {!connected && (
              <p className="text-white/20 text-xs tracking-wider animate-pulse">
                Connecting to tablet...
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="fired"
            className="flex flex-col items-center gap-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 18 }}
          >
            <motion.div
              style={{ fontSize: 100 }}
              animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            >
              💨
            </motion.div>
            <p
              className="font-black tracking-[0.3em] uppercase"
              style={{ color: "#ff4400", fontSize: 36, textShadow: "0 0 30px #ff440088" }}
            >
              FIRED!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
