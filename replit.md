# The Toot Master 3000

A premium kid-friendly fart soundboard with 50 pre-generated MP3s, animated whoopie cushion, custom recording, image decals, AI Sommelier, Sneak Attack, Parental Controls, Combo system, Battle Mode, and secret Nuke button.

## Project Structure

- `client/public/sounds/` — 50 pre-generated `.mp3` fart/surprise sounds
- `client/src/soundLibrary.json` — Sound manifest imported by React
- `client/src/pages/` — Home, SneakAttack, BattleMode, FireRemote
- `client/src/components/` — WhoopyCushion, BuilderPanel, SommelierCharacter, ComboCounter, NukeButton, PullMyFinger, ForeverTootButton, ErrorBoundary, ParentalSettings
- `client/src/hooks/` — useCushionSettings, useParentalSettings, useCustomImage, useCustomSounds
- `server/routes.ts` — Express API + Socket.io + Gemini Sommelier
- `server/index.ts` — Express server bootstrap

## Features

### Core Soundboard
- 50 MP3 sounds (40 fart + 10 surprise) stored in `client/public/sounds/`
- Animated SVG whoopie cushion: round/square/star shapes, 8 colour options, 5 SVG decals
- Deflate/inflate animation on tap, breathing idle animation, haptic feedback (`navigator.vibrate`)
- Emoji confetti particles (💨💩 or 🐶🦖 for surprises) fired from valve position
- Reactive drop-shadow glow that intensifies with combo depth

### Combo System
- Taps within 2000ms chain — counter shown in top-right HUD corner (`ComboCounter`)
- Labels: COMBO (2+), MEGA TOOT (8+), ULTRA TOOT (15+) with ⚡ bolts
- Milestone confetti burst + message every 10th hit in a chain
- High combo score persisted to `localStorage` key `tm3k-high-combo`
- Cushion scale inflates with combo (up to 1.22×); resets 2.2s after last tap
- Dynamic subtitle under title reacts to combo level

### AI Sommelier (Phase 4)
- `POST /api/sommelier` — Gemini 2.5 Flash rates each fart as a snooty sommelier
- Stays visible until speech synthesis finishes, then 1.5s grace period before exit
- SVG sommelier character with mouth-open-while-speaking animation + ♪ indicator
- `onSpeechEnd` callback drives dismiss timing (40s safety fallback if TTS fails)
- Rate limited: 20 req/min per IP; input sanitised/truncated before AI prompt injection
- Togglable via Parental Settings (enable/disable + separate mute-voice toggle)

### Sneak Attack (Phase 5)
- Socket.io backend attached to Express httpServer
- **Booby Trap**: countdown timer dial (5–60s), stealth black screen + shake on trigger
- **Remote Trigger**: QR code → `/fire/:sessionId`; fire button on remote device triggers host

### Parental Controls (Phase 6)
- Math-gated entry (solve addition/subtraction equation)
- Master volume slider, allow-surprise toggle, enable-Sommelier toggle, mute-voice toggle
- Persisted to `localStorage` key `toot-master-3000-parental`

### Builder Panel ("Weirdify")
- Colour palette (8 presets), shape (round/square/star), decal picker
- Custom image upload (file or camera) → IndexedDB, rendered inside SVG clip with overlay blend
- Record your own sound via MediaRecorder API with frequency visualiser
- Up to 10 custom recordings; each has preview, select, delete

### Fun Extras
- **Pull My Finger** — 3-2-1 countdown button → surprise fart + confetti
- **Forever Toot** — Loops a fart with volume fade-in/out (toggle Stop Ripping)
- **Secret Nuke** — Double-tap ☢ (bottom-left) → 3s body shake + green gas cloud overlay + 5 simultaneous sounds + massive confetti blast

### Battle Mode (`/battle`)
- Two-player 5-second tapping rounds with pre-round 3-2-1 countdown
- Circular timer ring turns red in final second; live score spring-animates on each tap
- Haptic feedback on every battle tap; ripple ring animation on cushion
- Result screen: trophy, winner banner, animated scores, Rematch / Home buttons

## Security & Reliability
- Rate limiter on `/api/sommelier`: 20 req/60s per IP, in-memory bucket with 5-min eviction sweep
- Input validation: `soundPrompt` stripped of non-safe chars, capped at 150 chars
- React Error Boundary wraps entire app — crashes show friendly "Try Again" screen
- All timer refs (`dismissTimerRef`, `comboResetRef`, PullMyFinger interval) cleaned up on unmount

## Tech Stack

- React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- Express + Socket.io + Node.js
- Gemini 2.5 Flash (via Replit AI Integration)
- IndexedDB — custom image blob + recording blobs
- localStorage — settings, parental, sound metadata, combo high score
- Deployment: VM (persistent Socket.io connections + in-memory rate limiter)

## Key Storage Keys

| Key | Store | Purpose |
|-----|-------|---------|
| `toot-master-3000-settings` | localStorage | Cushion color/shape/decal/size |
| `toot-master-3000-parental` | localStorage | Parental settings |
| `toot-master-3000-sounds-meta` | localStorage | Custom recording metadata |
| `toot-master-3000-selected-sound` | localStorage | Active recording ID |
| `tm3k-high-combo` | localStorage | Personal best combo |
| `toot-master-3000` DB → `custom-image` | IndexedDB | Custom photo blob |
| `toot-master-3000-sounds` DB → `recordings` | IndexedDB | Audio recording blobs |

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Main soundboard |
| `/sneak-attack` | SneakAttack | Booby trap + remote trigger |
| `/battle` | BattleMode | Two-player tapping contest |
| `/fire/:sessionId` | FireRemote | Remote fire page (phone 2) |
