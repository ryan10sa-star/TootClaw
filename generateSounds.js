#!/usr/bin/env node

/**
 * The Toot Master 3000 - Sound Asset Generator
 *
 * Pre-generates 50 audio files using the ElevenLabs Sound Effects API:
 *   - 40 fart / funny noise variations
 *   - 10 surprise / unexpected noises
 *
 * Output:
 *   client/public/sounds/*.mp3   — audio files served by the web app
 *   client/src/soundLibrary.json — manifest imported by the React app
 *
 * Usage:
 *   node generateSounds.js
 *
 * Requires ELEVENLABS_API_KEY in .env or as a Replit secret.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Load .env (if present)
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error(
    "\nERROR: ELEVENLABS_API_KEY is not set.\n" +
    "Add it to a .env file in the project root:\n\n" +
    "  ELEVENLABS_API_KEY=your_key_here\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Output paths
// ---------------------------------------------------------------------------
const SOUNDS_DIR   = path.join(__dirname, "client", "public", "sounds");
const LIBRARY_PATH = path.join(__dirname, "client", "src", "soundLibrary.json");

if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 3. The 50 sound prompts
// ---------------------------------------------------------------------------
const FART_PROMPTS = [
  "a long, resonant tuba fart that slowly deflates",
  "a short, punchy brass tuba note that sounds exactly like a fart",
  "a wet, squeaky balloon deflating with a bubbly wobble",
  "a high-pitched squeaky mouse fart that goes eeeek",
  "a deep, thunderous bass fart that rumbles the floor",
  "a rapid-fire machine-gun series of tiny fart pops",
  "a slow, creeping silent-but-deadly fart with a final squeak",
  "a foghorn fart that echoes across a foggy harbor",
  "a bubbly underwater fart with bubbles rising to the surface",
  "a trumpet fanfare that turns into a long embarrassing fart",
  "a tiny, polite fart muffled by a seat cushion",
  "a monstrous, room-clearing triple-toned fart explosion",
  "a squeaky door hinge that sounds exactly like a small fart",
  "a classic whoopee cushion fart, slow and deliberate",
  "a rapid vibrating lip fart noise like a floppy raspberry",
  "a cartoon fart with a funny ascending pitch wobble",
  "a deep bowel-rumbling fart that starts low and rises high",
  "a fart that sounds like a didgeridoo being played badly",
  "a goose honk that slowly morphs into a flappy fart",
  "a squeaky balloon fart when you let air out slowly",
  "a ripping velcro sound that sounds like a dramatic fart",
  "a juicy wet fart that wobbles and splats at the end",
  "a melodic multi-note fart that plays a little tune",
  "a motorboat engine fart that sputters to a stop",
  "a helium-balloon fart in a very high-pitched squeak",
  "a fart that sounds like a sad trombone wah-wah-waaah",
  "a dog fart followed by a sniff and confused whimper",
  "a fat bubble fart that sounds like a large soap bubble popping",
  "a grandpa armchair fart: slow, inevitable, and proud",
  "a very formal fart with a British accent: crisp and dignified",
  "a long saxophone squeal that ends in a wet fart tone",
  "a fart that mimics a rubber duck being squeezed repeatedly",
  "a reverb-drenched fart echoing inside a metal bucket",
  "a triple-ripple fart that goes pop-squeak-honk in sequence",
  "a fart that sounds like air escaping from a bouncy castle",
  "a flabby, wobbling double-barreled fart with a tail squeak",
  "a fart that sounds like a deflating inflatable dinosaur",
  "a zippy little fart that zooms past like a small rocket",
  "a marching-band fart with a drum kick and tuba blat",
  "a slow-building pressure fart that finally erupts with relief",
];

const SURPRISE_PROMPTS = [
  "a loud T-Rex roar that shakes the ground with reverb",
  "a retro sci-fi laser blaster firing a single zap",
  "a large dog barking twice in quick succession",
  "a cartoon anvil falling with a loud crash and boing",
  "a dramatic opera soprano hitting a glass-shattering high note",
  "a thunderclap with rolling rumble fading into the distance",
  "an air horn blast at close range, startlingly loud",
  "a full duck quack chorus of ten ducks simultaneously",
  "a police siren wail that sweeps up and down twice",
  "a foghorn blasting in thick fog, low and resonant",
];

const ALL_PROMPTS = [
  ...FART_PROMPTS.map((text) => ({ text, isSurprise: false })),
  ...SURPRISE_PROMPTS.map((text) => ({ text, isSurprise: true })),
];

// ---------------------------------------------------------------------------
// 4. ElevenLabs Sound Effects API helper
// ---------------------------------------------------------------------------
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function fetchSoundEffect(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      duration_seconds: null,
      prompt_influence: 0.3,
    });

    const options = {
      hostname: "api.elevenlabs.io",
      path: "/v1/sound-generation",
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Accept: "audio/mpeg",
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = "";
        res.on("data", (chunk) => (errBody += chunk));
        res.on("end", () =>
          reject(new Error(`ElevenLabs API ${res.statusCode}: ${errBody.slice(0, 300)}`))
        );
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// 5. Main loop with 2-second delay between calls
// ---------------------------------------------------------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\nThe Toot Master 3000 - Sound Generator`);
  console.log(`Generating ${ALL_PROMPTS.length} sounds...\n`);

  const library = [];

  for (let i = 0; i < ALL_PROMPTS.length; i++) {
    const { text, isSurprise } = ALL_PROMPTS[i];
    const filename  = `${String(i + 1).padStart(2, "0")}_${slugify(text)}.mp3`;
    const filePath  = path.join(SOUNDS_DIR, filename);
    const publicUrl = `/sounds/${filename}`;
    const label     = isSurprise ? "SURPRISE" : "FART   ";
    const preview   = text.length > 55 ? text.slice(0, 55) + "..." : text;

    process.stdout.write(`[${String(i + 1).padStart(2, " ")}/${ALL_PROMPTS.length}] ${label} > ${preview} `);

    if (fs.existsSync(filePath)) {
      console.log("(skipped - already exists)");
      library.push({ file: publicUrl, prompt: text, isSurprise });
      continue;
    }

    try {
      const audio = await fetchSoundEffect(text);
      fs.writeFileSync(filePath, audio);
      console.log(`OK  (${audio.length} bytes)`);
      library.push({ file: publicUrl, prompt: text, isSurprise });
    } catch (err) {
      console.error(`\n  ERROR: ${err.message}`);
      library.push({ file: null, prompt: text, isSurprise, error: err.message });
    }

    if (i < ALL_PROMPTS.length - 1) {
      await delay(2000);
    }
  }

  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(library, null, 2));

  const ok = library.filter((s) => s.file && !s.error).length;
  console.log(`\nDone! ${ok}/${ALL_PROMPTS.length} files saved.`);
  console.log(`soundLibrary.json written to client/src/soundLibrary.json\n`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
