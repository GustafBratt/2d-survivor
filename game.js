"use strict";

// ---------- Canvas ----------
// The game is laid out on a fixed 1280x720 stage, scaled to fit the window.
const W = 1280, H = 720;
const GROUND = 650;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const FONT = 'Fredoka, "Trebuchet MS", sans-serif';
const INK = "#2b2b33";

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const dpr = devicePixelRatio || 1;
  canvas.style.width = W * s + "px";
  canvas.style.height = H * s + "px";
  canvas.width = Math.round(W * s * dpr);
  canvas.height = Math.round(H * s * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
addEventListener("resize", fit);
fit();

// ---------- Tuning ----------
const LOBBY_COUNTDOWN = 3, ROUND_TIME = 120, RESULT_TIME = 6; // 2 minutes: the maps are three screens wide
const HUNTER_HOLD = 3; // the hunter waits this long at round start
const DEATH_EXTRA_TIME = 10; // seconds added to a normal round for each death
const CAST = 6; // characters per round, bots fill the empty places
const GRAVITY = 1900;
const ROLE = {
  survivor: { speed: 255, jump: 760 }, // jumps ~152 px
  hunter: { speed: 272, jump: 700 }, // faster, but jumps only ~129 px
};
const ACCEL_GROUND = 2600, ACCEL_AIR = 1500;
const HIT_RANGE = 62, HIT_REACH_Y = 50, HIT_DAMAGE = 25, HIT_COOLDOWN = 0.6, SWING_TIME = 0.22;
const HURT_INVULN = 0.6, PANIC_TIME = 0.9, PANIC_BOOST = 1.25;
const HEART_HEAL = 25, HEART_MAX = 2;
const SCARED_DIST = 220;

// Name tag colors, so the players can tell themselves apart whatever they wear.
const PLAYER_COLORS = { 1: "#4ea8ff", 2: "#5ee06a" };

// Coins: what a round pays a player.
const PAY_SURVIVED = 25, PAY_CAUGHT = 5, PAY_PER_CATCH = 10, PAY_KILLER_WIN = 25;

// Levels: every character a player owns levels up on its own, up to 100.
// XP comes after each round; each new level also pays some coins.
const MAX_LEVEL = 100;
const XP_TAKE_PART = 20, XP_SURVIVED = 40, XP_PER_CATCH = 15, XP_KILLER_WIN = 30;
const LEVEL_UP_COINS = 10;
const xpToNext = (lv) => 20 + lv * 2; // XP from level lv to lv + 1

// ---------- The shop's characters ----------
// You wear your survivor in the lobby and as a survivor, your killer only when you're the killer.
// hat: how the head is dressed, pattern: what's on the shirt, weapon: what the killer carries.
// The killers are the ones from the Roblox game Forsaken.
// eyes: eye color for dark faces, cape: a cape behind the body.
const KILLERS = [
  { id: "slasher", name: "Slasher", price: 0, shirt: "#4d5b3a", pants: "#27272a", skin: "#d9c9a3", hat: "slasher", hatColor: "#1c1917", weapon: "machete", boots: "#1c1917", extras: "slasher" },
  { id: "c00lkidd", name: "c00lkidd", price: 60, shirt: "#dc2626", pattern: "c00l", pants: "#b91c1c", skin: "#ef4444", weapon: "fist", grin: true },
  { id: "johndoe", name: "John Doe", price: 120, shirt: "#facc15", pants: "#2563eb", skin: "#f1c27d", hat: "johndoe", weapon: "spike", boots: "#0a0a0a", trail: "#ef4444" },
  { id: "1x1x1x1", name: "1x1x1x1", price: 200, shirt: "#16a34a", pattern: "ribs", pants: "#14532d", skin: "#111827", hat: "domino", hatColor: "#22c55e", weapon: "greensword", eyes: "#ef4444", cape: "#b91c1c", wrist: "#22c55e", fx: "greenflame", extras: "1x" },
  { id: "noli", name: "Noli", price: 260, shirt: "#6d28d9", pants: "#4c1d95", skin: "#f5f5f4", hat: "noli", weapon: "voidstar", pattern: "noli", trail: "#a855f7" },
  { id: "guest666", name: "Guest 666", price: 320, shirt: "#3f3f46", pattern: "roblox", pants: "#27272a", skin: "#0a0a0a", hat: "guest666", hatColor: "#18181b", weapon: "claws", eyes: "#ef4444", boots: "#18181b", tail: "#dc2626", fx: "ember", extras: "guest666" },
  { id: "nosferatu", name: "Nosferatu", price: 400, shirt: "#111827", pattern: "vampire", pants: "#111827", skin: "#7c4a2d", hat: "nosferatu", weapon: "claws", eyes: "#fecaca", cape: "#1f1f2e", boots: "#0a0a0a", levitate: true },
  { id: "azure", name: "Azure", price: 500, shirt: "#1e1b2e", pattern: "spawn", pants: "#111827", skin: "#18181b", hat: "azure", weapon: "tentacle", eyes: "#a78bfa", tentacles: true, extras: "azure" },
];
// The survivors are Forsaken's too. head: a head color other than the skin, tail: a tail behind.
const SURVIVORS = [
  { id: "noob", name: "Noob", price: 0, shirt: "#2f7de1", pants: "#3fae4a", skin: "#f5cd3c" },
  { id: "007n7", name: "007n7", price: 40, shirt: "#2563eb", pattern: "thomas", pants: "#111827", skin: "#f1c27d", hat: "burger" },
  { id: "veeronica", name: "Veeronica", price: 80, shirt: "#dc2626", pants: "#111827", skin: "#f472b6", hat: "tv", tail: "#1f2937" },
  { id: "shedletsky", name: "Shedletsky", price: 120, shirt: "#f8fafc", pattern: "blamejohn", pants: "#2563eb", skin: "#f5cd3c", hat: "curly", weapon: "sword" },
  { id: "guest1337", name: "Guest 1337", price: 160, shirt: "#7c8a5c", pattern: "camo", pants: "#6b7a52", skin: "#f1c27d", hat: "bluehair" },
  { id: "twotime", name: "Two Time", price: 200, shirt: "#1e3a8a", pattern: "spawnmark", pants: "#172554", skin: "#f5f0e6", hat: "spiky", hatColor: "#483d8b", tail: "#111827" },
  { id: "chance", name: "Chance", price: 240, shirt: "#18181b", pattern: "suit", pants: "#18181b", skin: "#4b5563", hat: "fedora" },
  { id: "janedoe", name: "Jane Doe", price: 280, shirt: "#3f3a36", pattern: "trench", pants: "#7c5a3a", skin: "#f3dc8c", hat: "jane" },
  { id: "elliot", name: "Elliot", price: 320, shirt: "#dc2626", pants: "#111827", skin: "#f5cd3c", hat: "visor" },
  { id: "dusekkar", name: "Dusekkar", price: 360, shirt: "#f1f5f9", pattern: "runes", pants: "#f1f5f9", skin: "#1e3a8a", hat: "bluepumpkin", eyes: "#fde047", robe: true },
  { id: "builderman", name: "Builderman", price: 420, shirt: "#6b7280", pattern: "hoodie", pants: "#1d4ed8", skin: "#9ca3af", hat: "bchat" },
  { id: "taph", name: "Taph", price: 480, shirt: "#18181b", pattern: "taph", pants: "#18181b", skin: "#f1c27d", hat: "taphhood", hatColor: "#18181b", eyes: "#fde047" },
];

// ---------- Skins ----------
// Skins from Forsaken: each character has four of its shop skins, bought with
// coins, and its Milestone skins, unlocked by levelling that character to
// 25, 50, 75 and 100 (as Forsaken unlocks them by level too).
// A skin overrides colors (shirt, pants, skin, hatColor, eyes, cape), may swap
// the hat (hat) or add something on top of it (add, addColor), change the shirt
// pattern, and may glow (glow), be see-through (alpha) or give off particles
// (fx: sparkle, ember, frost).
const CHAR_SKINS = {
  // Killers
  slasher: { sig: "#7f1d1d", shop: [
    { id: "lumberjack", name: "Lumberjack", shirt: "#b91c1c", pattern: "check", pants: "#1e3a8a" },
    { id: "hockeystar", name: "Hockey Star", shirt: "#dc2626", pattern: "jersey", patternColor: "#f8fafc", pants: "#111827" },
    { id: "nun", name: "Nun", shirt: "#111827", pants: "#111827", hatColor: "#f8fafc", pattern: "collar" },
    { id: "yellowslasher", name: "Yellow Slasher", shirt: "#facc15", pants: "#ca8a04", hatColor: "#a16207" },
  ] },
  c00lkidd: { sig: "#7e22ce", shop: [
    { id: "cool3r", name: "Cool3r", shirt: "#2563eb", pants: "#1d4ed8", skin: "#3b82f6" },
    { id: "mafioso", name: "Mafioso", shirt: "#18181b", pattern: "suit", pants: "#18181b", add: "fedora2", addColor: "#18181b" },
    { id: "celebration", name: "Celebration", shirt: "#f472b6", pants: "#a855f7", add: "partyhat", addColor: "#facc15", fx: "sparkle" },
    { id: "nightmare", name: "N1GH7M4R33", shirt: "#1e1b4b", pants: "#0f0a1f", skin: "#4c1d95", eyes: "#f0abfc", glow: "#a855f7" },
  ] },
  johndoe: { sig: "#dc2626", shop: [
    { id: "noir", name: "Noir", shirt: "#d4d4d4", pants: "#404040", skin: "#e5e5e5", add: "fedora2", addColor: "#262626" },
    { id: "baker", name: "Baker", shirt: "#f8fafc", pattern: "apron", patternColor: "#e2e8f0", pants: "#78350f", add: "chef" },
    { id: "overgrown", name: "Overgrown", shirt: "#4d7c0f", pants: "#365314", skin: "#a3b18a", fx: "frost" },
    { id: "demonking", name: "Demon King", shirt: "#7f1d1d", pants: "#1c1917", skin: "#b91c1c", add: "crown", addColor: "#facc15", eyes: "#fde047" },
  ] },
  "1x1x1x1": { sig: "#22c55e", shop: [
    { id: "monochrome", name: "Monochrome", shirt: "#d4d4d4", pants: "#525252", hatColor: "#a3a3a3", cape: "#404040", eyes: "#f8fafc" },
    { id: "infernum", name: "Infernum", shirt: "#ea580c", pants: "#7c2d12", hatColor: "#f97316", cape: "#fde047", eyes: "#fde047", fx: "ember" },
    { id: "illumina", name: "Illumina", shirt: "#fef9c3", pants: "#fde68a", skin: "#f8fafc", hatColor: "#facc15", cape: "#fbbf24", eyes: "#38bdf8", glow: "#fde68a" },
    { id: "voidbound", name: "Voidbound", shirt: "#4c1d95", pants: "#1e1b4b", hatColor: "#a855f7", cape: "#2e1065", eyes: "#e879f9", glow: "#7c3aed" },
  ] },
  noli: { sig: "#a855f7", shop: [
    { id: "dayofthedead", name: "Day of The Dead", shirt: "#ea580c", pants: "#7c2d12", skin: "#fef3c7", add: "flowers" },
    { id: "starrynight", name: "Starry Night", shirt: "#1e3a8a", pants: "#172554", skin: "#fde68a", fx: "sparkle" },
    { id: "umbra", name: "Umbra", shirt: "#18181b", pants: "#0a0a0a", skin: "#3f3f46", eyes: "#f8fafc" },
    { id: "toolbox", name: "Toolbox", shirt: "#6b7280", pants: "#374151", skin: "#d1d5db", add: "hardhat", addColor: "#f97316" },
  ] },
  guest666: { sig: "#dc2626", shop: [
    { id: "guest333", name: "Guest 333", shirt: "#1e40af", pants: "#172554", eyes: "#38bdf8", hatColor: "#1e3a8a" },
    { id: "guest999", name: "Guest 999", shirt: "#15803d", pants: "#14532d", eyes: "#4ade80", hatColor: "#14532d" },
    { id: "jackolantern", name: "Jack-O-Lantern", shirt: "#3f3f46", pants: "#27272a", skin: "#f97316", hat: "pumpkinhead", eyes: "#fde047" },
    { id: "sakura", name: "Sakura", shirt: "#f9a8d4", pants: "#be185d", skin: "#fce7f3", eyes: "#db2777", fx: "sparkle" },
  ] },
  nosferatu: { sig: "#991b1b", shop: [
    { id: "werewolf", name: "Werewolf", pattern: null, shirt: "#78350f", pants: "#451a03", skin: "#92400e", hat: "wolfears", hatColor: "#78350f", eyes: "#fde047", cape: null },
    { id: "classicnos", name: "Classic", shirt: "#1c1917", pants: "#1c1917", skin: "#e7e5e4", hat: "bald", eyes: "#1c1917" },
    { id: "arachnid", name: "Arachnid", pattern: null, shirt: "#18181b", pants: "#18181b", skin: "#27272a", eyes: "#ef4444", cape: "#7f1d1d" },
    { id: "heritage", name: "Heritage", shirt: "#581c87", pants: "#3b0764", cape: "#7e22ce", add: "crown", addColor: "#facc15" },
  ] },
  azure: { sig: "#6366f1", shop: [
    { id: "jester", name: "Jester", pattern: null, shirt: "#7c3aed", pants: "#dc2626", hat: "jester" },
    { id: "lunarwizard", name: "Lunar Wizard", shirt: "#1e3a8a", pants: "#172554", eyes: "#bae6fd", hat: "witch", hatColor: "#1e40af", fx: "sparkle" },
    { id: "cowboy", name: "Cowboy", pattern: null, shirt: "#92400e", pants: "#1e3a8a", hat: "cowboy", hatColor: "#78350f" },
    { id: "bride", name: "Bride", pattern: null, shirt: "#f8fafc", pants: "#e2e8f0", hat: "veil" },
  ] },
  // Survivors
  noob: { sig: "#2563eb", shop: [
    { id: "pajamapirate", name: "Pajama Pirate", shirt: "#bfdbfe", pattern: "stripes", patternColor: "#3b82f6", pants: "#93c5fd", add: "tricorn", addColor: "#1f2937" },
    { id: "worker", name: "Worker", shirt: "#f97316", pattern: "vest", pants: "#1e3a8a", add: "hardhat", addColor: "#facc15" },
    { id: "nightout", name: "Night Out", shirt: "#18181b", pattern: "suit", pants: "#18181b", add: "sunglasses" },
    { id: "sunnyday", name: "Sunny Day", shirt: "#fde047", pattern: "flowers", pants: "#38bdf8", add: "sunglasses" },
  ] },
  "007n7": { sig: "#2563eb", shop: [
    { id: "pizzadelivery", name: "Pizza Delivery", pattern: null, shirt: "#dc2626", pants: "#111827", hat: "cap", hatColor: "#dc2626" },
    { id: "agent", name: "Agent", shirt: "#18181b", pattern: "suit", pants: "#18181b", hat: "sunglassesonly" },
    { id: "raincoat", name: "Raincoat", pattern: null, shirt: "#facc15", pants: "#1e3a8a", hat: "hood2", hatColor: "#eab308" },
    { id: "alien", name: "Alien", pattern: null, shirt: "#4ade80", pants: "#166534", skin: "#86efac", hat: "antennae", hatColor: "#22c55e", eyes: "#052e16" },
  ] },
  veeronica: { sig: "#ec4899", shop: [
    { id: "bunny", name: "Bunny", shirt: "#fbcfe8", pants: "#f9a8d4", add: "bunny", addColor: "#fdf2f8" },
    { id: "angel", name: "Angel", shirt: "#f8fafc", pants: "#e2e8f0", skin: "#fce7f3", add: "halo", glow: "#fef9c3" },
    { id: "emo", name: "Emo", shirt: "#18181b", pattern: "stripes", patternColor: "#ec4899", pants: "#18181b", skin: "#a21caf" },
    { id: "mecha", name: "Mecha", shirt: "#6b7280", pants: "#374151", skin: "#9ca3af", eyes: "#38bdf8" },
  ] },
  shedletsky: { sig: "#facc15", shop: [
    { id: "chef", name: "Chef", shirt: "#f8fafc", pattern: "apron", patternColor: "#e5e7eb", pants: "#111827", hat: "chef" },
    { id: "pirate", name: "Pirate", shirt: "#f8fafc", pattern: "stripes", patternColor: "#dc2626", pants: "#1e3a8a", hat: "tricorn", hatColor: "#1f2937" },
    { id: "vampire", name: "Vampire", shirt: "#18181b", pattern: "vampire", pants: "#18181b", skin: "#e7e5e4", cape: "#7f1d1d" },
    { id: "fireninja", name: "Fire Ninja", pattern: null, shirt: "#b91c1c", pants: "#7f1d1d", hat: "ninjamask", hatColor: "#991b1b", fx: "ember" },
  ] },
  guest1337: { sig: "#1d4ed8", shop: [
    { id: "sailor", name: "Sailor", shirt: "#f8fafc", pattern: "collar", pants: "#1e3a8a", hat: "sailor" },
    { id: "commando", name: "Commando", shirt: "#3f6212", pattern: "camo", pants: "#365314", hat: "beret", hatColor: "#14532d" },
    { id: "hospitalpatient", name: "Hospital Patient", pattern: null, shirt: "#bae6fd", pants: "#7dd3fc" },
    { id: "barbarian", name: "Barbarian", pattern: null, shirt: "#92400e", pants: "#78350f", hat: "horned" },
  ] },
  twotime: { sig: "#4338ca", shop: [
    { id: "princess", name: "Princess", shirt: "#f9a8d4", pants: "#f472b6", hatColor: "#fbbf24", add: "crown", addColor: "#facc15" },
    { id: "prince", name: "Prince", shirt: "#1d4ed8", pants: "#1e3a8a", add: "crown", addColor: "#facc15" },
    { id: "phoenix", name: "Phoenix", shirt: "#ea580c", pants: "#9a3412", hatColor: "#f97316", tail: "#fde047", fx: "ember" },
    { id: "kittycat", name: "Kitty Cat", shirt: "#f5f5f4", pants: "#d6d3d1", add: "catears", addColor: "#fda4af" },
  ] },
  chance: { sig: "#dc2626", shop: [
    { id: "fancifulpirate", name: "Fanciful Pirate", shirt: "#7f1d1d", pattern: "suit", pants: "#1c1917", hat: "tricorn", hatColor: "#18181b" },
    { id: "sheriff", name: "Mysterious Sheriff", shirt: "#92400e", pattern: "star", pants: "#1e3a8a", hat: "cowboy", hatColor: "#18181b" },
    { id: "pinkday", name: "Pink Day", shirt: "#f472b6", pattern: "suit", pants: "#ec4899" },
    { id: "blueday", name: "Blue Day", shirt: "#3b82f6", pattern: "suit", pants: "#2563eb" },
  ] },
  janedoe: { sig: "#f472b6", shop: [
    { id: "masquerade", name: "Masquerade", pattern: null, shirt: "#581c87", pants: "#3b0764", add: "eyemask", addColor: "#a855f7" },
    { id: "chillingpirate", name: "Chilling Pirate", shirt: "#1e3a8a", pants: "#78350f", hat: "tricorn", hatColor: "#1f2937" },
    { id: "victorian", name: "Victorian", pattern: null, shirt: "#14532d", pants: "#052e16", hat: "tophat", hatColor: "#18181b" },
    { id: "noirjane", name: "Noir", shirt: "#404040", pants: "#262626", skin: "#e5e5e5" },
  ] },
  elliot: { sig: "#dc2626", shop: [
    { id: "milkman", name: "Milkman", shirt: "#f8fafc", pants: "#e2e8f0", hat: "cap", hatColor: "#f8fafc" },
    { id: "bakerelliot", name: "Baker", shirt: "#f8fafc", pattern: "apron", patternColor: "#fde68a", pants: "#78350f", hat: "chef" },
    { id: "bumblebee", name: "Bumble Bee", shirt: "#facc15", pattern: "stripes", patternColor: "#111827", pants: "#111827", hat: "antennae", hatColor: "#111827" },
    { id: "cashier", name: "Cashier", shirt: "#16a34a", pattern: "apron", patternColor: "#15803d", pants: "#111827", hat: "visor" },
  ] },
  dusekkar: { sig: "#1d4ed8", shop: [
    { id: "snowwitch", name: "Snow Witch", shirt: "#e0f2fe", pants: "#bae6fd", skin: "#7dd3fc", add: "witch", addColor: "#e0f2fe", fx: "frost" },
    { id: "glowinthedark", name: "Glow In The Dark", shirt: "#bbf7d0", pants: "#86efac", skin: "#16a34a", eyes: "#bbf7d0", glow: "#4ade80" },
    { id: "goldendus", name: "Golden", shirt: "#fde68a", pants: "#facc15", skin: "#ca8a04", fx: "sparkle" },
    { id: "witchpirate", name: "Witch Pirate", shirt: "#1f2937", pants: "#1f2937", add: "tricorn", addColor: "#111827" },
  ] },
  builderman: { sig: "#facc15", shop: [
    { id: "steampunk", name: "Steampunk", pattern: null, shirt: "#92400e", pants: "#451a03", hat: "tophat", hatColor: "#3f2a1d", add: "goggles" },
    { id: "astronautbm", name: "Astronaut", pattern: null, shirt: "#f1f5f9", pants: "#e2e8f0", add: "spacehelmet" },
    { id: "skeletal", name: "Skeletal", shirt: "#18181b", pattern: "ribs", patternColor: "#f8fafc", pants: "#18181b", skin: "#f5f5f4" },
    { id: "madscientist", name: "Mad Scientist Rat", pattern: null, shirt: "#f8fafc", pants: "#6b7280", skin: "#a8a29e", hat: "ratears", add: "goggles" },
  ] },
  taph: { sig: "#facc15", shop: [
    { id: "deepwinter", name: "Deep Winter", pattern: null, shirt: "#e0f2fe", pants: "#bae6fd", hatColor: "#f8fafc", fx: "frost" },
    { id: "banana", name: "Banana", pattern: null, shirt: "#fde047", pants: "#facc15", hatColor: "#fde047", skin: "#fef08a" },
    { id: "spacelord", name: "Spacelord", pattern: null, shirt: "#4c1d95", pants: "#2e1065", hatColor: "#6d28d9", add: "spacehelmet" },
    { id: "demolitionist", name: "Demolitionist", shirt: "#ea580c", pattern: "vest", pants: "#1c1917", hat: "hardhat", hatColor: "#f97316" },
  ] },
};
// Forsaken's Milestone skins, drawn after the Forsaken wiki's descriptions.
// add is a list of [accessory, color]; wings and cape are drawn behind the body.
// Nosferatu has only Milestone I and II: his III and IV aren't out in Forsaken yet.
const MILESTONES = {
  slasher: [
    { shirt: "#57534e", pattern: "num51", pants: "#3f3f46", hatColor: "#9a3412" }, // bacon hair, dirty "51" jacket
    { shirt: "#44403c", pattern: "stains", pants: "#292524", hatColor: "#1c1917", eyes: "#dc2626", add: [["shackle", "#facc15"]] },
    { shirt: "#1e293b", pattern: "chains", pants: "#0f172a", hatColor: "#334155", eyes: "#38bdf8", glow: "#38bdf8", fx: "frost" },
    { shirt: "#431407", pattern: "chains", pants: "#1c1917", hatColor: "#1c1917", eyes: "#fb923c", glow: "#f97316", fx: "ember" }, // magma
  ],
  c00lkidd: [
    { hat: "boxhead", hatColor: "#c08a52", shirt: "#2563eb", pattern: null, pants: "#111827" }, // cosplaying 007n7
    { cape: "#7f1d1d", eyes: "#ffffff", add: [["horns", "#1c1917"], ["bow", "#dc2626"], ["burgers"]] },
    { hat: "hood2", hatColor: "#b91c1c", cape: "#7f1d1d", eyes: "#ffffff", add: [["horns", "#1c1917"]] },
    { hat: "hood2", hatColor: "#111827", cape: "#111827", eyes: "#ffffff", glow: "#dc2626", fx: "sparkle", add: [["hornsbig", "#1c1917"]] },
  ],
  johndoe: [
    { shirt: "#f8fafc", pattern: "buttons", pants: "#1d4ed8", add: [["glasses"]] },
    { shirt: "#e5e5e5", pattern: "vestbrown", pants: "#1e3a8a", skin: "#d6c7a8" },
    { shirt: "#d4d4d4", pattern: "tie", pants: "#1e3a8a", skin: "#c8bda3" },
    { shirt: "#0a0a0a", pattern: "drape", pants: "#0a0a0a", skin: "#dc2626", eyes: "#0a0a0a", glow: "#dc2626" }, // all corruption
  ],
  "1x1x1x1": [
    { shirt: "#4d7c0f", pants: "#365314", hatColor: "#65a30d", cape: "#7f1d1d" }, // rotten, crown of leaves
    { shirt: "#22c55e", pattern: "chains", hatColor: "#eab308", fx: "frost", add: [["tricorn", "#1c1917"]] }, // captain's hat
    { shirt: "#1d4ed8", pattern: "zip", hatColor: "#22c55e", cape: "#7c3aed", add: [["pauldrons", "#14b8a6"]] },
    { shirt: "#7c3aed", pattern: "tesseract", hatColor: "#22c55e", cape: "#b91c1c", glow: "#22c55e", fx: "sparkle", add: [["crown", "#22c55e"]] },
  ],
  noli: [
    { shirt: "#4c1d95", skin: "#e5e5e5", add: [["scarf", "#57534e"]] },
    { shirt: "#3b0764", skin: "#d4d4d4", cape: "#3b0764", add: [["scarf", "#7e22ce"]] },
    { shirt: "#2e1065", cape: "#1e1b4b", eyes: "#a855f7", glow: "#a855f7" },
    { shirt: "#7c3aed", cape: "#6d28d9", skin: "#e9d5ff", eyes: "#1e1b4b", glow: "#c084fc", fx: "sparkle" }, // black hole
  ],
  guest666: [
    { shirt: "#27272a", pants: "#78716c", skin: "#27272a", add: [["bandages", "#e7e5e4"]] },
    { shirt: "#3f3f46", skin: "#7f1d1d", eyes: "#ffffff", glow: "#dc2626" },
    { shirt: "#450a0a", eyes: "#ffffff", glow: "#ef4444", fx: "ember" },
    { shirt: "#1c1917", cape: "#7f1d1d", eyes: "#fde047", glow: "#f97316", fx: "ember" },
  ],
  nosferatu: [
    { skin: "#78350f", hat: "hair", hatColor: "#78350f", shirt: "#b91c1c", pattern: "collar", pants: "#78350f", cape: "#92400e", eyes: "#ef4444" },
    { skin: "#78350f", hat: "hair", hatColor: "#57351f", shirt: "#7f1d1d", pattern: "stains", pants: "#78350f", cape: "#57534e", eyes: "#f87171" },
  ],
  azure: [
    { shirt: "#7c2d12", pattern: "ribs", patternColor: "#a855f7", pants: "#57351f", eyes: "#a855f7" }, // decayed
    { shirt: "#0f172a", pattern: "vortex", eyes: "#22d3ee", add: [["flowers"]] },
    { hat: "hood2", hatColor: "#18181b", shirt: "#18181b", eyes: "#e879f9", glow: "#e879f9", add: [["hornsbig", "#22d3ee"]] },
    { hat: "hood2", hatColor: "#0f172a", shirt: "#1e293b", pattern: "armor", eyes: "#22d3ee", glow: "#22d3ee", fx: "sparkle", add: [["hornsbig", "#22d3ee"], ["horns", "#22d3ee"], ["pauldrons", "#1e293b"]] },
  ],
  noob: [
    { shirt: "#2563eb", pattern: "ribs", patternColor: "#93c5fd", pants: "#1e3a8a", hat: "cap", hatColor: "#111827", add: [["sunglasses"]] }, // Builders Club
    { shirt: "#f97316", pattern: "tiger", pants: "#111827", hat: "cap", hatColor: "#f97316" }, // Turbo Builders Club
    { shirt: "#111827", pattern: "smiley", pants: "#1e3a8a", hat: "hardhat", hatColor: "#111827" }, // Outrageous Builders Club
    { shirt: "#f8fafc", pattern: "pumpkin", pants: "#111827", hat: "cap", hatColor: "#dc2626", add: [["crown", "#dc2626"], ["shutters", "#dc2626"]] },
  ],
  "007n7": [
    { shirt: "#3b82f6", robe: true, add: [["glasses"]] }, // bath robe
    { shirt: "#1e40af", pattern: "buttons", pants: "#1e3a8a", add: [["glasses"]] }, // denim jacket
    { shirt: "#1e3a8a", pants: "#172554", add: [["redvisor"]] },
    { shirt: "#1e293b", pants: "#172554", hat: "hood2", hatColor: "#1e293b", cape: "#334155", add: [["redvisor"]] },
  ],
  veeronica: [
    { shirt: "#be185d", pants: "#111827", add: [["crack"]] },
    { shirt: "#f472b6", pattern: "stains", pants: "#1e3a8a", add: [["crack"], ["scarf", "#111827"]] },
    { shirt: "#7e22ce", pattern: "tie", pants: "#1e3a8a", fx: "ember", add: [["crack"], ["headphones", "#111827"]] },
    { shirt: "#ec4899", pants: "#111827", glow: "#22d3ee", fx: "sparkle", add: [["gasmask"]] }, // rave
  ],
  shedletsky: [
    { hat: "duckhat", pattern: "friedchicken" }, // Mr. Quackers hat
    { shirt: "#111827", pattern: "siliconvalley", hat: "tricorn", hatColor: "#111827", add: [["duck"]] },
    { cape: "#b91c1c", hat: "crown", hatColor: "#18181b", add: [["duck"], ["scar"]] },
    { shirt: "#dbeafe", pattern: "marks", cape: "#f8fafc", hat: "crown", hatColor: "#18181b", glow: "#fde68a", add: [["duck"], ["scar"]] },
  ],
  guest1337: [
    { shirt: "#57643a", pattern: "camo", pants: "#4b5a33" },
    { shirt: "#3f4a2b", pattern: "camo", pants: "#3f4a2b", hat: "armyhelmet", hatColor: "#4b5a33" },
    { shirt: "#3f4a2b", pattern: "camo", pants: "#3f4a2b", hat: "beret", hatColor: "#14532d", cape: "#3f4a2b" },
    { shirt: "#14532d", pattern: "buttons", pants: "#14532d", hat: "officercap", hatColor: "#14532d", cape: "#14532d", add: [["pauldrons", "#facc15"]] },
  ],
  twotime: [
    { shirt: "#f8fafc", robe: true },
    { shirt: "#e5e7eb", robe: true, hat: "hood2", hatColor: "#f8fafc", wings: "#fde68a" },
    { shirt: "#3b0764", robe: true, hat: "hood2", hatColor: "#1e1b4b", wings: "#c4b5fd", add: [["eyemask", "#111827"]] },
    { shirt: "#111827", robe: true, hat: "witch", hatColor: "#111827", glow: "#a78bfa", add: [["eyemask", "#111827"]] },
  ],
  chance: [
    { shirt: "#f8fafc", pattern: "club", pants: "#111827" }, // clubs
    { shirt: "#f8fafc", pattern: "heart", pants: "#dc2626", hat: "fedora2", hatColor: "#dc2626", add: [["sunglasses"], ["bowtie", "#dc2626"]] }, // hearts
    { shirt: "#d1d5db", pattern: "diamond", pants: "#fca5a5", hat: "fedora2", hatColor: "#f8fafc", add: [["sunglasses"], ["crown", "#dc2626"]] }, // diamonds
    { shirt: "#b91c1c", pattern: "spade", pants: "#111827", hat: "fedora2", hatColor: "#111827", glow: "#facc15", add: [["sunglasses"], ["plume"]] }, // spades
  ],
  janedoe: [
    { shirt: "#d6b98c", pattern: "tie", pants: "#4b5563", add: [["pencil"]] },
    { shirt: "#78350f", pattern: "tie", pants: "#4b5563", add: [["eyepatch"]] },
    { shirt: "#c4b5fd", pattern: "jabot", pants: "#6d28d9", eyes: "#7c3aed" },
    { shirt: "#f8fafc", robe: true, hat: "widebrim", hatColor: "#f8fafc", glow: "#f1f5f9", add: [["rose"]] }, // wedding gown
  ],
  elliot: [
    { shirt: "#f97316", pattern: "triangles", add: [["starglasses"]] },
    { shirt: "#f97316", pattern: "triangles", pants: "#dc2626", add: [["starglasses"]] },
    { shirt: "#f97316", pattern: "triangles", pants: "#dc2626", fx: "sparkle", add: [["starglasses"], ["necklace"]] },
    { shirt: "#f97316", pattern: "triangles", pants: "#dc2626", glow: "#facc15", fx: "sparkle", add: [["starglasses"], ["visorwings"]] },
  ],
  dusekkar: [
    { cape: "#f8fafc" },
    { shirt: "#1d4ed8", pants: "#1d4ed8", cape: "#1e40af", add: [["hood2", "#1e40af"]] },
    { shirt: "#64748b", pants: "#64748b", cape: "#475569", add: [["horns", "#facc15"], ["pauldrons", "#facc15"]] },
    { shirt: "#334155", pattern: "armor", pants: "#334155", glow: "#fb923c", add: [["hornsbig", "#fb923c"], ["pauldrons", "#facc15"]] },
  ],
  builderman: [
    { shirt: "#4b5563", pattern: "hoodie", pants: "#1e40af", add: [["hood2", "#6b7280"]] },
    { pattern: "toolbelt", hatColor: "#facc15", add: [["sunglassesup"]] },
    { shirt: "#ea580c", pattern: "wrench", hat: "hardhat", hatColor: "#111827", cape: "#111827" },
    { shirt: "#ea580c", pattern: "vest", glow: "#f97316", add: [["goggles"], ["horns", "#9ca3af"], ["pauldrons", "#111827"]] },
  ],
  taph: [
    { pattern: "taph", patternColor: "#991b1b" }, // gold turns dark red
    { pattern: "taph", patternColor: "#991b1b", add: [["warnlights"]] },
    { shirt: "#7dd3fc", pattern: "taph", patternColor: "#0c4a6e", hatColor: "#0c4a6e", cape: "#e0f2fe" }, // feather cape
    { shirt: "#6d28d9", pattern: "taph", patternColor: "#c084fc", hatColor: "#3b0764", cape: "#a78bfa", eyes: "#c084fc", glow: "#a855f7" },
  ],
};

const SHOP_SKIN_PRICES = [50, 100, 150, 200];

// The skins one character can wear, in shop order.
const skinListCache = {};
function skinsFor(charId) {
  if (skinListCache[charId]) return skinListCache[charId];
  const def = CHAR_SKINS[charId] || { sig: "#ffffff", shop: [] };
  const list = [{ id: "standard", name: "Standard", price: 0, chip: "#ffffff" }];
  def.shop.forEach((sk, i) => list.push({ ...sk, price: SHOP_SKIN_PRICES[i], chip: sk.shirt }));
  (MILESTONES[charId] || []).forEach((m, i) => list.push({
    ...m, id: "milestone" + (i + 1), name: "Milestone " + ["I", "II", "III", "IV"][i], level: 25 * (i + 1), chip: m.shirt || m.hatColor || def.sig,
  }));
  return (skinListCache[charId] = list);
}

function mixColor(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

const skinCache = {};
function skinLook(base, skinId) {
  if (!skinId || skinId === "standard") return base;
  const key = base.id + ":" + skinId;
  if (skinCache[key]) return skinCache[key];
  const sk = skinsFor(base.id).find((k) => k.id === skinId);
  if (!sk) return base;
  const L = { ...base };
  for (const k of ["shirt", "pants", "skin", "hatColor", "eyes", "cape", "tail", "wings", "robe", "hat", "add", "addColor", "pattern", "patternColor", "fx", "glow", "alpha"]) {
    if (k in sk) L[k] = sk[k];
  }
  return (skinCache[key] = L);
}

// ---------- Saved progress (coins and what each player owns) ----------
const SAVE_KEY = "overlev-mordaren";
// The shop's first characters, before the Forsaken ones: whoever bought one gets the coins back.
const OLD_PRICES = {
  knivis: 0, huggaren: 60, byggaren: 120, riddaren: 200, pumpan: 300, doden: 500,
  keps: 30, katt: 60, pirat: 100, ninja: 150, robot: 200, kung: 300, astro: 400,
};
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { s = null; }
  const blank = () => ({ coins: 0, owned: ["slasher", "noob"], killer: "slasher", survivor: "noob", levels: {}, skins: {}, skinOn: {} });
  const out = { 1: { ...blank(), ...(s && s[1]) }, 2: { ...blank(), ...(s && s[2]) } };
  for (const p of [out[1], out[2]]) {
    for (const id of p.owned) if (id in OLD_PRICES) p.coins += OLD_PRICES[id];
    p.owned = p.owned.filter((id) => !(id in OLD_PRICES));
    for (const id of ["slasher", "noob"]) if (!p.owned.includes(id)) p.owned.push(id);
    if (!KILLERS.some((k) => k.id === p.killer)) p.killer = "slasher";
    if (!SURVIVORS.some((k) => k.id === p.survivor)) p.survivor = "noob";
    // The first, made-up skins (Neon, Is, Lava, Spöke) gave way to Forsaken's: coins back.
    const oldSkins = { neon: 40, is: 60, lava: 80, spoke: 100 };
    for (const id of Object.keys(p.skins)) {
      for (const sk of p.skins[id]) if (sk in oldSkins) p.coins += oldSkins[sk];
      p.skins[id] = p.skins[id].filter((sk) => !(sk in oldSkins));
    }
    for (const id of Object.keys(p.skinOn)) if (!skinsFor(id).some((k) => k.id === p.skinOn[id])) delete p.skinOn[id];
  }
  return out;
}
const save = loadSave();
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private window: progress just isn't kept */ }
}

// ---------- Levels ----------
// Surface 0 is the floor; the rest are one-way platforms you can jump up through.
const FLOOR = { x1: 0, x2: W, y: GROUND };
// The lobby is Forsaken's cabin: a ground floor, two stair steps on the right,
// and an upper floor with a railing.
const LOBBY_UPSTAIRS = { x1: 300, x2: 1160, y: 370 };
const LOBBY_SURFACES = [FLOOR, { x1: 1020, x2: 1160, y: 560 }, { x1: 1100, x2: 1240, y: 470 }, LOBBY_UPSTAIRS];
// The six maps a round can be played on. Each has its own shape and something
// special: cars on the street (Staden), ladders (Slottet), mushrooms to bounce
// on (Djungeln), ice (Snölandet) and low gravity (Rymdbasen).
// You can jump onto a platform that overlaps the one below by 40 px and is close
// enough above it (about 120 px, more in low gravity); the bots' graph uses the same rule.
const plat = (x1, x2, y) => ({ x1, x2, y });
const TRAMP_SPEED = 1010; // a mushroom bounce goes about 270 px up
const CLIMB_SPEED = 230;
const CAR_SPEED = 470;
const MAPS = [
  { id: "yorick", name: "Yorick's Resting Place", tip: "", platforms: [
    plat(100, 330, 530), plat(525, 755, 530), plat(950, 1180, 530),
    plat(20, 200, 410), plat(250, 480, 410), plat(800, 1030, 410), plat(1080, 1260, 410),
    plat(60, 200, 290), plat(420, 860, 290), plat(1080, 1220, 290),
  ] },
  // Rooftops climbing like stairs up to a tall building in the middle.
  { id: "pizza", name: "Work at a Pizza Place", tip: "Se upp för bilarna!", cars: true, platforms: [
    plat(40, 240, 540), plat(180, 380, 430), plat(300, 520, 320), plat(460, 820, 220),
    plat(760, 980, 320), plat(900, 1100, 430), plat(1040, 1240, 540),
  ] },
  // Two towers joined by a long wall walk, reached by ladders.
  { id: "hotel", name: "Horror Hotel", tip: "Klättra på stegarna med W / ↑", platforms: [
    plat(40, 260, 450), plat(1020, 1240, 450), plat(40, 1240, 250),
    plat(480, 800, 530), plat(540, 740, 410), plat(300, 420, 540), plat(860, 980, 540),
  ], ladders: [
    { x: 150, top: 450, bottom: 650 }, { x: 110, top: 250, bottom: 450 },
    { x: 1130, top: 450, bottom: 650 }, { x: 1170, top: 250, bottom: 450 },
    { x: 640, top: 250, bottom: 410 },
  ] },
  // Branches at odd heights, and mushrooms that bounce you up high.
  { id: "carnival", name: "C00l Carnival", tip: "Studsa på studsmattorna!", platforms: [
    plat(100, 300, 400), plat(980, 1180, 400),
    plat(520, 760, 540), plat(420, 600, 420), plat(680, 860, 420),
    plat(300, 500, 300), plat(780, 980, 300), plat(560, 720, 290),
  ], tramps: [{ x: 200, surf: 0 }, { x: 1080, surf: 0 }, { x: 640, surf: 3 }] },
  // Wide open and slippery, with one icy pyramid in the middle.
  { id: "cake", name: "Cake Factory", tip: "Glasyren är hal!", ice: true, platforms: [
    plat(200, 520, 530), plat(760, 1080, 530), plat(420, 860, 410), plat(560, 720, 290),
    plat(40, 160, 530), plat(1120, 1240, 530),
  ] },
  // Floating islands far apart: you jump almost twice as high here.
  { id: "voss", name: "Planet Voss", tip: "Nästan ingen tyngdkraft!", gravity: 0.55, platforms: [
    plat(120, 320, 450), plat(960, 1160, 450), plat(520, 760, 500),
    plat(260, 460, 260), plat(820, 1020, 260), plat(560, 720, 300),
  ] },
];

// The bots find their way with a small graph: an "up" edge where you can jump,
// climb or bounce from one surface onto another, a "down" edge where you can drop onto it.
function landingAt(surfs, x, fromY) {
  let best = -1, by = Infinity;
  surfs.forEach((s, i) => {
    if (s.y > fromY && x >= s.x1 && x <= s.x2 && s.y < by) { by = s.y; best = i; }
  });
  return best;
}

function buildGraph(surfs, w) {
  const g = GRAVITY * w.gravity;
  const reach = ROLE.hunter.jump ** 2 / (2 * g) - 6;
  const graph = surfs.map((s, i) => {
    const edges = [];
    surfs.forEach((p, j) => {
      if (i === j) return;
      const o1 = Math.max(s.x1, p.x1), o2 = Math.min(s.x2, p.x2);
      if (p.y < s.y && s.y - p.y <= reach && o2 - o1 >= 40) {
        edges.push({ to: j, up: true, x1: o1 + 15, x2: o2 - 15 });
      }
      if (p.y > s.y) {
        const xs = [];
        for (let x = o1 + 12; x <= o2 - 12; x += 8) if (landingAt(surfs, x, s.y) === j) xs.push(x);
        if (xs.length) edges.push({ to: j, up: false, xs });
      }
    });
    return edges;
  });
  for (const l of w.ladders) {
    const from = surfs.findIndex((s) => s.y === l.bottom && l.x >= s.x1 && l.x <= s.x2);
    const to = surfs.findIndex((s) => s.y === l.top && l.x >= s.x1 && l.x <= s.x2);
    if (from >= 0 && to >= 0) graph[from].push({ to, up: true, x1: l.x, x2: l.x });
  }
  // A bounce lands on the first platform it falls onto after the top of the bounce.
  const bounce = TRAMP_SPEED ** 2 / (2 * g) - 10;
  for (const t of w.tramps) {
    const s = surfs[t.surf], apex = s.y - bounce - 10;
    surfs.forEach((p, j) => {
      if (p.y >= s.y || s.y - p.y > bounce || t.x < p.x1 + 10 || t.x > p.x2 - 10) return;
      if (surfs.some((q) => q !== p && q.y < p.y && q.y > apex && t.x >= q.x1 && t.x <= q.x2)) return;
      graph[t.surf].push({ to: j, up: true, x1: t.x, x2: t.x });
    });
  }
  return graph;
}

const LOBBY_WORLD = { surfaces: LOBBY_SURFACES, gravity: 1, ladders: [], tramps: [] };
// Match maps are three screens wide: the screen-sized layout three times over,
// the middle copy mirrored so the map doesn't just repeat.
const MAP_SCREENS = 3;
function widenMap(m) {
  const plats = [], ladders = [], tramps = [], n = m.platforms.length;
  for (let k = 0; k < MAP_SCREENS; k++) {
    const mx = (x) => k * W + (k % 2 ? W - x : x);
    for (const p of m.platforms) plats.push(plat(Math.min(mx(p.x1), mx(p.x2)), Math.max(mx(p.x1), mx(p.x2)), p.y));
    for (const l of m.ladders || []) ladders.push({ ...l, x: mx(l.x) });
    for (const t of m.tramps || []) tramps.push({ x: mx(t.x), surf: t.surf === 0 ? 0 : 1 + k * n + (t.surf - 1) });
  }
  Object.assign(m, { platforms: plats, ladders, tramps, width: W * MAP_SCREENS });
}
LOBBY_WORLD.width = W;
for (const m of MAPS) widenMap(m);

for (const m of [LOBBY_WORLD, ...MAPS]) {
  m.surfaces = m.surfaces || [{ x1: 0, x2: m.width, y: GROUND }, ...m.platforms];
  m.gravity = m.gravity || 1;
  m.ladders = m.ladders || [];
  m.tramps = m.tramps || [];
  m.graph = buildGraph(m.surfaces, m);
}
const LOBBY_GRAPH = LOBBY_WORLD.graph;

let world = LOBBY_WORLD; // the lobby or the current map
let surfaces = LOBBY_SURFACES;
let graph = LOBBY_GRAPH;

// Every match gets a new map: they're dealt from a shuffled pile, so all six
// come up before any repeats, and never the same map twice in a row.
let map = MAPS[0];
let mapPile = [];
function nextMap() {
  if (!mapPile.length) {
    mapPile = [...MAPS].sort(() => Math.random() - 0.5);
    if (mapPile[mapPile.length - 1] === map) mapPile.unshift(mapPile.pop());
  }
  return mapPile.pop();
}
function nextHop(from, to) {
  if (from === to || !graph[from] || !graph[to]) return null; // a surface from another map
  const prev = new Array(surfaces.length).fill(-2);
  prev[from] = -1;
  const queue = [from];
  while (queue.length) {
    const n = queue.shift();
    if (n === to) break;
    for (const e of graph[n]) if (prev[e.to] === -2) { prev[e.to] = n; queue.push(e.to); }
  }
  if (prev[to] === -2) return null;
  let n = to;
  while (prev[n] !== from) n = prev[n];
  return graph[from].find((e) => e.to === n);
}

// ---------- Helpers ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, t, step) => (v < t ? Math.min(v + step, t) : Math.max(v - step, t));

function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60), r = s % 60;
  if (m && r) return `${m} min ${r} sek`;
  if (m) return `${m} min`;
  return `${r} sek`;
}

// ---------- Sound (synthesized, no files) ----------
let audio = null;
function initAudio() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; }
  } else if (audio.state === "suspended") audio.resume();
}

function tone(freq, dur, { type = "square", vol = 0.06, slide = null, delay = 0 } = {}) {
  if (!audio) return;
  const t = audio.currentTime + delay;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.1, freq = 1200, delay = 0 } = {}) {
  if (!audio) return;
  const t = audio.currentTime + delay;
  const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  src.buffer = buf;
  f.type = "bandpass";
  f.frequency.value = freq;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(audio.destination);
  src.start(t);
}

const sfx = {
  beep: () => tone(660, 0.12, { vol: 0.07 }),
  go: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.06, delay: i * 0.07 })),
  jump: () => tone(320, 0.09, { vol: 0.025, slide: 560 }),
  swing: () => noise(0.12, { vol: 0.25, freq: 2600 }),
  hit: () => { tone(160, 0.18, { type: "triangle", vol: 0.2, slide: 60 }); noise(0.1, { vol: 0.3, freq: 700 }); },
  out: () => tone(420, 0.6, { type: "triangle", vol: 0.12, slide: 110 }),
  heart: () => { tone(660, 0.1, { vol: 0.05 }); tone(990, 0.16, { vol: 0.05, delay: 0.08 }); },
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { vol: 0.06, delay: i * 0.1 })),
  buy: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, { vol: 0.05, delay: i * 0.06 })),
  no: () => tone(150, 0.25, { type: "sawtooth", vol: 0.05 }),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.22, { type: "triangle", vol: 0.1, delay: i * 0.22 })),
};

// ---------- Music ----------
// Original synthesized music that works the way Forsaken's does: a calm song in
// the cabin, a theme for every killer that adds layers the closer the killer
// gets (the "terror radius"), and a last-survivor song. Forsaken's own songs
// can't be used: they're copyrighted, and the page can't load sound files.
// Each theme is 16th-note steps over a 4-bar chord loop, in four layers:
// 0 pad and bass, 1 light drums, 2 arpeggio, 3 lead melody and full drums.
const MUSIC_VOL = 0.45;
const MUSIC_STORE = "overlev-mordaren-musik";
let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_STORE) !== "av"; } catch { /* keep it on */ }

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], locrian: [0, 1, 3, 5, 6, 8, 10],
  whole: [0, 2, 4, 6, 8, 10],
};

// A melody of 32 steps (two bars), made up from a seed so every theme has its own.
function makeLead(seed, density) {
  let r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const out = [];
  let d = 4;
  for (let i = 0; i < 32; i++) {
    if ((i % 2 && rnd() < 0.7) || rnd() > density) { out.push(null); continue; }
    d = clamp(d + Math.floor(rnd() * 5) - 2, 0, 9);
    out.push(d);
  }
  return out;
}

// drums: none, soft, rock, heavy, chip or glitch. fixed: a layer count that doesn't follow the killer.
const TRACKS = {
  lobby: { name: "Stugan", gain: 2, bpm: 80, root: 45, scale: "major", prog: [0, 5, 3, 4], pad: "triangle", bass: "triangle", arp: "triangle", lead: "sine", drums: "none", fixed: 3, seed: 11, density: 0.4 },
  slasher: { name: "Slashers jakt", bpm: 104, root: 45, scale: "minor", prog: [0, 0, 5, 4], pad: "sawtooth", bass: "sawtooth", arp: "square", lead: "sine", drums: "heavy", seed: 7, density: 0.5 },
  c00lkidd: { name: "c00lkidds lek", bpm: 138, root: 48, scale: "dorian", prog: [0, 3, 0, 4], pad: "square", bass: "square", arp: "square", lead: "square", drums: "chip", seed: 21, density: 0.75 },
  johndoe: { name: "John Does fel", bpm: 120, root: 46, scale: "phrygian", prog: [0, 1, 0, 6], pad: "sawtooth", bass: "square", arp: "square", lead: "sawtooth", drums: "glitch", seed: 404, density: 0.6 },
  "1x1x1x1": { name: "1x1x1x1:s återkomst", bpm: 132, root: 43, scale: "harmonic", prog: [0, 5, 4, 4], pad: "sawtooth", bass: "sawtooth", arp: "sawtooth", lead: "square", drums: "rock", seed: 1111, density: 0.65 },
  noli: { name: "Nolis föreställning", bpm: 96, root: 50, scale: "harmonic", prog: [0, 3, 4, 0], pad: "triangle", bass: "triangle", arp: "sine", lead: "triangle", drums: "soft", seed: 33, density: 0.55 },
  guest666: { name: "Guest 666:s vrål", bpm: 88, root: 38, scale: "locrian", prog: [0, 1, 0, 4], pad: "sawtooth", bass: "sawtooth", arp: "sawtooth", lead: "sawtooth", drums: "heavy", seed: 666, density: 0.45 },
  nosferatu: { name: "Nosferatus natt", bpm: 112, root: 41, scale: "harmonic", prog: [0, 3, 4, 5], pad: "square", bass: "triangle", arp: "triangle", lead: "square", drums: "rock", seed: 13, density: 0.6 },
  azure: { name: "Azures trädgård", bpm: 100, root: 44, scale: "whole", prog: [0, 2, 0, 4], pad: "triangle", bass: "sine", arp: "triangle", lead: "sine", drums: "soft", seed: 99, density: 0.5 },
  lms: { name: "Sista överlevaren", bpm: 156, root: 45, scale: "minor", prog: [0, 5, 3, 4], pad: "sawtooth", bass: "sawtooth", arp: "square", lead: "sawtooth", drums: "rock", fixed: 4, seed: 1, density: 0.8 },
};
for (const t of Object.values(TRACKS)) t.melody = makeLead(t.seed, t.density);

const music = { id: null, step: 0, next: 0, bus: null, layers: [], noise: null };

function musicNote(tr, degree, octave) {
  const sc = SCALES[tr.scale], n = sc.length;
  const o = Math.floor(degree / n), d = ((degree % n) + n) % n;
  return 440 * 2 ** ((tr.root + sc[d] + 12 * (o + octave) - 69) / 12);
}

function musicVoice(dest, wave, freq, t, dur, vol, attack = 0.01, cutoff = 2400) {
  const o = audio.createOscillator(), f = audio.createBiquadFilter(), g = audio.createGain();
  o.type = wave;
  o.frequency.value = freq;
  f.type = "lowpass";
  f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function musicDrum(dest, kind, t, vol) {
  if (kind === "kick") {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.2);
    return;
  }
  const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  src.buffer = music.noise;
  f.type = kind === "hat" ? "highpass" : "bandpass";
  f.frequency.value = kind === "hat" ? 7000 : 1800;
  const len = kind === "hat" ? 0.04 : 0.14;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.3, len + 0.02);
}

function musicStep(tr, step, t) {
  const s = step % 16, bar = Math.floor(step / 16) % tr.prog.length;
  const chord = tr.prog[bar];
  const sixteenth = 60 / tr.bpm / 4;
  const [L0, L1, L2, L3] = music.layers;

  // Layer 0: a held chord each bar, and the bass.
  if (s === 0) for (const k of [0, 2, 4]) musicVoice(L0, tr.pad, musicNote(tr, chord + k, 1), t, sixteenth * 16, 0.035, 0.4, 1100);
  const bassSteps = tr.drums === "none" || tr.drums === "soft" ? [0, 8] : [0, 3, 6, 8, 11, 14];
  if (bassSteps.includes(s)) musicVoice(L0, tr.bass, musicNote(tr, chord, 0), t, sixteenth * 3, 0.12, 0.01, 600);

  // Layers 1 and 3: drums, light then full.
  const d = tr.drums;
  if (d !== "none") {
    if (s === 0 || (d === "heavy" && s === 10)) musicDrum(L1, "kick", t, 0.4);
    if (s % 4 === 2) musicDrum(L1, "hat", t, 0.05);
    if (d === "glitch" && Math.random() < 0.25) musicDrum(L1, "hat", t, 0.06);
    if (s === 8 || (d === "rock" && s === 6)) musicDrum(L3, "kick", t, 0.4);
    if (s === 4 || s === 12) musicDrum(L3, "snare", t, d === "soft" ? 0.08 : 0.16);
    if (s % 2 === 1 && d !== "soft") musicDrum(L3, "hat", t, d === "chip" ? 0.06 : 0.035);
  }

  // Layer 2: an arpeggio over the chord.
  if (s % 2 === 0) {
    const k = [0, 2, 4, 7][(s / 2) % 4];
    musicVoice(L2, tr.arp, musicNote(tr, chord + k, 2), t, sixteenth * 1.8, 0.03, 0.005, 2600);
  }

  // Layer 3: the melody.
  const m = tr.melody[step % 32];
  if (m != null) musicVoice(L3, tr.lead, musicNote(tr, chord + m, 2), t, sixteenth * 2.5, 0.045, 0.01, 3200);
}

// Which song should be playing right now, and how close is the killer?
function wantedMusic() {
  if (state === "lobby") return "lobby";
  if (state !== "round") return null;
  if (mode === "ffa") {
    if (cast.filter((c) => c.alive).length === 2) return "lms";
    const me = cast.find((c) => c.human) || cast[0];
    const k = cast.find((c) => c.role === "hunter" && c.alive); return k ? lookOf(k).id : "lms";
  }
  const alive = survivors().filter((c) => c.alive).length;
  if (alive === 1 && cast.length > 2) return "lms";
  const h = hunter() || hunters()[0];
  return h ? lookOf(h).id : null;
}

function terrorLayers() {
  const watchers = cast.filter((c) => c.human && c.alive);
  let d = Infinity;
  for (const p of watchers.length ? watchers : survivors().filter((c) => c.alive)) {
    if (p.role === "hunter" || mode === "ffa") {
      for (const s of victimsOf(p)) if (s.alive) d = Math.min(d, Math.hypot(s.x - p.x, s.y - p.y));
    } else {
      const h = nearestHunter(p);
      if (h) d = Math.min(d, Math.hypot(h.x - p.x, h.y - p.y));
    }
  }
  return d > 650 ? 1 : d > 430 ? 2 : d > 260 ? 3 : 4;
}

function toggleMusic() {
  musicOn = !musicOn;
  try { localStorage.setItem(MUSIC_STORE, musicOn ? "på" : "av"); } catch { /* not remembered */ }
}

// Called every frame: picks the song, sets the layers, and schedules notes a little ahead.
function updateMusic() {
  if (!audio) return;
  if (!music.bus) {
    music.bus = audio.createGain();
    music.bus.gain.value = MUSIC_VOL;
    music.bus.connect(audio.destination);
    for (let i = 0; i < 4; i++) {
      const g = audio.createGain();
      g.gain.value = 0;
      g.connect(music.bus);
      music.layers.push(g);
    }
    music.noise = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
    const ch = music.noise.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const now = audio.currentTime;
  const id = musicOn && pageVisible() ? wantedMusic() : null;
  music.bus.gain.setTargetAtTime(id ? MUSIC_VOL * (TRACKS[id].gain || 1) : 0, now, 0.3);
  if (id !== music.id) {
    music.id = id;
    music.step = 0;
    music.next = now + 0.15;
  }
  if (!id) return;
  const tr = TRACKS[id];
  const layers = tr.fixed || terrorLayers();
  music.layers.forEach((g, i) => g.gain.setTargetAtTime(i < layers ? 1 : 0, now, 0.4));
  const sixteenth = 60 / tr.bpm / 4;
  if (music.next < now) music.next = now + 0.05; // after the tab was in the background
  while (music.next < now + 0.12) {
    musicStep(tr, music.step, music.next);
    music.step++;
    music.next += sixteenth;
  }
}
const pageVisible = () => document.visibilityState !== "hidden";

function drawMusicLabel() {
  const label = !musicOn ? "♪ Musik av · M = på" : music.id ? `♪ ${TRACKS[music.id].name} · M = av` : "";
  if (label) text(label, 16, H - 14, { size: 14, color: "#fde68a", align: "left", ow: 4 });
}

// ---------- Input ----------
const keys = new Set();
const pressed = new Set(); // keys pressed since the last update step
const P1_KEYS = { left: ["KeyA"], right: ["KeyD"], jump: ["KeyW"], down: ["KeyS"], hit: ["Space"], power: ["KeyE"] };
const P2_KEYS = { left: ["ArrowLeft"], right: ["ArrowRight"], jump: ["ArrowUp"], down: ["ArrowDown"], hit: ["Enter", "NumpadEnter", "ControlRight"], power: ["ShiftRight", "Numpad0"] };
const GAME_KEYS = new Set([...Object.values(P1_KEYS).flat(), ...Object.values(P2_KEYS).flat(), "Backspace"]);

addEventListener("keydown", (e) => {
  initAudio();
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) pressed.add(e.code);
  if (e.code === "KeyM" && !e.repeat) toggleMusic();
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
addEventListener("pointerdown", initAudio);

const held = (list) => list.some((k) => keys.has(k));
const tapped = (list) => list.some((k) => pressed.has(k));
const NO_INPUT = { move: 0, jump: false, jumpTap: false, down: false, hit: false, power: false };

function humanInput(c) {
  const k = c.keys;
  return {
    move: (held(k.right) ? 1 : 0) - (held(k.left) ? 1 : 0),
    jump: held(k.jump),
    down: held(k.down),
    hit: tapped(k.hit),
    jumpTap: tapped(k.jump),
    power: tapped(k.power),
  };
}

// ---------- Characters ----------
let cast = [];
let p2Joined = false;

function makeChar(human, slot) {
  return {
    human, // 0 for bots, else the player number
    keys: human === 1 ? P1_KEYS : human === 2 ? P2_KEYS : null,
    name: "Bot",
    color: PLAYER_COLORS[human] || "#ffffff",
    botSurvivor: pick(SURVIVORS).id, botKiller: pick(KILLERS).id,
    kills: 0,
    x: 160 + slot * 190, y: GROUND, vx: 0, vy: 0,
    onGround: true, surf: 0, lastSurf: 0, dropT: 0,
    facing: 1, walk: 0,
    hp: 100, alive: true, role: null,
    attackCd: 0, swing: 0, invuln: 0, panic: 0, hold: 0, hurt: 0,
    wins: 0,
    ai: { t: 0, goalSurf: 0, gx: 0, target: null, react: 0.2, aim: null },
  };
}

function buildCast() {
  const old = cast;
  cast = [];
  cast.push(old.find((c) => c.human === 1) || makeChar(1, 0));
  if (p2Joined) cast.push(old.find((c) => c.human === 2) || makeChar(2, 1));
  for (const c of old) if (!c.human && cast.length < CAST) cast.push(c);
  while (cast.length < CAST) cast.push(makeChar(0, cast.length));
  const humans = cast.filter((c) => c.human).length;
  for (const c of cast) c.name = !c.human ? "Bot" : humans === 1 ? "Du" : `Spelare ${c.human}`;
}

// The bots show off different characters from the shop each lobby.
function dressBots() {
  const looks = [...SURVIVORS].sort(() => Math.random() - 0.5);
  cast.filter((c) => !c.human).forEach((c, i) => {
    c.botSurvivor = looks[i % looks.length].id;
    c.botKiller = pick(KILLERS).id;
    // Some bots show off a skin.
    c.botSkinS = Math.random() < 0.4 ? pick(skinsFor(c.botSurvivor).slice(1, 5)).id : "standard";
    c.botSkinK = Math.random() < 0.4 ? pick(skinsFor(c.botKiller).slice(1, 5)).id : "standard";
  });
}

function lookOf(c) {
  const killer = c.role === "hunter";
  const list = killer ? KILLERS : SURVIVORS;
  const id = c.human ? save[c.human][killer ? "killer" : "survivor"] : killer ? c.botKiller : c.botSurvivor;
  const base = list.find((l) => l.id === id) || list[0];
  const skin = c.human ? save[c.human].skinOn[base.id] : killer ? c.botSkinK : c.botSkinS;
  return skinLook(base, skin);
}

function ownsSkin(player, charId, skinId) {
  const sk = skinsFor(charId).find((k) => k.id === skinId);
  if (!sk || sk.id === "standard") return true;
  if (sk.level) return levelOf(player, charId).lv >= sk.level;
  return (save[player].skins[charId] || []).includes(skinId);
}

// In Smittan, caught survivors turn into killers too ("infected").
// hunter() is the one who started as the killer, hunters() is all of them.
const hunter = () => cast.find((c) => c.role === "hunter" && !c.infected);
const hunters = () => cast.filter((c) => c.role === "hunter");
function nearestHunter(c) {
  let best = null, bd = Infinity;
  for (const h of hunters()) {
    const d = Math.hypot(h.x - c.x, h.y - c.y);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

const MODES = [
  { id: "vanligt", name: "Vanligt", lines: ["En mördare jagar alla.", "Överlev tills tiden är slut!"], color: "#ef4444" },
  { id: "smittan", name: "Smittan", lines: ["Blir du fångad blir du", "också mördare!"], color: "#22c55e" },
  { id: "ffa", name: "Alla mot alla", lines: ["Alla slåss, sist kvar vinner!", "Mördare eller överlevare: 50/50"], color: "#f97316" },
  { id: "slump", name: "Slump", lines: ["Spelet väljer ett", "spelläge åt dig!"], color: "#a855f7" },
];

// Who a killer's hits can land on: the survivors, or in Alla mot alla everyone else.
// Who a survivor's powers aim at: the killers, or in Alla mot alla everyone else.
function foesOf(c) {
  return mode === "ffa" ? victimsOf(c) : hunters();
}
function nearestFoe(c) {
  let best = null, bd = Infinity;
  for (const o of foesOf(c)) {
    const d = Math.hypot(o.x - c.x, o.y - c.y);
    if (o.alive && d < bd) { bd = d; best = o; }
  }
  return best;
}

function victimsOf(c) {
  return mode === "ffa" ? cast.filter((o) => o !== c && o.alive && o.role) : survivors();
}
// Who can pick up hearts.
const pickers = () => (mode === "ffa" ? cast.filter((o) => o.alive && o.role) : survivors());
let mode = "vanligt";
let modePick = null; // the mode chooser, while it's open: { idx }

const DOUBLE_TAP = 0.3; // seconds between two Space taps that count as a double tap
let spaceWait = 0; // time left to tap Space a second time

function joinP2() {
  p2Joined = true;
  buildCast();
  const p2 = cast.find((c) => c.human === 2);
  resetChar(p2);
  Object.assign(p2, { x: W / 2, y: GROUND - 200, vy: 0, onGround: false });
  burst(p2.x, p2.y - 40, p2.color, 16);
  sfx.heart();
}

function leaveP2() {
  p2Joined = false;
  shops[2] = null;
  const p2 = cast.find((c) => c.human === 2);
  burst(p2.x, p2.y - 40, p2.color, 16);
  buildCast();
  const bot = cast[cast.length - 1];
  resetChar(bot);
  Object.assign(bot, { x: p2.x, y: p2.y, vx: 0, vy: 0, onGround: false });
  tone(400, 0.2, { type: "triangle", vol: 0.06, slide: 200 });
}

function startCountdown(id) {
  if (id === "slump") {
    id = pick(MODES.filter((m) => m.id !== "slump")).id;
    floater(W / 2, 250, `Slump: ${MODES.find((m) => m.id === id).name}!`, "#a855f7", 2.2, true);
  }
  mode = id;
  modePick = null;
  timer = LOBBY_COUNTDOWN;
  sfx.go();
}
const survivors = () => cast.filter((c) => c.role === "survivor");

// ---------- Game state ----------
let state = "lobby"; // lobby -> round -> result -> lobby
let timer = Infinity; // the lobby waits until someone presses Space
let lastWholeSecond = 0;
let winner = null;
let hearts = [];
let heartTimer = 0;
let particles = [];
let floaters = []; // floating text over characters
let callouts = []; // big text in the middle of the screen
let gameTime = 0;
let shake = 0; // screen shake, seconds left
// A hit a player is part of freezes the game for a moment so it lands, and the
// hit that ends a round plays in slow motion. Both count real seconds.
let hitStop = 0, slowMo = 0;
let survivorsLeft = 0; // to notice when only one survivor is left
let sceneFade = 1; // a fade from dark when the scene changes
let shops = { 1: null, 2: null }; // an open shop window per player

function placeOnFloor() {
  cast.forEach((c, i) => {
    Object.assign(c, {
      x: 140 + i * ((W - 280) / (cast.length - 1)), y: GROUND, vx: 0, vy: 0,
      onGround: true, surf: 0, lastSurf: 0, dropT: 0,
    });
  });
}

function resetChar(c) {
  Object.assign(c, { hp: 100, alive: true, role: null, attackCd: 0, swing: 0, invuln: 0, panic: 0, hold: 0, hurt: 0, kills: 0, infected: false, fighter: false,
    powerCd: 0, sprint: 0, invis: 0, shield: 0, lowGrav: 0, stun: 0, stuck: 0, dash: 0, dashHit: false, spinT: 0, airJumped: false, climbing: false, carHit: 0, rage: 0, skate: 0, slashT: 0, reborn: false, landT: 0 });
  c.ai.t = 0;
  c.ai.target = null;
  c.ai.goalSurf = 0;
}

function startLobby() {
  state = "lobby";
  sceneFade = 1;
  timer = Infinity;
  world = LOBBY_WORLD;
  surfaces = LOBBY_SURFACES;
  graph = LOBBY_GRAPH;
  cars = [];
  hearts = [];
  projectiles = [];
  traps = [];
  decoys = [];
  dispensers = [];
  callouts = [];
  shops = { 1: null, 2: null };
  modePick = null;
  buildCast();
  dressBots();
  cast.forEach(resetChar);
  placeOnFloor();
}

function startRound() {
  state = "round";
  cam.snap = true;
  survivorsLeft = 99;
  sceneFade = 1;
  timer = ROUND_TIME;
  map = nextMap();
  world = map;
  surfaces = map.surfaces;
  graph = map.graph;
  cars = [];
  carTimer = rand(3, 5);
  hearts = [];
  projectiles = [];
  traps = [];
  decoys = [];
  dispensers = [];
  heartTimer = rand(5, 8);
  shops = { 1: null, 2: null };
  cast.forEach(resetChar);
  const ffa = mode === "ffa";
  const h = pick(cast);
  for (const c of cast) c.role = ffa ? (Math.random() < 0.5 ? "hunter" : "survivor") : c === h ? "hunter" : "survivor";
  // In Alla mot alla, survivors fight too.
  for (const c of cast) c.fighter = ffa && c.role === "survivor";

  // Survivors spread out over the level, the hunter waits in the middle.
  const spots = [];
  surfaces.forEach((s, i) => {
    for (let x = s.x1 + 30; x <= s.x2 - 30; x += 70) if (Math.abs(x - world.width / 2) > 220 || i > 0) spots.push({ x, i });
  });
  for (const c of cast) {
    let x = world.width / 2, i = 0;
    if (c !== h || ffa) ({ x, i } = spots.splice(Math.floor(Math.random() * spots.length), 1)[0]);
    Object.assign(c, { x, y: surfaces[i].y, vx: 0, vy: 0, onGround: true, surf: i, lastSurf: i, dropT: 0 });
    if (ffa) { c.hold = HUNTER_HOLD; c.facing = c.x < world.width / 2 ? 1 : -1; }
  }
  h.hold = HUNTER_HOLD;
  if (!ffa) h.facing = 1;

  sfx.go();
  const sub = h.name === "Du" ? "Du är mördaren! Fånga alla!"
    : h.human ? `${h.name} är mördaren!`
    : "Mördaren är en bot – spring!";
  const top = `Bana: ${map.name}${map.tip ? ` – ${map.tip}` : ""}`;
  const me = cast.find((c) => c.human === 1);
  if (ffa) callout("ALLA MOT ALLA!", `${me && me.role === "survivor" ? "Du slåss som överlevare" : "Du slåss som mördare"} – sist kvar vinner!`, "#f97316", 3, top);
  else if (mode === "smittan") callout("SMITTAN!", `${sub} Den som fångas blir också mördare.`, "#4ade80", 3.2, top);
  else callout("RONDEN BÖRJAR!", sub, "#ffd166", 2.6, top);
}

// Alla mot alla: the winner is the last one alive, or with time up, the one with the most health.
function endFfa() {
  const alive = cast.filter((c) => c.alive);
  const best = alive.length ? alive.reduce((a, b) => (b.hp > a.hp ? b : a)) : null;
  const tie = best && alive.filter((c) => c.hp === best.hp).length > 1;
  state = "result";
  timer = RESULT_TIME;
  winner = tie ? null : best;
  if (winner) {
    winner.wins++;
    const title = winner.name === "Du" ? "DU VANN!" : `${winner.name.toUpperCase()} VANN!`;
    callout(title, alive.length > 1 ? "Mest hälsa kvar när tiden tog slut" : "Sist kvar!", "#f97316", RESULT_TIME);
    burst(winner.x, winner.y - 60, "#fde047", 30, 300);
  } else {
    callout("OAVGJORT!", "Ingen kunde slå ut de andra", "#f97316", RESULT_TIME);
  }
  const humanWon = winner && winner.human;
  if (cast.some((c) => c.human) && !humanWon) sfx.lose(); else sfx.win();
  for (const c of cast) {
    if (!c.human) continue;
    const pay = PAY_CAUGHT + c.kills * PAY_PER_CATCH + (c === winner ? PAY_KILLER_WIN + PAY_SURVIVED : 0);
    save[c.human].coins += pay;
    floater(c.x, c.y - 140, `+${pay} mynt`, "#ffd166", 3);
    addXp(c, XP_TAKE_PART + c.kills * XP_PER_CATCH + (c === winner ? XP_KILLER_WIN + XP_SURVIVED : 0));
  }
  writeSave();
}

function endRound(who) {
  if (mode === "ffa") return endFfa();
  state = "result";
  timer = RESULT_TIME;
  winner = who;
  const alive = survivors().filter((c) => c.alive);
  if (who === "hunter") hunter().wins++;
  else alive.forEach((c) => c.wins++);
  const total = cast.length - 1;
  if (who === "hunter" && mode === "smittan") {
    callout("SMITTAN VANN!", "Alla blev smittade", "#4ade80", RESULT_TIME);
  } else if (who === "hunter") {
    callout("MÖRDAREN VANN!", "Alla blev fångade", "#ff6b6b", RESULT_TIME);
  } else {
    callout("ÖVERLEVARNA VANN!", `${alive.length} av ${total} klarade sig`, "#7bd389", RESULT_TIME);
  }
  // Cheer if a human won, otherwise a sad trombone.
  const humanWon = cast.some((c) => c.human && (who === "hunter" ? c.role === "hunter" && !c.infected : c.role === "survivor" && c.alive));
  const humanLost = cast.some((c) => c.human) && !humanWon;
  if (humanLost) sfx.lose(); else sfx.win();

  // Pay the players.
  for (const c of cast) {
    if (!c.human) continue;
    const pay = c.infected ? PAY_CAUGHT + c.kills * PAY_PER_CATCH
      : c.role === "hunter" ? c.kills * PAY_PER_CATCH + (who === "hunter" ? PAY_KILLER_WIN : 0)
      : c.alive ? PAY_SURVIVED : PAY_CAUGHT;
    save[c.human].coins += pay;
    if (pay) floater(c.x, c.y - 140, `+${pay} mynt`, "#ffd166", 3);

    const xp = XP_TAKE_PART + c.kills * XP_PER_CATCH
      + (c.role === "survivor" && c.alive ? XP_SURVIVED : 0)
      + (c.role === "hunter" && !c.infected && who === "hunter" ? XP_KILLER_WIN : 0);
    addXp(c, xp);
  }
  writeSave();
}

function levelOf(player, id) {
  const all = save[player].levels || (save[player].levels = {});
  return all[id] || (all[id] = { lv: 1, xp: 0 });
}

// XP to the character a player is wearing right now.
function addXp(c, amount) {
  const id = lookOf(c).id;
  const L = levelOf(c.human, id);
  if (L.lv >= MAX_LEVEL) return;
  L.xp += amount;
  floater(c.x, c.y - 165, `+${amount} XP`, "#a5f3fc", 3);
  let gained = 0;
  while (L.lv < MAX_LEVEL && L.xp >= xpToNext(L.lv)) {
    L.xp -= xpToNext(L.lv);
    L.lv++;
    gained++;
  }
  if (L.lv >= MAX_LEVEL) L.xp = 0;
  if (gained) {
    save[c.human].coins += gained * LEVEL_UP_COINS;
    floater(c.x, c.y - 192, `NIVÅ ${L.lv}! +${gained * LEVEL_UP_COINS} mynt`, "#fde047", 3.5);
    burst(c.x, c.y - 60, "#fde047", 24, 260);
    sfx.buy();
  }
}

// A small level badge; its color changes every 25 levels.
function levelColor(lv) {
  return lv >= MAX_LEVEL ? "#c084fc" : lv >= 75 ? "#67e8f9" : lv >= 50 ? "#facc15" : lv >= 25 ? "#e2e8f0" : "#e6b07a";
}
function drawLevelBadge(x, y, lv, size = 13) {
  const label = lv >= MAX_LEVEL ? "MAX" : String(lv);
  ctx.font = `700 ${size}px ${FONT}`;
  const w = Math.max(size + 6, ctx.measureText(label).width + 10);
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - size * 0.7, w, size * 1.4, size * 0.7); fillStroke(levelColor(lv), 2);
  text(label, x, y + 1, { size, color: INK, outline: null });
}

function callout(text, sub, color, life, top = null) {
  callouts = [{ text, sub, color, t: 0, life, top }];
}

function floater(x, y, text, color, life = 1.1, screen = false, size = 22) {
  floaters.push({ x, y, text, color, t: 0, life, screen, size });
}

function burst(x, y, color, n, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(0.3, 1) * speed;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: rand(0.4, 0.8), t: 0, color, size: rand(3, 6) });
  }
}

// ---------- Physics ----------
function stepChar(c, inp, dt) {
  if (!c.alive || c.hold > 0 || c.stun > 0 || c.stuck > 0) inp = NO_INPUT;

  // Ladders: hold up (W / ↑) to climb.
  const lad = world.ladders.find((l) => Math.abs(c.x - l.x) < 16 && c.y > l.top + 0.01 && c.y <= l.bottom + 1);
  c.climbing = !!(lad && inp.jump && c.dash <= 0);
  if (c.climbing) {
    c.vx = 0;
    c.vy = 0;
    c.x = approach(c.x, lad.x, 240 * dt);
    c.y = Math.max(lad.top, c.y - CLIMB_SPEED * dt);
    c.walk += dt * 8;
    c.onGround = false;
    if (c.y <= lad.top) {
      const i = surfaces.findIndex((s) => s.y === lad.top && c.x >= s.x1 && c.x <= s.x2);
      if (i >= 0) { c.onGround = true; c.surf = c.lastSurf = i; }
    }
  } else moveChar(c, inp, dt);
  tickChar(c, dt);
}

function moveChar(c, inp, dt) {
  const stats = c.role === "hunter" ? ROLE.hunter : ROLE.survivor;
  const speed = stats.speed * (c.panic > 0 ? PANIC_BOOST : 1) * (c.sprint > 0 ? 1.6 : 1) * (c.rage > 0 ? 1.2 : 1) * (c.skate > 0 ? 1.9 : 1);
  if (c.dash > 0) c.vx = c.facing * 820;
  else c.vx = approach(c.vx, inp.move * speed, (c.onGround ? ACCEL_GROUND * (world.ice ? 0.25 : 1) : ACCEL_AIR) * dt);
  if (Math.abs(inp.move) > 0.05 && c.dash <= 0) c.facing = Math.sign(inp.move);

  if (inp.jump && c.onGround) {
    c.vy = -stats.jump;
    c.onGround = false;
    if (c.human) sfx.jump();
  }
  if (inp.down && c.onGround && c.surf !== 0) {
    c.dropT = 0.22;
    c.onGround = false;
  }
  c.dropT = Math.max(0, c.dropT - dt);

  c.vy += GRAVITY * world.gravity * (c.lowGrav > 0 ? 0.35 : 1) * dt;
  const prevY = c.y;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  if (c.x < 20) { c.x = 20; c.vx = Math.max(0, c.vx); }
  if (c.x > world.width - 20) { c.x = world.width - 20; c.vx = Math.min(0, c.vx); }
  if (c.y < 100) { c.y = 100; c.vy = Math.max(0, c.vy); } // the ceiling, so heads stay on screen

  // Land on the highest surface the feet crossed this step.
  const wasOnGround = c.onGround;
  c.onGround = false;
  if (c.vy >= 0) {
    let best = -1;
    surfaces.forEach((s, i) => {
      if (i > 0 && c.dropT > 0) return;
      if (prevY <= s.y + 0.01 && c.y >= s.y && c.x >= s.x1 - 6 && c.x <= s.x2 + 6) {
        if (best < 0 || s.y < surfaces[best].y) best = i;
      }
    });
    if (best >= 0) {
      if (!wasOnGround && c.vy > 350) c.landT = 0.16;
      if (!wasOnGround && c.vy > 600 && c.alive) burst(c.x, surfaces[best].y, "#d8c7a8", 5, 120);
      c.y = surfaces[best].y;
      c.vy = 0;
      c.onGround = true;
      c.surf = c.lastSurf = best;
      c.airJumped = false;
    }
  }

  // Mushrooms bounce whoever stands on them.
  if (c.onGround && c.alive) {
    for (const t of world.tramps) {
      if (t.surf !== c.surf || Math.abs(c.x - t.x) > 22) continue;
      c.vy = -TRAMP_SPEED;
      c.onGround = false;
      c.ai.aim = null;
      t.squash = 0.25;
      tone(180, 0.25, { type: "sine", vol: 0.07, slide: 620 });
    }
  }
}

function tickChar(c, dt) {

  if (!c.alive) c.vx = approach(c.vx, 0, 1500 * dt);
  c.walk += Math.abs(c.vx) * dt * 0.06;
  c.attackCd = Math.max(0, c.attackCd - dt);
  c.swing = Math.max(0, c.swing - dt);
  c.invuln = Math.max(0, c.invuln - dt);
  c.panic = Math.max(0, c.panic - dt);
  c.hurt = Math.max(0, c.hurt - dt);
  c.hold = Math.max(0, c.hold - dt);
  for (const k of ["powerCd", "sprint", "invis", "shield", "lowGrav", "stun", "stuck", "dash", "spinT", "carHit", "rage", "skate", "slashT", "landT"]) c[k] = Math.max(0, c[k] - dt);
}

function swing(c) {
  if (c.attackCd > 0 || c.hold > 0 || !c.alive) return;
  c.attackCd = HIT_COOLDOWN * (c.rage > 0 ? 0.4 : 1);
  c.swing = SWING_TIME;
  if (state !== "round" || (c.role !== "hunter" && !c.fighter)) return;
  sfx.swing();
  for (const s of victimsOf(c)) {
    const dx = s.x - c.x;
    if (dx * c.facing >= -12 && Math.abs(dx) <= HIT_RANGE && Math.abs(s.y - c.y) <= HIT_REACH_Y) hitSurvivor(s, c, HIT_DAMAGE, c.facing);
  }
  for (const d of decoys) {
    const dx = d.x - c.x;
    if (d.alive && dx * c.facing >= -12 && Math.abs(dx) <= HIT_RANGE && Math.abs(d.y - c.y) <= HIT_REACH_Y) popClone(d, true);
  }
}

// dir is the way the hit knocks them, 0 for no knockback (a trap).
function damage(s, from, amount, dir) {
  // Fights last longer in Alla mot alla, and survivors hit softer than killers there.
  if (mode === "ffa") amount = Math.ceil(amount * (from && from.fighter ? 0.3 : 0.35));
  s.hp = Math.max(0, s.hp - amount);
  s.invuln = HURT_INVULN;
  s.panic = PANIC_TIME;
  s.hurt = 0.3;
  if (dir) {
    s.vx = dir * 420;
    s.vy = -320;
    s.onGround = false;
  }
  burst(s.x, s.y - 50, "#ff5b5b", 10);
  floater(s.x, s.y - 100, `-${amount}%`, "#ff5b5b");
  sfx.hit();
  if (s.human || (from && from.human)) hitStop = Math.max(hitStop, s.hp <= 0 ? 0.14 : 0.06);
  if (s.hp <= 0 && !s.reborn && s.role === "survivor" && lookOf(s).id === "twotime") {
    s.reborn = true;
    s.hp = 50;
    s.invuln = 1.5;
    burst(s.x, s.y - 50, "#f8fafc", 24, 260);
    floater(s.x, s.y - 145, "Andra livet!", "#f8fafc");
    tone(500, 0.5, { type: "sine", vol: 0.08, slide: 1000 });
    return;
  }
  if (s.hp <= 0 && mode === "smittan") {
    infect(s, from);
  } else if (s.hp <= 0) {
    s.alive = false;
    from.kills++;
    sfx.out();
    floater(s.x, s.y - 125, "Ute!", "#ffffff");
    // Each death in a normal round gives the round more time.
    if (mode === "vanligt") timer += DEATH_EXTRA_TIME;
    if (mode === "vanligt") floater(W / 2, 130, `+${DEATH_EXTRA_TIME} sek`, "#ffd166", 1.2, true);
  }
}

// Smittan: a caught survivor becomes a killer, wearing their own killer from the shop.
function infect(s, from) {
  from.kills++;
  Object.assign(s, {
    role: "hunter", infected: true, hp: 100, hold: 1.2, powerCd: 3,
    sprint: 0, invis: 0, shield: 0, lowGrav: 0, stuck: 0, stun: 0, panic: 0, hurt: 0, rage: 0, skate: 0,
  });
  s.ai.target = null;
  s.ai.t = 0;
  burst(s.x, s.y - 50, "#4ade80", 24, 280);
  floater(s.x, s.y - 125, "Smittad!", "#4ade80");
  tone(300, 0.5, { type: "sawtooth", vol: 0.06, slide: 120 });
  if (s.human) callout(s.name === "Du" ? "DU ÄR SMITTAD!" : `${s.name.toUpperCase()} ÄR SMITTAD!`, "Fånga de andra!", "#4ade80", 2);
}

// ---------- Powers ----------
// Every character in the shop has a power that fits it, used with the power key
// (or always on, for the passive ones). cd is the cooldown in seconds.
// use(c) returns false when the power couldn't be used, so the cooldown doesn't start.
let projectiles = []; // thrown knives and cannonballs
let traps = []; // John Doe's shadow traps
let fx = []; // short-lived effects: shockwave rings, Azure's vines

const POWERS = {
  // Killers (from Forsaken, each with one of their abilities)
  slasher: { name: "Raseri", desc: "Blir rasande och hugger mycket snabbare en stund", cd: 12, use: (c) => {
    c.rage = 4;
    burst(c.x, c.y - 50, "#dc2626", 16, 220);
    tone(110, 0.5, { type: "sawtooth", vol: 0.08, slide: 70 });
  } },
  c00lkidd: { name: "Walkspeed Override", desc: "Gör ett långt utfall framåt och slår den första den träffar", cd: 10, use: (c) => {
    c.dash = 0.6;
    c.dashHit = false;
    tone(600, 0.3, { type: "square", vol: 0.05, slide: 1200 });
  } },
  johndoe: { name: "Digital Footprint", desc: "Lägger en skuggfälla som fångar den som kliver på den", cd: 8, use: (c) => {
    if (!c.onGround) return false;
    const mine = traps.filter((t) => t.owner === c);
    if (mine.length >= 2) traps.splice(traps.indexOf(mine[0]), 1);
    traps.push({ kind: "shadow", x: c.x, y: c.y, owner: c, t: 0 });
    tone(140, 0.3, { type: "sawtooth", vol: 0.06, slide: 70 });
  } },
  "1x1x1x1": { name: "Entanglement", desc: "Kastar sitt svärd rakt fram", cd: 7, use: (c) => {
    projectiles.push({ kind: "knife", sprite: "greensword", x: c.x + c.facing * 24, y: c.y - 50, vx: c.facing * 720, vy: 0, owner: c, life: 1.3 });
    sfx.swing();
  } },
  noli: { name: "Nova", desc: "Kastar en voidstjärna som drar in alla nära och skadar dem", cd: 10, use: (c) => {
    projectiles.push({ kind: "nova", x: c.x + c.facing * 24, y: c.y - 50, vx: c.facing * 560, vy: 0, owner: c, life: 0.9 });
    tone(800, 0.3, { type: "sine", vol: 0.06, slide: 300 });
  } },
  guest666: { name: "Infernal Cry", desc: "Vrålar så att alla nära blir bedövade", cd: 12, use: (c) => {
    c.swing = SWING_TIME;
    shake = 0.3;
    fx.push({ kind: "ring", x: c.x, y: c.y - 50, t: 0, life: 0.5, r: 240, color: "#dc2626" });
    tone(90, 0.6, { type: "sawtooth", vol: 0.12, slide: 55 });
    noise(0.5, { vol: 0.25, freq: 400 });
    for (const s of victimsOf(c)) {
      if (!s.alive || Math.hypot(s.x - c.x, s.y - c.y) > 240) continue;
      if (blockedByShield(s)) continue;
      s.stun = 1.2;
      floater(s.x, s.y - 125, "Bedövad!", "#ffd166");
    }
  } },
  nosferatu: { name: "Bloodhook", desc: "Kastar en krok som drar överlevaren till honom", cd: 9, use: (c) => {
    projectiles.push({ kind: "hook", x: c.x + c.facing * 24, y: c.y - 50, vx: c.facing * 780, vy: 0, owner: c, life: 0.6 });
    noise(0.15, { vol: 0.15, freq: 2000 });
  } },
  azure: { name: "Stigmatize", desc: "Låter rankor skjuta upp ur marken framför sig", cd: 10, use: (c) => {
    if (!c.onGround) return false;
    c.swing = SWING_TIME;
    for (let k = 0; k < 6; k++) fx.push({ kind: "vine", x: c.x + c.facing * (45 + k * 40), y: c.y, t: -k * 0.05, life: 0.9 });
    tone(220, 0.4, { type: "triangle", vol: 0.1, slide: 440 });
    for (const s of victimsOf(c)) {
      const d = (s.x - c.x) * c.facing;
      if (!s.alive || s.invuln > 0 || d < 25 || d > 270 || Math.abs(s.y - c.y) > 20) continue;
      if (blockedByShield(s)) continue;
      damage(s, c, 20, 0);
      if (s.alive && s.role === "survivor") {
        s.stuck = 1.2;
        s.vx = 0;
        floater(s.x, s.y - 145, "Fast!", "#a78bfa");
      }
    }
  } },

  // Survivors (from Forsaken, each with one of their abilities)
  noob: { name: "Bloxy Cola", desc: "Dricker en Bloxy Cola och springer fortare en stund", cd: 9, use: (c) => {
    c.sprint = 3;
    burst(c.x, c.y - 60, "#7c2d12", 8, 120);
    tone(500, 0.2, { vol: 0.05, slide: 1000 });
  } },
  "007n7": { name: "Clone", desc: "Blir osynlig och lämnar en klon som springer runt som en bot och lurar mördaren", cd: 12, use: (c) => {
    c.invis = 3;
    decoys.push(makeClone(c));
    burst(c.x, c.y - 45, "#93c5fd", 16, 180);
    noise(0.3, { vol: 0.15, freq: 1800 });
  } },
  veeronica: { name: "Sk8", desc: "Hoppar upp på skateboarden och åker jättefort", cd: 10, use: (c) => {
    c.skate = 2;
    tone(300, 0.3, { type: "square", vol: 0.04, slide: 700 });
  } },
  shedletsky: { name: "Slash", desc: "Hugger med svärdet och bedövar mördaren om den är nära", cd: 12, use: (c) => {
    c.slashT = 0.3;
    sfx.swing();
    for (const h of foesOf(c)) {
      const dx = h.x - c.x;
      if (Math.abs(dx) <= 90 && Math.abs(h.y - c.y) <= HIT_REACH_Y) stunHunter(h, 1.6, Math.sign(dx) || c.facing);
    }
  } },
  guest1337: { name: "Block", desc: "Gör sig redo och stoppar nästa hugg", cd: 10, use: (c) => {
    c.shield = 3;
    tone(400, 0.3, { type: "sine", vol: 0.08, slide: 800 });
  } },
  twotime: { name: "Undying Devotion", desc: "Får ett andra liv första gången hen blir fångad (alltid på)", passive: true },
  chance: { name: "One Shot", desc: "Skjuter med en gammal pistol: bedövar mördaren länge, kort, eller slår slint", cd: 12, use: (c) => {
    const h = nearestFoe(c);
    if (!c.human && h) c.facing = Math.sign(h.x - c.x) || 1;
    const roll = Math.random();
    if (roll < 0.15) {
      // It backfires.
      c.stun = 1;
      floater(c.x, c.y - 145, "Slint!", "#fca5a5");
      burst(c.x + c.facing * 20, c.y - 50, "#9ca3af", 10, 140);
      noise(0.2, { vol: 0.2, freq: 600 });
      return;
    }
    projectiles.push({ kind: "bullet", x: c.x + c.facing * 26, y: c.y - 50, vx: c.facing * 1100, vy: 0, owner: c, life: 0.8, stun: roll < 0.5 ? 2.5 : 1 });
    tone(140, 0.2, { type: "square", vol: 0.12, slide: 60 });
    noise(0.15, { vol: 0.35, freq: 900 });
  } },
  janedoe: { name: "Crystal Pitch", desc: "Kastar en kristallburk som bedövar mördare där den slår ner", cd: 12, use: (c) => {
    const h = nearestFoe(c);
    if (!c.human && h) c.facing = Math.sign(h.x - c.x) || 1;
    // A lob that lands about 270 px ahead; a bot aims it at the killer.
    const reach = !c.human && h ? clamp(Math.abs(h.x - c.x) / 0.75, 150, 520) : 360;
    projectiles.push({ kind: "jar", x: c.x + c.facing * 20, y: c.y - 60, py: c.y - 60, vx: c.facing * reach, vy: -260, owner: c, life: 3 });
    sfx.swing();
  } },
  elliot: { name: "Pizza Throw", desc: "Kastar en pizza som läker den som tar den", cd: 12, use: (c) => {
    projectiles.push({ kind: "pizza", x: c.x + c.facing * 20, y: c.y - 60, py: c.y - 60, vx: c.facing * 260, vy: -420, owner: c, life: 4 });
    tone(600, 0.15, { vol: 0.05 });
  } },
  dusekkar: { name: "Spawn Protection", desc: "Ger en skyddsbubbla till den överlevare som behöver den mest", cd: 12, use: (c) => {
    // The ally closest to a killer, within reach; otherwise himself.
    let best = c, bd = Infinity;
    for (const s of mode === "ffa" ? [] : survivors()) {
      if (!s.alive || s === c || Math.hypot(s.x - c.x, s.y - c.y) > 450) continue;
      const h = nearestHunter(s);
      const d = h ? Math.hypot(h.x - s.x, h.y - s.y) : Infinity;
      if (d < bd) { bd = d; best = s; }
    }
    best.shield = 4;
    burst(best.x, best.y - 50, "#67e8f9", 14, 160);
    tone(500, 0.3, { type: "sine", vol: 0.08, slide: 900 });
  } },
  builderman: { name: "Dispenser", desc: "Bygger en automat som läker alla som står nära", cd: 16, use: (c) => {
    if (!c.onGround) return false;
    dispensers.push({ x: c.x, y: c.y, life: 10 });
    tone(330, 0.1, { vol: 0.05 });
    tone(440, 0.1, { vol: 0.05, delay: 0.1 });
    tone(550, 0.15, { vol: 0.05, delay: 0.2 });
  } },
  taph: { name: "Subspace Tripmine", desc: "Lägger en mina som fångar mördaren om den kliver på den", cd: 10, use: (c) => {
    if (!c.onGround) return false;
    const mine = traps.filter((t) => t.owner === c);
    if (mine.length >= 2) traps.splice(traps.indexOf(mine[0]), 1);
    traps.push({ kind: "mine", x: c.x, y: c.y, owner: c, t: 0 });
    tone(900, 0.1, { vol: 0.05 });
  } },
};

let decoys = []; // 007n7's clones
let dispensers = []; // Builderman's healing dispensers

// A survivor's power landed on a killer: stunned and knocked back a little.
function stunHunter(h, secs, dir) {
  h.stun = Math.max(h.stun, secs);
  h.vx = dir * 300;
  h.vy = -220;
  h.onGround = false;
  burst(h.x, h.y - 50, "#fde047", 12, 200);
  floater(h.x, h.y - 125, "Bedövad!", "#ffd166");
  sfx.hit();
}

// Jane Doe's jar shatters, stunning killers close by.
function jarBurst(p) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 80, life: 0.5, t: 0, color: i % 2 ? "#67e8f9" : "#e0f2fe", size: 4 });
  }
  tone(1400, 0.2, { type: "triangle", vol: 0.06, slide: 700 });
  for (const h of foesOf(p.owner)) {
    if (Math.hypot(h.x - p.x, h.y - 45 - p.y) < 100) stunHunter(h, 1.3, Math.sign(h.x - p.x) || 1);
  }
}

// 007n7's clone is a character of its own that runs about like a survivor bot.
// Killers chase it like anyone else; one hit, or 6 seconds, and it's gone.
function makeClone(c) {
  const d = makeChar(0, 0);
  resetChar(d);
  const id = lookOf(c).id;
  Object.assign(d, {
    clone: true, name: c.name, color: c.color, role: "survivor", life: 6, hp: c.hp,
    botSurvivor: id, botSkinS: c.human ? save[c.human].skinOn[id] : c.botSkinS,
    x: c.x, y: c.y, vx: -c.facing * 220, vy: c.vy, onGround: c.onGround, surf: c.surf, lastSurf: c.lastSurf, facing: -c.facing,
  });
  return d;
}

function popClone(d, caught) {
  d.alive = false;
  burst(d.x, d.y - 45, "#93c5fd", 22, 220);
  floater(d.x, d.y - 120, caught ? "Det var en klon!" : "Puff!", "#93c5fd");
  noise(0.25, { vol: 0.15, freq: 1800 });
}

function updateHelpers(dt) {
  for (const d of decoys) {
    d.life -= dt;
    const inp = state === "round" && mode !== "ffa" && hunters().length ? survivorInput(d, dt) : wanderInput(d, dt);
    stepChar(d, inp, dt);
    if (d.life <= 0 && d.alive) popClone(d, false);
  }
  decoys = decoys.filter((d) => d.alive);
  for (const d of dispensers) {
    d.life -= dt;
    for (const s of survivors()) {
      if (!s.alive || s.hp >= 100 || Math.abs(s.x - d.x) > 70 || Math.abs(s.y - d.y) > 30) continue;
      s.hp = Math.min(100, s.hp + 6 * dt);
      if (Math.random() < 0.05) particles.push({ x: s.x + rand(-10, 10), y: s.y - 60, vx: 0, vy: -50, life: 0.5, t: 0, color: "#4ade80", size: 4 });
    }
  }
  dispensers = dispensers.filter((d) => d.life > 0);
}

function drawHelpers() {
  for (const d of dispensers) {
    ctx.globalAlpha = Math.min(1, d.life);
    depth3d(d.x - 15, d.y - 42, 30, 42, 4, "#2563eb", 0, 6, -6);
    ctx.beginPath(); ctx.roundRect(d.x - 15, d.y - 42, 30, 42, 4); fillStroke("#2563eb", 2.5);
    ctx.beginPath(); ctx.roundRect(d.x - 10, d.y - 36, 20, 16, 3); fillStroke("#f8fafc", 2);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(d.x - 2, d.y - 34, 4, 12);
    ctx.fillRect(d.x - 6, d.y - 30, 12, 4);
    ctx.globalAlpha = 1;
  }
}

function drawPizza(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(0, 14); ctx.closePath(); fillStroke("#fbbf24", 2.5);
  ctx.beginPath(); ctx.roundRect(-15, -12, 30, 6, 3); fillStroke("#b45309", 2);
  ctx.fillStyle = "#dc2626";
  for (const [px, py] of [[-5, -2], [5, -1], [0, 6]]) { ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

const powerOf = (c) => POWERS[lookOf(c).id];

function usePower(c) {
  const pw = powerOf(c);
  if (!pw || pw.passive || c.powerCd > 0 || !c.alive || c.hold > 0 || c.stun > 0 || c.stuck > 0) return;
  if (pw.use(c) === false) return;
  c.powerCd = pw.cd;
  floater(c.x, c.y - 140, pw.name + "!", "#c4b5fd");
}

function blockedByShield(s) {
  if (s.shield <= 0) return false;
  s.shield = 0;
  s.invuln = 0.5;
  burst(s.x, s.y - 50, "#67e8f9", 16, 220);
  floater(s.x, s.y - 125, "Sköld!", "#67e8f9");
  tone(900, 0.15, { vol: 0.06 });
  return true;
}

// Every hit on a survivor goes through here, so the shield can stop it.
function hitSurvivor(s, from, amount, dir) {
  if (!s.alive || s.invuln > 0) return false;
  if (!blockedByShield(s)) damage(s, from, amount, dir);
  return true;
}

function updatePowers(dt) {
  for (const e of fx) e.t += dt;
  fx = fx.filter((e) => e.t < e.life);
  for (const c of cast) {
    const lk = c.alive && lookOf(c);
    if (lk && lk.trail && c.onGround && Math.abs(c.vx) > 40 && Math.random() < 0.35) {
      particles.push({ x: c.x - c.facing * 8 + rand(-6, 6), y: c.y - 3, vx: rand(-8, 8), vy: -12, life: 0.9, t: 0, color: lk.trail, size: 2.5 });
    }
    const fx = lk && lk.fx;
    if (fx && Math.random() < 0.12) {
      const col = fx === "ember" ? pick(["#f97316", "#fde047", "#dc2626"]) : fx === "greenflame" ? pick(["#22c55e", "#4ade80", "#15803d"])
        : fx === "frost" ? "#e0f2fe" : pick(["#fde047", "#ffffff", "#a5f3fc"]);
      particles.push({ x: c.x + rand(-16, 16), y: c.y - rand(10, 85), vx: rand(-15, 15), vy: fx === "frost" ? 30 : -50, life: 0.6, t: 0, color: col, size: fx === "sparkle" ? 2.5 : 3 });
    }
    if (c.alive && c.rage > 0 && Math.random() < 0.3) {
      particles.push({ x: c.x + rand(-14, 14), y: c.y - rand(20, 80), vx: 0, vy: -60, life: 0.4, t: 0, color: "#dc2626", size: 3 });
    }
    if (c.alive && (c.sprint > 0 || c.lowGrav > 0) && Math.random() < 0.25) {
      particles.push({ x: c.x - c.facing * 18, y: c.y - rand(10, 80), vx: -c.facing * 80, vy: 0, life: 0.3, t: 0, color: c.lowGrav > 0 ? "#c4b5fd" : "#ffffff", size: 3 });
    }
  }

  // c00lkidd's lunge hits the first survivor it runs into.
  for (const c of cast) {
    if (c.role !== "hunter" || c.dash <= 0 || c.dashHit) continue;
    for (const s of victimsOf(c)) {
      if (Math.abs(s.x - c.x) < 42 && Math.abs(s.y - c.y) < HIT_REACH_Y && hitSurvivor(s, c, HIT_DAMAGE, c.facing)) {
        c.dashHit = true;
        c.dash = 0;
        break;
      }
    }
    if (Math.random() < 0.6) particles.push({ x: c.x - c.facing * 20, y: c.y - rand(10, 70), vx: -c.facing * 120, vy: 0, life: 0.25, t: 0, color: "#e5e7eb", size: 3 });
  }

  for (const p of projectiles) {
    p.life -= dt;
    if (p.kind === "ball") p.vy += 500 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const gone = p.x < 0 || p.x > world.width || p.y > GROUND;
    if (p.kind === "nova") {
      // Noli's voidstar implodes when it hits someone or flies its distance, pulling everyone near in.
      const hit = victimsOf(p.owner).some((s) => s.alive && Math.abs(p.x - s.x) < 20 && p.y > s.y - 88 && p.y < s.y);
      if (hit || gone || p.life <= 0) { novaBurst(p); p.life = 0; }
      continue;
    }
    if (p.kind === "jar" || p.kind === "pizza") {
      p.vy += 900 * dt;
      const h = p.kind === "jar" && foesOf(p.owner).find((k) => Math.abs(p.x - k.x) < 30 && p.y > k.y - 100 && p.y < k.y);
      const land = p.vy > 0 ? surfaces.findIndex((q) => p.py <= q.y && p.y >= q.y && p.x >= q.x1 && p.x <= q.x2) : -1;
      if (h || land >= 0 || p.x < 0 || p.x > world.width || p.life <= 0) {
        p.life = 0;
        if (p.kind === "jar") jarBurst(p);
        else if (land >= 0) hearts.push({ x: p.x, y: surfaces[land].y, surf: land, t: 0, pizza: true });
      }
      p.py = p.y;
      continue;
    }
    if (gone) p.life = 0;
    if (p.life <= 0) continue;
    if (p.kind === "hook") {
      // Nosferatu's hook drags the survivor back to him.
      const s = victimsOf(p.owner).find((k) => k.alive && k.invuln <= 0 && Math.abs(p.x - k.x) < 20 && p.y > k.y - 88 && p.y < k.y);
      if (s) {
        p.life = 0;
        if (blockedByShield(s)) continue;
        damage(s, p.owner, 10, 0);
        if (s.alive && s.role === "survivor") {
          s.vx = Math.sign(p.owner.x - s.x) * 720;
          s.vy = -260;
          s.onGround = false;
          s.stun = Math.max(s.stun, 0.6);
          floater(s.x, s.y - 145, "Krokad!", "#dc2626");
        }
      }
      continue;
    }
    if (p.kind === "knife") {
      for (const s of victimsOf(p.owner)) {
        if (Math.abs(p.x - s.x) < 18 && p.y > s.y - 88 && p.y < s.y && hitSurvivor(s, p.owner, HIT_DAMAGE, Math.sign(p.vx))) {
          p.life = 0;
          break;
        }
      }
    } else if (p.kind === "bullet") {
      // Chance's shot.
      const h = foesOf(p.owner).find((k) => Math.abs(p.x - k.x) < 24 && p.y > k.y - 90 && p.y < k.y);
      if (h) {
        p.life = 0;
        stunHunter(h, p.stun, Math.sign(p.vx));
        if (p.stun > 2) floater(h.x, h.y - 150, "Fullträff!", "#fde047");
      }
    }
  }
  projectiles = projectiles.filter((p) => p.life > 0);
  updateHelpers(dt);

  for (const t of traps) {
    t.t += dt;
    if (t.kind === "mine") {
      const h = foesOf(t.owner).find((k) => Math.abs(k.x - t.x) <= 22 && Math.abs(k.y - t.y) <= 6);
      if (h) {
        t.sprung = true;
        h.stun = Math.max(h.stun, 2);
        h.vx = 0;
        burst(t.x, t.y - 10, "#a855f7", 18, 220);
        floater(h.x, h.y - 125, "Fast!", "#c084fc");
        sfx.hit();
      }
      continue;
    }
    for (const s of victimsOf(t.owner)) {
      if (!s.alive || Math.abs(s.x - t.x) > 22 || Math.abs(s.y - t.y) > 6 || s.invuln > 0) continue;
      t.sprung = true;
      if (blockedByShield(s)) break;
      s.stuck = 2;
      s.vx = 0;
      s.x = t.x;
      damage(s, t.owner, 15, 0);
      floater(s.x, s.y - 145, "Fast!", "#f97316");
      break;
    }
  }
  traps = traps.filter((t) => !t.sprung && t.t < 25);
}

function novaBurst(p) {
  fx.push({ kind: "ring", x: p.x, y: p.y, t: 0, life: 0.4, r: 140, color: "#a855f7", inward: true });
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({ x: p.x + Math.cos(a) * 120, y: p.y + Math.sin(a) * 120, vx: -Math.cos(a) * 300, vy: -Math.sin(a) * 300, life: 0.4, t: 0, color: "#c084fc", size: 4 });
  }
  tone(300, 0.35, { type: "sine", vol: 0.1, slide: 90 });
  for (const s of victimsOf(p.owner)) {
    if (!s.alive || s.invuln > 0 || Math.hypot(s.x - p.x, s.y - 45 - p.y) > 140) continue;
    if (blockedByShield(s)) continue;
    damage(s, p.owner, 15, 0);
    if (s.alive && s.role === "survivor") {
      s.vx = Math.sign(p.x - s.x) * 380;
      s.vy = -200;
      s.onGround = false;
    }
  }
}

// When a bot uses its power: a rough rule per character.
function botWantsPower(c) {
  const id = lookOf(c).id;
  if (c.role === "hunter") {
    if (id === "johndoe") return c.onGround && Math.random() < 0.006;
    const t = c.ai.target;
    if (!t || !t.alive) return false;
    const dx = t.x - c.x, adx = Math.abs(dx), sameLevel = Math.abs(t.y - c.y) < 30, ahead = dx * c.facing > 0;
    switch (id) {
      case "slasher": return Math.hypot(dx, t.y - c.y) < 200 && Math.random() < 0.03;
      case "c00lkidd": return sameLevel && ahead && adx > 80 && adx < 420 && Math.random() < 0.03;
      case "1x1x1x1": return sameLevel && ahead && adx > 90 && adx < 550 && Math.random() < 0.03;
      case "noli": return sameLevel && ahead && adx > 100 && adx < 450 && Math.random() < 0.03;
      case "guest666": return Math.hypot(dx, t.y - c.y) < 200 && Math.random() < 0.04;
      case "nosferatu": return sameLevel && ahead && adx > 110 && adx < 420 && Math.random() < 0.03;
      case "azure": return sameLevel && ahead && c.onGround && adx > 40 && adx < 250 && Math.random() < 0.03;
    }
    return false;
  }
  const h = nearestFoe(c);
  if (!h) return false;
  const d = Math.hypot(h.x - c.x, h.y - c.y), sameLevel = Math.abs(h.y - c.y) < 40;
  const threatened = (s) => { const k = nearestHunter(s); return k && Math.hypot(k.x - s.x, k.y - s.y) < 160; };
  switch (id) {
    case "shedletsky": return d < 85 && sameLevel && Math.random() < 0.08;
    case "chance": return d < 380 && sameLevel && h.stun <= 0 && Math.random() < 0.03;
    case "janedoe": return d < 320 && d > 80 && h.stun <= 0 && Math.random() < 0.03;
    case "elliot": return survivors().some((s) => s.alive && s.hp <= 60 && Math.abs(s.x - c.x) < 200 && Math.abs(s.y - c.y) < 40) && Math.random() < 0.02;
    case "dusekkar": return survivors().some((s) => s.alive && s !== c && Math.hypot(s.x - c.x, s.y - c.y) < 450 && threatened(s)) && Math.random() < 0.03;
    case "builderman": return c.onGround && c.hp <= 70 && d > 250 && Math.random() < 0.02;
    case "taph": return c.onGround && d > 150 && d < 500 && Math.random() < 0.006;
  }
  return d < 140 && Math.random() < 0.03;
}

// Above a player's head: their power, its key and how long until it's ready.
function drawPowerBadge(c, x, y) {
  const pw = powerOf(c);
  if (!pw || pw.passive) return;
  const r = 12;
  const ready = c.powerCd <= 0;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fillStroke(ready ? "#c4b5fd" : "#d1d5db", 2.5);
  if (!ready) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - c.powerCd / pw.cd));
    ctx.closePath();
    ctx.fillStyle = "#a78bfa";
    ctx.fill();
  }
  text(c.human === 1 ? "E" : "⇧", x, y + 1, { size: 14, color: ready ? INK : "#4b5563", outline: null });
}

// John Doe's trap: a pool of shadow with red code in it.
function drawTraps() {
  for (const t of traps) {
    if (t.kind === "mine") {
      // Taph's subspace tripmine: a small purple box that blinks.
      ctx.globalAlpha = 0.55 + Math.sin(t.t * 6) * 0.25;
      ctx.beginPath(); ctx.roundRect(t.x - 8, t.y - 12, 16, 12, 3); fillStroke("#7e22ce", 2);
      ctx.fillStyle = "#e9d5ff"; ctx.fillRect(t.x - 2, t.y - 9, 4, 4);
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.fillStyle = "rgba(10,10,10,0.85)";
    ctx.beginPath(); ctx.ellipse(t.x, t.y - 2, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(t.t * 3) % 2 ? "01" : "10", t.x + Math.sin(t.t * 2) * 8, t.y - 1);
  }
}

function drawProjectiles() {
  for (const e of fx) {
    if (e.t < 0) continue;
    const k = e.t / e.life;
    if (e.kind === "ring") {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = e.color; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (e.inward ? 1 - k : k), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.kind === "vine") {
      // Azure's vines shoot up, then sink back.
      const h = 70 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
      ctx.beginPath(); ctx.moveTo(e.x - 9, e.y); ctx.quadraticCurveTo(e.x - 6, e.y - h * 0.6, e.x + 2, e.y - h); ctx.quadraticCurveTo(e.x + 4, e.y - h * 0.5, e.x + 9, e.y); ctx.closePath();
      fillStroke("#3b0764", 2.5);
      ctx.fillStyle = "#c084fc";
      ctx.beginPath(); ctx.arc(e.x + 1, e.y - h * 0.55, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === "knife") {
      ctx.rotate(-Math.sign(p.vx) * Math.PI / 2 + (p.sprite === "greensword" ? gameTime * 20 : 0));
      ctx.translate(0, -18);
      drawWeapon(p.sprite || "knife");
    } else if (p.kind === "nova") {
      ctx.fillStyle = "rgba(168,85,247,0.4)";
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(gameTime * 8);
      drawStar(0, 0, 11, 4, "#ffffff");
    } else if (p.kind === "hook") {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "#7f1d1d"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y - 50); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.translate(p.x, p.y);
      ctx.scale(Math.sign(p.vx), 1);
      ctx.strokeStyle = INK; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 6, 8, -Math.PI / 2, Math.PI * 0.9); ctx.stroke();
      ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 3;
      ctx.stroke();
    } else if (p.kind === "bullet") {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-Math.sign(p.vx) * 16, -1.5, Math.sign(p.vx) * 16, 3);
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); fillStroke("#374151", 1.5);
    } else if (p.kind === "jar") {
      ctx.rotate(gameTime * 10);
      ctx.beginPath(); ctx.roundRect(-7, -9, 14, 18, 4); fillStroke("rgba(103,232,249,0.85)", 2);
      ctx.beginPath(); ctx.roundRect(-5, -12, 10, 4, 1); fillStroke("#78716c", 1.5);
    } else if (p.kind === "pizza") {
      ctx.rotate(gameTime * 8);
      drawPizza(0, 0, 0.8);
    }
    ctx.restore();
  }
}

// ---------- Bots ----------
function steerTo(x, tx) {
  return clamp((tx - x) / 40, -1, 1);
}

// Walk, jump and drop toward x on a surface, one hop at a time.
function navTo(c, goalSurf, gx) {
  const inp = { move: 0, jump: false, down: false, hit: false };
  if (c.climbing) return { ...inp, jump: true };
  if (!c.onGround) {
    if (c.ai.aim != null) inp.move = steerTo(c.x, c.ai.aim);
    return inp;
  }
  const hop = nextHop(c.surf, goalSurf);
  if (!hop) {
    c.ai.aim = null;
    inp.move = steerTo(c.x, gx);
    return inp;
  }
  const p = surfaces[hop.to];
  if (hop.up) {
    const sx = clamp(c.x, hop.x1, hop.x2);
    if (Math.abs(c.x - sx) < 8) {
      inp.jump = true;
      c.ai.aim = clamp(gx, p.x1 + 25, p.x2 - 25);
      inp.move = steerTo(c.x, c.ai.aim);
    } else inp.move = steerTo(c.x, sx);
  } else {
    const dx = hop.xs.reduce((b, x) => (Math.abs(x - c.x) < Math.abs(b - c.x) ? x : b));
    if (Math.abs(c.x - dx) < 8) {
      inp.down = c.surf !== 0;
      c.ai.aim = clamp(gx, p.x1 + 20, p.x2 - 20);
      inp.move = c.surf === 0 ? 0 : 0.2 * Math.sign(c.ai.aim - c.x);
    } else inp.move = steerTo(c.x, dx);
  }
  return inp;
}

function wanderInput(c, dt) {
  c.ai.t -= dt;
  if (c.ai.t <= 0 || c.ai.goalSurf >= surfaces.length) {
    c.ai.t = rand(1.5, 4);
    c.ai.goalSurf = Math.floor(Math.random() * surfaces.length);
    const s = surfaces[c.ai.goalSurf];
    c.ai.gx = rand(s.x1 + 20, s.x2 - 20);
  }
  const inp = navTo(c, c.ai.goalSurf, c.ai.gx);
  if (c.onGround && Math.random() < 0.004) inp.jump = true;
  return inp;
}

function survivorInput(c, dt) {
  const hs = hunters();
  const h = nearestHunter(c);
  const near = Math.hypot(h.x - c.x, h.y - c.y);
  c.ai.t -= dt;
  if (c.ai.t <= 0) {
    c.ai.t = near < 180 ? rand(0.25, 0.45) : rand(0.6, 1.2);
    let best = -Infinity;
    surfaces.forEach((s, i) => {
      for (let x = s.x1 + 25; x <= s.x2 - 25; x += 60) {
        let score = Infinity;
        for (const k of hs) score = Math.min(score, Math.min(Math.abs(x - k.x), 700) + Math.abs(s.y - k.y) * 1.6);
        score -= Math.abs(x - c.x) * 0.25 + Math.abs(s.y - c.y) * 0.3;
        // Running past a killer on its own level is asking to get caught.
        for (const k of hs) if (Math.abs(s.y - c.y) < 10 && Math.abs(c.y - k.y) < 40 && (x - k.x) * (c.x - k.x) < 0) score -= 400;
        if (x < 70 || x > world.width - 70) score -= 120; // corners are traps
        if (c.hp < 70) for (const hh of hearts) if (hh.surf === i && Math.abs(hh.x - x) < 70) score += 260;
        score += Math.random() * 90;
        if (score > best) { best = score; c.ai.goalSurf = i; c.ai.gx = x; }
      }
    });
  }
  const inp = navTo(c, c.ai.goalSurf, c.ai.gx);
  // Panic hop when the hunter is right there.
  if (near < 75 && c.onGround && Math.random() < 0.06) inp.jump = true;
  return inp;
}

function hunterInput(c, dt) {
  const prey = [...victimsOf(c).filter((s) => s.alive && s.invis <= 0), ...decoys.filter((d) => d.alive)];
  if (!prey.length) return wanderInput(c, dt);
  c.ai.t -= dt;
  if (c.ai.t <= 0 || !c.ai.target || !c.ai.target.alive || c.ai.target.invis > 0) {
    c.ai.t = rand(0.8, 1.6);
    let best = Infinity;
    for (const s of prey) {
      const cost = Math.abs(s.x - c.x) + Math.abs(s.y - c.y) * 2.2 - (s === c.ai.target ? 120 : 0) + Math.random() * 60;
      if (cost < best) { best = cost; c.ai.target = s; }
    }
  }
  const t = c.ai.target;
  const dx = t.x - c.x, dy = t.y - c.y;
  let inp;
  if (Math.abs(dx) < HIT_RANGE - 8 && Math.abs(dy) < HIT_REACH_Y) {
    inp = { move: Math.sign(dx || 1) * 0.15, jump: false, down: false, hit: false };
    c.ai.react -= dt;
    if (c.ai.react <= 0) { inp.hit = true; c.ai.react = rand(0.12, 0.35); }
  } else {
    c.ai.react = rand(0.1, 0.3);
    inp = navTo(c, t.lastSurf, t.x);
  }
  return inp;
}

function botInput(c, dt) {
  if (state === "round") {
    const inp = c.role === "hunter" || c.fighter ? hunterInput(c, dt) : survivorInput(c, dt);
    if (c.onGround && c.surf === 0 && carComing(c)) inp.jump = true;
    return { ...inp, power: c.powerCd <= 0 && c.hold <= 0 && botWantsPower(c) };
  }
  if (state === "result") {
    const won = mode === "ffa" ? winner === c : winner === "hunter" ? c.role === "hunter" : c.role === "survivor" && c.alive;
    return { ...NO_INPUT, jump: won && Math.random() < 0.05 };
  }
  return wanderInput(c, dt);
}

// ---------- Update ----------
function update(dt) {
  gameTime += dt;
  timer -= dt;

  // Lobby controls: Space starts the match. Double-tapping Space brings in
  // player 2, or sends them away again; Backspace sends them away too.
  if (state === "lobby" && modePick) {
    const any = (k) => tapped(P1_KEYS[k]) || tapped(P2_KEYS[k]);
    if (any("left")) { modePick.idx = (modePick.idx + MODES.length - 1) % MODES.length; tone(520, 0.06, { vol: 0.04 }); }
    if (any("right")) { modePick.idx = (modePick.idx + 1) % MODES.length; tone(520, 0.06, { vol: 0.04 }); }
    if (any("hit")) startCountdown(MODES[modePick.idx].id);
    else if (any("down") || pressed.has("Backspace")) modePick = null;
  } else if (state === "lobby") {
    if (p2Joined && pressed.has("Backspace")) {
      leaveP2();
    }
    for (const c of cast) {
      if (!c.human) continue;
      const sh = shops[c.human];
      if (sh) shopKeys(c, sh);
      else if (nearShop(c) && tapped(c.keys.jump)) openShop(c);
    }
    for (const sh of Object.values(shops)) if (sh) sh.msgT -= dt;
    // A single Space waits a moment to see whether a second one follows.
    if (pressed.has("Space") && !shops[1] && timer > LOBBY_COUNTDOWN) {
      if (spaceWait > 0) {
        spaceWait = 0;
        if (p2Joined) leaveP2(); else joinP2();
      } else spaceWait = DOUBLE_TAP;
    } else if (spaceWait > 0) {
      spaceWait -= dt;
      if (spaceWait <= 0 && !shops[1] && timer > LOBBY_COUNTDOWN) {
        modePick = { idx: Math.max(0, MODES.findIndex((m) => m.id === mode)) };
        tone(520, 0.08, { vol: 0.05 });
        tone(780, 0.12, { vol: 0.05, delay: 0.06 });
      }
    }
  }

  // Countdown beeps.
  const whole = Math.ceil(timer);
  if (whole !== lastWholeSecond) {
    lastWholeSecond = whole;
    if (state === "lobby" && whole <= 5 && whole > 0) sfx.beep();
    if (state === "round" && whole <= 5 && whole > 0) tone(880, 0.08, { vol: 0.04 });
  }

  for (const c of cast) {
    const inp = c.human ? (shops[c.human] || modePick ? NO_INPUT : humanInput(c)) : botInput(c, dt);
    if (inp.hit) swing(c);
    if (inp.power) usePower(c);
    stepChar(c, inp, dt);
  }
  updatePowers(dt);
  if (state === "round") updateCars(dt);
  for (const t of world.tramps) t.squash = Math.max(0, (t.squash || 0) - dt);
  shake = Math.max(0, shake - dt);
  sceneFade = Math.max(0, sceneFade - dt * 2.2);

  if (state === "round") {
    // Hearts heal survivors.
    heartTimer -= dt;
    if (heartTimer <= 0) {
      heartTimer = rand(6, 10);
      if (hearts.length < HEART_MAX) {
        const i = Math.floor(Math.random() * surfaces.length);
        const s = surfaces[i];
        hearts.push({ x: rand(s.x1 + 25, s.x2 - 25), y: s.y, surf: i, t: 0 });
      }
    }
    for (const hh of hearts) hh.t += dt;
    for (const s of pickers()) {
      if (!s.alive || s.hp >= 100) continue;
      const i = hearts.findIndex((hh) => Math.abs(hh.x - s.x) < 30 && Math.abs(hh.y - s.y) < 60);
      if (i >= 0) {
        const hh = hearts.splice(i, 1)[0];
        s.hp = Math.min(100, s.hp + HEART_HEAL);
        burst(hh.x, hh.y - 25, "#ff6fae", 12, 180);
        floater(s.x, s.y - 100, `+${HEART_HEAL}%`, "#ff6fae");
        sfx.heart();
      }
    }

    // One survivor left: Forsaken's last man standing.
    const left = survivors().filter((c) => c.alive).length;
    if (mode !== "ffa" && left === 1 && survivorsLeft > 1) {
      floater(W / 2, 230, "Sista överlevaren!", "#facc15", 2.6, true, 54);
      tone(220, 0.6, { type: "sawtooth", vol: 0.07, slide: 110 });
      shake = 0.25;
    }
    survivorsLeft = left;

    if (mode === "ffa") { if (cast.filter((c) => c.alive).length <= 1 || timer <= 0) { if (timer > 0) slowMo = 1.2; endFfa(); } }
    else if (!survivors().some((c) => c.alive)) { slowMo = 1.2; endRound("hunter"); }
    else if (timer <= 0) endRound("survivors");
  } else if (state === "lobby" && timer <= 0) {
    startRound();
  } else if (state === "result" && timer <= 0) {
    startLobby();
  }

  for (const p of particles) {
    p.t += dt;
    p.vy += 700 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter((p) => p.t < p.life);
  for (const f of floaters) f.t += dt;
  floaters = floaters.filter((f) => f.t < f.life);
  for (const co of callouts) co.t += dt;
  callouts = callouts.filter((co) => co.t < co.life);

  pressed.clear();
}

// ---------- Drawing helpers ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillStroke(fill, lw = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function text(str, x, y, { size = 24, color = "#fff", align = "center", outline = INK, weight = 700, ow = 5 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (outline) {
    ctx.lineWidth = ow;
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// mood: happy, neutral, sad, scared, dead, evil
function drawFace(cx, cy, s, mood, f = 0, ink = INK) {
  const k = s / 30;
  const ex = cx + f * 3 * k;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2.2 * k;
  ctx.lineCap = "round";
  if (mood === "dead") {
    for (const sx of [-6, 6]) {
      const x = ex + sx * k, y = cy - 3 * k, d = 3 * k;
      ctx.beginPath();
      ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
      ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
      ctx.stroke();
    }
  } else {
    const r = (mood === "scared" ? 3.4 : 2.6) * k;
    for (const sx of [-6, 6]) {
      ctx.beginPath();
      ctx.arc(ex + sx * k, cy - 3 * k, r, 0, Math.PI * 2);
      if (mood === "scared") { ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); ctx.fillStyle = ink; }
      else ctx.fill();
    }
    if (mood === "scared") {
      for (const sx of [-6, 6]) { ctx.beginPath(); ctx.arc(ex + sx * k, cy - 3 * k, 1.3 * k, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  if (mood !== "dead" && mood !== "scared") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const sx of [-6, 6]) { ctx.beginPath(); ctx.arc(ex + sx * k - 0.9 * k, cy - 4 * k, 0.95 * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = ink;
  }
  if (mood === "evil") {
    ctx.beginPath();
    ctx.moveTo(ex - 10 * k, cy - 10 * k); ctx.lineTo(ex - 3 * k, cy - 7 * k);
    ctx.moveTo(ex + 10 * k, cy - 10 * k); ctx.lineTo(ex + 3 * k, cy - 7 * k);
    ctx.stroke();
  }
  ctx.beginPath();
  const my = cy + 6 * k;
  if (mood === "happy") ctx.arc(ex, my - 3 * k, 6 * k, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === "evil") ctx.arc(ex, my - 4 * k, 7.5 * k, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === "sad") ctx.arc(ex, my + 5 * k, 6 * k, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (mood === "scared") { ctx.ellipse(ex, my + 1 * k, 3 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.moveTo(ex - 5 * k, my); ctx.lineTo(ex + 5 * k, my); }
  ctx.stroke();
  ctx.lineCap = "butt";
}

function healthMood(hp) {
  return hp <= 0 ? "dead" : hp >= 67 ? "happy" : hp >= 34 ? "neutral" : "sad";
}

function moodOf(c) {
  if (!c.alive) return "dead";
  if (c.role === "hunter") return "evil";
  const h = state === "round" ? nearestHunter(c) : null;
  if (c.hurt > 0 || (h && Math.hypot(h.x - c.x, h.y - c.y) < SCARED_DIST)) return "scared";
  return healthMood(c.hp);
}

// ---------- Weapons (drawn along +y from the hand) ----------
function drawWeapon(kind) {
  const steel = "#dfe6ee";
  if (kind === "machete") {
    ctx.beginPath(); ctx.roundRect(-3, -6, 6, 13, 2); fillStroke("#3f2a1d", 2);
    ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(5, 7); ctx.lineTo(8, 40); ctx.quadraticCurveTo(4, 50, -2, 48); ctx.closePath();
    fillStroke("#cbd5e1", 2);
    ctx.fillStyle = "#9a3412";
    ctx.beginPath(); ctx.arc(3, 30, 2.5, 0, Math.PI * 2); ctx.arc(-1, 20, 1.8, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "sword") {
    ctx.beginPath(); ctx.roundRect(-3, -6, 6, 13, 2); fillStroke("#7c4a1e", 2);
    ctx.beginPath(); ctx.roundRect(-10, 6, 20, 5, 2); fillStroke("#facc15", 2);
    ctx.beginPath(); ctx.moveTo(-4, 11); ctx.lineTo(4, 11); ctx.lineTo(4, 46); ctx.lineTo(0, 54); ctx.lineTo(-4, 46); ctx.closePath();
    fillStroke(steel, 2);
  } else if (kind === "fist") {
    // c00lkidd just punches.
  } else if (kind === "spike") {
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(1, 46); ctx.lineTo(-1, 46); ctx.closePath();
    fillStroke("#0a0a0a", 2);
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 30); ctx.stroke();
  } else if (kind === "greensword") {
    ctx.beginPath(); ctx.roundRect(-3, -6, 6, 13, 2); fillStroke("#0a0a0a", 2);
    ctx.beginPath(); ctx.roundRect(-11, 6, 22, 5, 2); fillStroke("#22c55e", 2);
    ctx.beginPath(); ctx.moveTo(-4, 11); ctx.lineTo(4, 11); ctx.lineTo(4, 50); ctx.lineTo(0, 58); ctx.lineTo(-4, 50); ctx.closePath();
    fillStroke("#14532d", 2);
    ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 52); ctx.stroke();
  } else if (kind === "voidstar") {
    ctx.fillStyle = "rgba(196,181,253,0.45)";
    ctx.beginPath(); ctx.arc(0, 8, 14, 0, Math.PI * 2); ctx.fill();
    drawStar(0, 8, 10, 4, "#ffffff");
  } else if (kind === "claws") {
    ctx.lineCap = "round";
    for (const [w, col] of [[6, INK], [3, "#ef4444"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      for (const i of [-1, 0, 1]) { ctx.moveTo(i * 4, 2); ctx.quadraticCurveTo(i * 7, 12, i * 3 + 2, 20); }
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  } else if (kind === "tentacle") {
    const sway = Math.sin(gameTime * 6) * 5;
    ctx.lineCap = "round";
    for (const [w, col] of [[10, INK], [6, "#3b0764"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway + 8, 22, -sway, 44); ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath(); ctx.arc(-sway, 44, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.roundRect(-3, -4, 6, 12, 2); fillStroke("#6b4423", 2);
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, 8);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(4, 9); ctx.lineTo(1, 37); ctx.quadraticCurveTo(-4, 26, -4, 9);
    fillStroke(steel, 2);
  }
}

function drawStar(x, y, r, lw, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fillStroke(fill, lw / 2);
}

// ---------- Shirts and hats ----------
function drawPattern(look, robe) {
  const p = look.pattern;
  if (!p) return;
  ctx.save();
  ctx.beginPath();
  if (robe) ctx.roundRect(-19, -54, 38, 62, 6); else ctx.roundRect(-17, -54, 34, 32, 5);
  ctx.clip();
  ctx.lineWidth = 2;
  if (drawMilestonePattern(p, look)) {
    // one of the Milestone prints
  } else if (p === "c00l") {
    ctx.strokeStyle = "rgba(127,29,29,0.6)";
    ctx.beginPath();
    for (let y = -46; y < -26; y += 6) { ctx.moveTo(-12, y); ctx.quadraticCurveTo(0, y + 3, 12, y); }
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("team c00lkidd", 0, -46);
    ctx.fillText("join today!", 0, -27);
  } else if (p === "check") {
    ctx.strokeStyle = "rgba(20,20,30,0.45)";
    ctx.beginPath();
    for (let x = -14; x < 18; x += 8) { ctx.moveTo(x, -56); ctx.lineTo(x, -20); }
    for (let y = -50; y < -20; y += 8) { ctx.moveTo(-18, y); ctx.lineTo(18, y); }
    ctx.stroke();
  } else if (p === "jersey") {
    ctx.fillStyle = look.patternColor;
    ctx.fillRect(-18, -34, 36, 5);
    ctx.font = `700 13px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("13", 0, -40);
  } else if (p === "collar") {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.moveTo(-12, -55); ctx.lineTo(0, -44); ctx.lineTo(12, -55); ctx.closePath(); ctx.fill();
  } else if (p === "apron") {
    ctx.beginPath(); ctx.roundRect(-11, -48, 22, 30, 3); fillStroke(look.patternColor, 1.5);
  } else if (p === "stripes") {
    ctx.fillStyle = look.patternColor;
    for (let y = -50; y < -20; y += 9) ctx.fillRect(-18, y, 36, 4);
  } else if (p === "vest") {
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-18, -42, 36, 5);
    ctx.fillRect(-11, -56, 5, 36);
    ctx.fillRect(6, -56, 5, 36);
  } else if (p === "flowers") {
    for (const [x, y, c] of [[-9, -46, "#ec4899"], [8, -40, "#f97316"], [-4, -30, "#22c55e"], [10, -27, "#ec4899"]]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p === "star") {
    drawStar(-7, -43, 6, 2, "#facc15");
  } else if (p === "ribs") {
    ctx.strokeStyle = look.patternColor || "#052e16";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -26);
    for (let y = -48; y < -28; y += 6) { ctx.moveTo(-11, y + 2); ctx.quadraticCurveTo(0, y - 3, 11, y + 2); }
    ctx.stroke();
  } else if (p === "roblox") {
    ctx.fillStyle = "#e5e7eb";
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Roblox", 0, -36);
  } else if (p === "vampire") {
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath(); ctx.moveTo(-12, -55); ctx.lineTo(0, -34); ctx.lineTo(12, -55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f5f5f4";
    ctx.beginPath(); ctx.moveTo(-5, -55); ctx.lineTo(0, -44); ctx.lineTo(5, -55); ctx.closePath(); ctx.fill();
  } else if (p === "noli") {
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(0, -56, 18, 36);
    ctx.fillStyle = "#7e22ce";
    for (const [x, y] of [[6, -48], [12, -36], [5, -28]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, -20); ctx.stroke();
  } else if (p === "spawn") {
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -39, 7, 0, Math.PI * 2); ctx.moveTo(0, -48); ctx.lineTo(0, -30); ctx.moveTo(-9, -39); ctx.lineTo(9, -39); ctx.stroke();
  } else if (p === "thomas") {
    ctx.beginPath(); ctx.arc(0, -39, 8, 0, Math.PI * 2); fillStroke("#9ca3af", 2);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(-3, -41, 1.3, 0, Math.PI * 2); ctx.arc(3, -41, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, -38, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (p === "blamejohn") {
    ctx.fillStyle = "#dc2626";
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("BLAME", 0, -42);
    ctx.fillText("JOHN", 0, -34);
  } else if (p === "camo") {
    for (const [x, y, r, col] of [[-10, -48, 5, "#556b2f"], [8, -44, 6, "#a3a380"], [-4, -30, 6, "#4b5a33"], [11, -27, 4, "#556b2f"]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(194,168,120,0.9)";
    ctx.fillRect(-12, -52, 24, 24);
  } else if (p === "spawnmark") {
    ctx.strokeStyle = "#e0e7ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -39, 7, 0, Math.PI * 2); ctx.moveTo(0, -48); ctx.lineTo(0, -30); ctx.moveTo(-9, -39); ctx.lineTo(9, -39); ctx.stroke();
  } else if (p === "suit") {
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.moveTo(-8, -55); ctx.lineTo(0, -36); ctx.lineTo(8, -55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath(); ctx.moveTo(-2, -53); ctx.lineTo(2, -53); ctx.lineTo(3, -38); ctx.lineTo(0, -34); ctx.lineTo(-3, -38); ctx.closePath(); ctx.fill();
  } else if (p === "trench") {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-7, -56, 14, 36);
    ctx.fillStyle = "#dc2626";
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("R", 2, -42);
    ctx.strokeStyle = "#7c4a1e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17, -54); ctx.lineTo(17, -26); ctx.stroke();
  } else if (p === "runes") {
    ctx.fillStyle = INK;
    for (const x of [-11, 11]) for (let y = -50; y < -6; y += 7) ctx.fillRect(x - 1, y, 2, 4);
    ctx.fillStyle = "#7c4a1e"; ctx.fillRect(-19, -28, 38, 5);
    ctx.fillStyle = "#facc15"; ctx.fillRect(-3, -28, 6, 5);
  } else if (p === "hoodie") {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-18, -56, 8, 36); ctx.fillRect(10, -56, 8, 36);
    ctx.fillStyle = "#dc2626";
    ctx.beginPath(); ctx.moveTo(-6, -55); ctx.lineTo(0, -46); ctx.lineTo(6, -55); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(0, -36); ctx.rotate(0.3);
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "#6b7280"; ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  } else if (p === "taph") {
    ctx.fillStyle = look.patternColor || "#facc15";
    ctx.fillRect(-12, -56, 3, 36); ctx.fillRect(9, -56, 3, 36);
    ctx.fillRect(-18, -28, 36, 4);
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(9, -27, 8, 7);
  }
  ctx.restore();
  ctx.beginPath();
  if (robe) ctx.roundRect(-19, -54, 38, 62, 6); else ctx.roundRect(-17, -54, 34, 32, 5);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
}

// phase "back" is behind the head, "mid" over the head under the face, "front" over the face.
function drawHat(look, f, phase) {
  const hc = look.hatColor;
  switch (look.hat) {
    // Forsaken's killers
    case "slasher":
      // A black shroud, and a cracked hockey mask with a muzzle.
      if (phase === "back") { ctx.beginPath(); ctx.roundRect(-21, -92, 42, 44, 12); fillStroke(hc); }
      if (phase === "mid") {
        ctx.beginPath(); ctx.roundRect(-13, -85, 26, 28, 10); fillStroke("#e7e5e4", 2.5);
        ctx.fillStyle = "#b91c1c";
        ctx.beginPath(); ctx.moveTo(-9, -84); ctx.lineTo(-5, -84); ctx.lineTo(-8, -78); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9, -84); ctx.lineTo(5, -84); ctx.lineTo(8, -78); ctx.fill();
      }
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = -6; x <= 6; x += 3) { ctx.moveTo(f * 3 + x, -67); ctx.lineTo(f * 3 + x, -59); }
        ctx.moveTo(f * 3 - 7, -63); ctx.lineTo(f * 3 + 7, -63);
        ctx.stroke();
      }
      break;
    case "johndoe":
      // One eye eaten by black corruption, glowing red.
      if (phase === "front") {
        const ex = f * 5 + f * 6;
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath(); ctx.ellipse(ex, -74, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex, -66); ctx.lineTo(ex + f * 3, -60); ctx.moveTo(ex - f * 2, -82); ctx.lineTo(ex - f * 5, -85); ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(ex, -74, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "domino":
      // 1x1x1x1's green domino crown with an X.
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-15, -100, 30, 16, 3); fillStroke(hc, 2.5);
        ctx.strokeStyle = "#052e16"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-5, -97); ctx.lineTo(5, -87); ctx.moveTo(5, -97); ctx.lineTo(-5, -87); ctx.stroke();
        ctx.fillStyle = "#052e16";
        for (const x of [-11, 11]) { ctx.beginPath(); ctx.arc(x, -92, 1.8, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    case "noli":
      // Half white tragedy mask, half purple skull, under a jagged steel crown.
      if (phase === "mid") {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(-16, -86, 32, 30, 6); ctx.clip();
        ctx.fillStyle = "#7e22ce";
        ctx.fillRect(f > 0 ? -16 : 1, -86, 15, 30);
        ctx.restore();
        ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(f * 9, -64, 3, 0, Math.PI * 1.6); ctx.stroke();
      }
      if (phase === "front") {
        ctx.beginPath();
        ctx.moveTo(-15, -84); ctx.lineTo(-16, -97); ctx.lineTo(-9, -91); ctx.lineTo(-4, -100); ctx.lineTo(0, -92);
        ctx.lineTo(4, -100); ctx.lineTo(9, -91); ctx.lineTo(16, -97); ctx.lineTo(15, -84); ctx.closePath();
        fillStroke("#9ca3af", 2.5);
        drawStar(0, -103, 5, 3, "#1e1b4b");
      }
      break;
    case "guest666":
      // Red horns, and a black cap with a red brim.
      if (phase === "back") {
        ctx.lineCap = "round";
        for (const [w, col] of [[8, INK], [5, "#dc2626"]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          for (const s of [-1, 1]) { ctx.moveTo(s * 12, -84); ctx.quadraticCurveTo(s * 26, -96, s * 16, -108); }
          ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-17, -93, 34, 12, [10, 10, 1, 1]); fillStroke(hc);
        ctx.beginPath(); ctx.roundRect(f > 0 ? 3 : -27, -84, 24, 5, 2); fillStroke("#dc2626", 2.5);
        text("R", 0, -87, { size: 9, color: "#dc2626", outline: null });
      }
      break;
    case "nosferatu":
      // Pointed ears, a high black ponytail and a red masquerade mask.
      if (phase === "back") {
        ctx.beginPath(); ctx.ellipse(-f * 10, -96, 9, 7, 0, 0, Math.PI * 2); fillStroke("#0a0a0a", 2);
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * 14, -78); ctx.lineTo(s * 24, -88); ctx.lineTo(s * 15, -70); ctx.closePath(); fillStroke(look.skin, 2);
        }
      }
      if (phase === "mid") {
        ctx.beginPath(); ctx.roundRect(-16, -88, 32, 9, [6, 6, 2, 2]); fillStroke("#0a0a0a", 2);
        ctx.beginPath(); ctx.roundRect(-14, -80, 28, 11, 4); fillStroke("#991b1b", 2);
      }
      break;
    case "azure":
      // A tall black pointed hat with a glowing purple face on it.
      if (phase === "front") {
        ctx.beginPath(); ctx.moveTo(-22, -82); ctx.lineTo(22, -82); ctx.lineTo(8, -96); ctx.quadraticCurveTo(-2, -116, -f * 14, -122); ctx.quadraticCurveTo(-6, -104, -10, -96); ctx.closePath();
        fillStroke("#18181b", 2.5);
        ctx.fillStyle = "#c084fc";
        ctx.beginPath(); ctx.arc(-3, -96, 1.8, 0, Math.PI * 2); ctx.arc(3, -96, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, -93, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      }
      break;
    // Forsaken's survivors
    case "burger":
      // 007n7's Burger Bob hat with a second one stacked on top.
      if (phase === "front") {
        for (const [y, k] of [[0, 1], [-16, 0.7]]) {
          ctx.save();
          ctx.translate(0, -86 + y);
          ctx.scale(k, k);
          ctx.beginPath(); ctx.roundRect(-15, -6, 30, 6, 2); fillStroke("#d97706", 2);
          ctx.beginPath(); ctx.roundRect(-16, -11, 32, 5, 2); fillStroke("#78350f", 2);
          ctx.fillStyle = "#22c55e"; ctx.fillRect(-16, -7, 32, 2);
          ctx.beginPath(); ctx.ellipse(0, -11, 15, 9, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke("#f59e0b", 2);
          ctx.fillStyle = "#fef3c7";
          for (const sx of [-7, 0, 6]) { ctx.beginPath(); ctx.ellipse(sx, -16, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      }
      break;
    case "tv":
      // Veeronica's TV head with a pink screen, under a red cap with antennae.
      if (phase === "mid") {
        ctx.beginPath(); ctx.roundRect(-12, -82, 24, 21, 4); fillStroke("#fbcfe8", 2);
        ctx.strokeStyle = "rgba(190,24,93,0.25)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = -79; y < -62; y += 3) { ctx.moveTo(-11, y); ctx.lineTo(11, y); }
        ctx.stroke();
      }
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -92); ctx.lineTo(-12, -104); ctx.moveTo(6, -92); ctx.lineTo(12, -104); ctx.stroke();
        for (const x of [-12, 12]) { ctx.beginPath(); ctx.arc(x, -105, 3, 0, Math.PI * 2); fillStroke("#f472b6", 1.5); }
        ctx.beginPath(); ctx.roundRect(-17, -94, 34, 11, [10, 10, 1, 1]); fillStroke("#dc2626");
        ctx.beginPath(); ctx.roundRect(f > 0 ? 3 : -27, -86, 24, 5, 2); fillStroke("#dc2626", 2.5);
      }
      break;
    case "curly":
      // Shedletsky's curly brown hair.
      if (phase === "front") {
        ctx.fillStyle = "#7c4a1e"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [x, y] of [[-12, -86], [-4, -89], [4, -89], [12, -86], [-15, -79], [15, -79]]) { ctx.moveTo(x + 6, y); ctx.arc(x, y, 6, 0, Math.PI * 2); }
        ctx.fill(); ctx.stroke();
      }
      break;
    case "bluehair":
      // Guest 1337's wavy blue hair, combed to one side.
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-17, -92, 34, 11, [9, 9, 2, 2]); fillStroke("#1d4ed8", 2.5);
        ctx.beginPath(); ctx.moveTo(-f * 14, -84); ctx.quadraticCurveTo(f * 4, -98, f * 20, -82); ctx.lineTo(f * 6, -86); ctx.closePath(); fillStroke("#2563eb", 2);
      }
      break;
    case "spiky":
      // Two Time's spiky dark blue hair.
      if (phase === "front") {
        ctx.beginPath();
        ctx.moveTo(-17, -80);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-17 + i * 34 / 6, i % 2 ? -100 : -86);
        ctx.lineTo(17, -80); ctx.closePath();
        fillStroke(hc, 2.5);
      }
      break;
    case "fedora":
      // Chance: fedora, headphones and sunglasses.
      if (phase === "mid") {
        ctx.beginPath(); ctx.roundRect(-13, -79, 26, 8, 3); fillStroke("#0a0a0a", 2);
        ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-10, -73); ctx.lineTo(-6, -78); ctx.stroke();
      }
      if (phase === "front") {
        for (const x of [-17, 17]) {
          ctx.beginPath(); ctx.arc(x, -72, 6, 0, Math.PI * 2); fillStroke("#0a0a0a", 2);
          text("L", x, -72, { size: 7, color: "#f8fafc", outline: null });
        }
        ctx.beginPath(); ctx.roundRect(-14, -101, 28, 16, [6, 6, 1, 1]); fillStroke("#0a0a0a");
        ctx.beginPath(); ctx.roundRect(-23, -88, 46, 5, 2); fillStroke("#0a0a0a", 2.5);
        ctx.fillStyle = "#f8fafc"; ctx.fillRect(-14, -92, 28, 2);
        ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(-9, -91, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "jane":
      // Jane Doe: pink ponytail, black brimmed hat, eyes in shadow.
      if (phase === "back") { ctx.beginPath(); ctx.ellipse(f * 14, -66, 6, 13, f * 0.3, 0, Math.PI * 2); fillStroke("#f472b6", 2); }
      if (phase === "mid") {
        ctx.fillStyle = "rgba(15,10,20,0.5)";
        ctx.fillRect(-16, -82, 32, 13);
        ctx.beginPath(); ctx.roundRect(-16, -86, 32, 6, [6, 6, 0, 0]); fillStroke("#f472b6", 2);
      }
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-13, -99, 26, 14, [5, 5, 1, 1]); fillStroke("#1c1917");
        ctx.beginPath(); ctx.roundRect(-23, -87, 46, 5, 2); fillStroke("#1c1917", 2.5);
      }
      break;
    case "visor":
      // Elliot's red Roblox visor.
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-17, -88, 34, 7, 2); fillStroke("#dc2626", 2.5);
        ctx.beginPath(); ctx.roundRect(f > 0 ? 4 : -30, -84, 26, 5, 2); fillStroke("#dc2626", 2.5);
        ctx.font = `700 6px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText("ROBLOX", 0, -83);
      }
      break;
    case "bluepumpkin":
      // Dusekkar's dark blue pumpkin head with branches sticking out.
      if (phase === "mid") {
        ctx.strokeStyle = "rgba(147,197,253,0.4)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -85); ctx.lineTo(-7, -57); ctx.moveTo(7, -85); ctx.lineTo(7, -57); ctx.stroke();
      }
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath();
        for (const s of [-1, 1]) { ctx.moveTo(s * 15, -80); ctx.lineTo(s * 25, -92); ctx.lineTo(s * 30, -90); ctx.moveTo(s * 22, -88); ctx.lineTo(s * 22, -98); }
        ctx.moveTo(0, -86); ctx.lineTo(1, -94);
        ctx.stroke();
      }
      break;
    case "bchat":
      // Builderman's Builders Club hard hat.
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -84, 17, 12, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke("#facc15");
        ctx.beginPath(); ctx.roundRect(-22, -86, 44, 5, 2); fillStroke("#facc15", 2.5);
        ctx.fillStyle = "#f97316"; ctx.fillRect(-2, -95, 4, 9);
      }
      break;
    case "taphhood":
      // Taph: a dark hood, the face in shadow, and a bandit mask.
      if (phase === "back") { ctx.beginPath(); ctx.roundRect(-21, -92, 42, 40, 13); fillStroke(hc); }
      if (phase === "mid") {
        ctx.fillStyle = "rgba(10,10,10,0.55)";
        ctx.fillRect(-16, -86, 32, 18);
        ctx.beginPath(); ctx.roundRect(-16, -69, 32, 11, 3); fillStroke("#facc15", 2);
      }
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-19, -92, 38, 11, [11, 11, 3, 3]); fillStroke(hc, 2.5);
      }
      break;
    default:
      drawAccessory(look.hat, hc, f, phase);
  }
}

// Hats and things worn by the skins. phase works as in drawHat.
function drawAccessory(kind, col, f, phase) {
  switch (kind) {
    case "partyhat":
      if (phase === "front") {
        ctx.beginPath(); ctx.moveTo(-11, -85); ctx.lineTo(11, -85); ctx.lineTo(2, -114); ctx.closePath(); fillStroke(col, 2.5);
        ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-7, -93); ctx.lineTo(8, -97); ctx.moveTo(-3, -103); ctx.lineTo(6, -105); ctx.stroke();
        ctx.beginPath(); ctx.arc(2, -115, 4, 0, Math.PI * 2); fillStroke("#22d3ee", 2);
      }
      break;
    case "fedora2":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-14, -101, 28, 16, [6, 6, 1, 1]); fillStroke(col);
        ctx.beginPath(); ctx.roundRect(-23, -88, 46, 5, 2); fillStroke(col, 2.5);
        ctx.fillStyle = "#f8fafc"; ctx.fillRect(-14, -92, 28, 2);
      }
      break;
    case "chef":
      if (phase === "front") {
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(-13, -96, 26, 12, 2);
        for (const [x, r] of [[-9, 8], [0, 10], [9, 8]]) { ctx.moveTo(x + r, -100); ctx.arc(x, -100, r, 0, Math.PI * 2); }
        ctx.fill(); ctx.stroke();
      }
      break;
    case "crown":
      if (phase === "front") {
        ctx.beginPath();
        ctx.moveTo(-14, -84); ctx.lineTo(-15, -98); ctx.lineTo(-7, -90); ctx.lineTo(0, -101);
        ctx.lineTo(7, -90); ctx.lineTo(15, -98); ctx.lineTo(14, -84); ctx.closePath();
        fillStroke(col, 2.5);
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, -89, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "flowers":
      if (phase === "front") {
        for (const [x, c] of [[-10, "#f97316"], [0, "#facc15"], [10, "#ec4899"]]) {
          ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, -88, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#7c2d12"; ctx.beginPath(); ctx.arc(x, -88, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case "hardhat":
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -84, 17, 12, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(col);
        ctx.beginPath(); ctx.roundRect(-22, -86, 44, 5, 2); fillStroke(col, 2.5);
      }
      break;
    case "tricorn":
      if (phase === "front") {
        ctx.beginPath(); ctx.moveTo(-26, -82); ctx.quadraticCurveTo(0, -108, 26, -82); ctx.quadraticCurveTo(0, -90, -26, -82);
        fillStroke(col, 2.5);
        ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(0, -90, 3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "sunglasses":
    case "sunglassesonly":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-14, -79, 28, 8, 3); fillStroke("#0a0a0a", 2);
        ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-10, -73); ctx.lineTo(-6, -78); ctx.moveTo(4, -73); ctx.lineTo(8, -78); ctx.stroke();
      }
      break;
    case "bunny":
      if (phase === "back") {
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(s * 8, -100, 6, 17, s * 0.15, 0, Math.PI * 2); fillStroke(col, 2.5);
          ctx.fillStyle = "#f9a8d4"; ctx.beginPath(); ctx.ellipse(s * 8, -100, 2.5, 11, s * 0.15, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case "halo":
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(0, -100, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#fde047"; ctx.lineWidth = 3; ctx.stroke();
      }
      break;
    case "catears":
    case "wolfears":
    case "ratears":
      if (phase === "back") {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          if (kind === "ratears") ctx.arc(s * 14, -86, 9, 0, Math.PI * 2);
          else { const h = kind === "wolfears" ? 104 : 99; ctx.moveTo(s * 15, -82); ctx.lineTo(s * 12, -h); ctx.lineTo(s * 3, -86); ctx.closePath(); }
          fillStroke(col || "#a8a29e", 2.5);
        }
      }
      break;
    case "eyemask":
      if (phase === "mid") {
        ctx.beginPath(); ctx.moveTo(-17, -80); ctx.quadraticCurveTo(0, -84, 17, -80); ctx.lineTo(14, -69); ctx.quadraticCurveTo(0, -72, -14, -69); ctx.closePath();
        fillStroke(col, 2);
      }
      break;
    case "witch":
      if (phase === "front") {
        ctx.beginPath(); ctx.moveTo(-24, -82); ctx.lineTo(24, -82); ctx.lineTo(9, -94); ctx.quadraticCurveTo(0, -112, -f * 12, -120); ctx.quadraticCurveTo(-6, -104, -10, -94); ctx.closePath();
        fillStroke(col, 2.5);
        ctx.fillStyle = "#facc15"; ctx.fillRect(-10, -94, 20, 3);
      }
      break;
    case "goggles":
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, -84); ctx.lineTo(16, -84); ctx.stroke();
        for (const x of [-7, 7]) { ctx.beginPath(); ctx.arc(x, -85, 6, 0, Math.PI * 2); fillStroke("#a16207", 2); ctx.fillStyle = "#7dd3fc"; ctx.beginPath(); ctx.arc(x, -85, 3.5, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    case "spacehelmet":
      if (phase === "front") {
        ctx.beginPath(); ctx.arc(0, -71, 23, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(186,230,253,0.35)"; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(0, -71, 17, -2.6, -1.9); ctx.stroke();
      }
      break;
    case "pumpkinhead":
      if (phase === "mid") {
        ctx.strokeStyle = "rgba(120,50,0,0.45)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -85); ctx.lineTo(-7, -57); ctx.moveTo(7, -85); ctx.lineTo(7, -57); ctx.stroke();
      }
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-3, -95, 7, 10, 2); fillStroke("#3f7d20", 2); }
      break;
    case "jester":
      if (phase === "front") {
        [[-1, "#dc2626"], [0, "#7c3aed"], [1, "#facc15"]].forEach(([s, c]) => {
          ctx.beginPath(); ctx.moveTo(s * 6 - 8, -84); ctx.quadraticCurveTo(s * 18, -96, s * 22, -108 + Math.abs(s) * 8); ctx.lineTo(s * 6 + 8, -84); ctx.closePath();
          fillStroke(c, 2);
          ctx.beginPath(); ctx.arc(s * 22, -108 + Math.abs(s) * 8, 3.5, 0, Math.PI * 2); fillStroke("#fde047", 1.5);
        });
      }
      break;
    case "cowboy":
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -85, 27, 6, 0, 0, Math.PI * 2); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.roundRect(-13, -102, 26, 17, [7, 7, 1, 1]); fillStroke(col, 2.5);
        ctx.fillStyle = "#facc15"; ctx.fillRect(-13, -90, 26, 3);
      }
      break;
    case "veil":
      if (phase === "back") {
        ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-18, -88); ctx.lineTo(18, -88); ctx.lineTo(24, -30); ctx.lineTo(-24, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (phase === "front") {
        for (const x of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(x, -88, 4, 0, Math.PI * 2); fillStroke("#fecdd3", 1.5); }
      }
      break;
    case "cap":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-17, -92, 34, 12, [10, 10, 1, 1]); fillStroke(col);
        ctx.beginPath(); ctx.roundRect(f > 0 ? 3 : -27, -83, 24, 5, 2); fillStroke(col, 2.5);
      }
      break;
    case "hood2":
      if (phase === "back") { ctx.beginPath(); ctx.roundRect(-21, -92, 42, 40, 13); fillStroke(col); }
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-19, -92, 38, 11, [11, 11, 3, 3]); fillStroke(col, 2.5); }
      break;
    case "antennae":
      if (phase === "front") {
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -86); ctx.lineTo(-11, -102); ctx.moveTo(6, -86); ctx.lineTo(11, -102); ctx.stroke();
        for (const x of [-11, 11]) { ctx.beginPath(); ctx.arc(x, -103, 3.5, 0, Math.PI * 2); fillStroke(col, 1.5); }
      }
      break;
    case "ninjamask":
      if (phase === "mid") {
        ctx.fillStyle = col;
        ctx.fillRect(-16, -86, 32, 8);
        ctx.fillRect(-16, -70, 32, 14);
      }
      break;
    case "sailor":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-14, -94, 28, 10, 4); fillStroke("#f8fafc", 2.5);
        ctx.fillStyle = "#1e3a8a"; ctx.fillRect(-14, -88, 28, 3);
      }
      break;
    case "beret":
      if (phase === "front") { ctx.beginPath(); ctx.ellipse(-f * 3, -88, 17, 6, -f * 0.2, 0, Math.PI * 2); fillStroke(col, 2.5); }
      break;
    case "horned":
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -84, 17, 11, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke("#9ca3af");
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * 15, -88); ctx.quadraticCurveTo(s * 28, -92, s * 26, -106); ctx.lineTo(s * 18, -94); ctx.closePath(); fillStroke("#f5f5f4", 2);
        }
      }
      break;
    case "tophat":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-20, -88, 40, 5, 2); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.rect(-12, -112, 24, 25); fillStroke(col, 2.5);
        ctx.fillStyle = "#7f1d1d"; ctx.fillRect(-12, -93, 24, 4);
      }
      break;
    default:
      drawMilestoneBits(kind, col, f, phase);
  }
}

// The things the Milestone skins wear. phase works as in drawHat.
function drawMilestoneBits(kind, col, f, phase) {
  const ink = (w) => { ctx.strokeStyle = INK; ctx.lineWidth = w; };
  switch (kind) {
    case "shackle": // a broken shackle on the wrist, in caution paint
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-f * 28, -30, 10, 7, 2); fillStroke(col, 2); }
      break;
    case "boxhead": // c00lkidd's cardboard box with a burger drawn on it and cardboard horns
      if (phase === "back") for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 12, -88); ctx.lineTo(s * 20, -104); ctx.lineTo(s * 4, -90); ctx.closePath(); fillStroke(col, 2); }
      if (phase === "mid") {
        ctx.beginPath(); ctx.rect(-18, -90, 36, 36); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.rect(-12, -84, 24, 22); fillStroke("#ef4444", 2);
        ctx.fillStyle = "#d97706"; ctx.beginPath(); ctx.ellipse(f * 9, -60, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "horns":
    case "hornsbig": {
      if (phase !== "back") break;
      const big = kind === "hornsbig" ? 1.6 : 1;
      ctx.lineCap = "round";
      for (const [w, c] of [[8 * big, INK], [5 * big, col]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath();
        for (const s of [-1, 1]) { ctx.moveTo(s * 12, -84); ctx.quadraticCurveTo(s * 24 * big, -92, s * 18 * big, -100 - 8 * big); }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      break;
    }
    case "bow":
      if (phase === "front") {
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(s * 11, -61); ctx.lineTo(s * 11, -49); ctx.closePath(); fillStroke(col, 2); }
      }
      break;
    case "burgers": // two of 007n7's burger heads on top
      if (phase === "front") drawHat({ hat: "burger" }, f, "front");
      break;
    case "glasses":
      if (phase === "front") {
        ink(2);
        ctx.beginPath(); ctx.arc(f * 5 - 6, -74, 5, 0, Math.PI * 2); ctx.moveTo(f * 5 + 11, -74); ctx.arc(f * 5 + 6, -74, 5, 0, Math.PI * 2);
        ctx.moveTo(f * 5 - 1, -74); ctx.lineTo(f * 5 + 1, -74); ctx.stroke();
      }
      break;
    case "starglasses":
      if (phase === "front") for (const x of [-6, 6]) drawStar(f * 5 + x, -74, 7, 3, "#facc15");
      break;
    case "scarf":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-17, -58, 34, 8, 3); fillStroke(col, 2);
        ctx.beginPath(); ctx.moveTo(-f * 10, -52); ctx.lineTo(-f * 18, -30); ctx.lineTo(-f * 10, -32); ctx.closePath(); fillStroke(col, 2);
      }
      break;
    case "bandages":
      if (phase === "mid") {
        ctx.fillStyle = col;
        for (const y of [-84, -76, -66]) ctx.fillRect(-16, y, 32, 5);
        ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); for (const y of [-84, -76, -66]) { ctx.moveTo(-16, y + 5); ctx.lineTo(16, y + 5); } ctx.stroke();
      }
      break;
    case "hair": // short hair on top, for Nosferatu's milestones
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-17, -92, 34, 12, [9, 9, 2, 2]); fillStroke(col, 2.5); ctx.beginPath(); ctx.moveTo(-f * 17, -84); ctx.lineTo(-f * 22, -66); ctx.lineTo(-f * 14, -76); ctx.closePath(); fillStroke(col, 2); }
      break;
    case "crack": // Veeronica's cracked screen
      if (phase === "front") {
        ink(1.5);
        ctx.beginPath(); ctx.moveTo(8, -82); ctx.lineTo(3, -75); ctx.lineTo(9, -71); ctx.lineTo(4, -64); ctx.moveTo(3, -75); ctx.lineTo(-2, -77); ctx.stroke();
      }
      break;
    case "headphones":
      if (phase === "front") {
        ink(3); ctx.beginPath(); ctx.arc(0, -78, 17, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        for (const x of [-17, 17]) { ctx.beginPath(); ctx.arc(x, -72, 6, 0, Math.PI * 2); fillStroke(col, 2); }
      }
      break;
    case "gasmask":
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-11, -70, 22, 13, 5); fillStroke("#374151", 2);
        for (const x of [-6, 6]) { ctx.beginPath(); ctx.arc(x, -62, 3.5, 0, Math.PI * 2); fillStroke("#22d3ee", 1.5); }
      }
      break;
    case "duck": // Mr. Quackers on the shoulder
    case "duckhat": {
      if (phase !== "front") break;
      const [x, y] = kind === "duck" ? [-f * 20, -60] : [0, -92];
      ctx.beginPath(); ctx.ellipse(x, y, 8, 6, 0, 0, Math.PI * 2); fillStroke("#facc15", 2);
      ctx.beginPath(); ctx.arc(x + f * 6, y - 6, 4.5, 0, Math.PI * 2); fillStroke("#facc15", 2);
      ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.moveTo(x + f * 10, y - 7); ctx.lineTo(x + f * 15, y - 5); ctx.lineTo(x + f * 10, y - 4); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(x + f * 6, y - 8, 1.6, 1.6);
      break;
    }
    case "scar":
      if (phase === "front") { ink(1.5); ctx.beginPath(); ctx.moveTo(f * 5 + 9, -82); ctx.lineTo(f * 5 + 3, -66); ctx.stroke(); }
      break;
    case "armyhelmet":
      if (phase === "front") { ctx.beginPath(); ctx.ellipse(0, -84, 19, 12, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(col); }
      break;
    case "officercap":
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -93, 18, 6, 0, 0, Math.PI * 2); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.roundRect(-14, -93, 28, 9, 2); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.roundRect(f > 0 ? 0 : -20, -86, 20, 4, 2); fillStroke("#111827", 2);
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, -89, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "pauldrons":
      if (phase === "front") for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 21, -52, 9, 6, 0, Math.PI, Math.PI * 2); ctx.closePath(); fillStroke(col, 2); }
      break;
    case "bowtie":
      if (phase === "front") for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -53); ctx.lineTo(s * 7, -57); ctx.lineTo(s * 7, -49); ctx.closePath(); fillStroke(col, 1.5); }
      break;
    case "plume":
      if (phase === "front") { ctx.beginPath(); ctx.ellipse(f * 10, -106, 5, 14, -f * 0.4, 0, Math.PI * 2); fillStroke("#111827", 2); }
      break;
    case "pencil":
      if (phase === "front") { ctx.save(); ctx.translate(-f * 10, -90); ctx.rotate(-f * 0.6); ctx.beginPath(); ctx.rect(-2, -10, 4, 18); fillStroke("#facc15", 1.5); ctx.restore(); }
      break;
    case "eyepatch":
      if (phase === "front") {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(f * 5 + 6, -74, 4.5, 0, Math.PI * 2); ctx.fill();
        ink(1.5); ctx.beginPath(); ctx.moveTo(-16, -80); ctx.lineTo(16, -70); ctx.stroke();
      }
      break;
    case "widebrim":
      if (phase === "front") {
        ctx.beginPath(); ctx.ellipse(0, -86, 28, 6, 0, 0, Math.PI * 2); fillStroke(col, 2.5);
        ctx.beginPath(); ctx.roundRect(-12, -99, 24, 13, [6, 6, 1, 1]); fillStroke(col, 2.5);
        for (const x of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(x, -99, 3.5, 0, Math.PI * 2); fillStroke("#9ca3af", 1.5); }
      }
      break;
    case "rose": // a grey rose over Jane's face
      if (phase === "front") { ctx.beginPath(); ctx.arc(f * 4, -72, 9, 0, Math.PI * 2); fillStroke("#9ca3af", 2); ink(1.2); ctx.beginPath(); ctx.arc(f * 4, -72, 5, 0, Math.PI * 1.6); ctx.stroke(); }
      break;
    case "necklace":
      if (phase === "front") { ink(1.5); ctx.beginPath(); ctx.arc(0, -56, 8, 0.2, Math.PI - 0.2); ctx.stroke(); drawStar(0, -47, 4, 2, "#facc15"); }
      break;
    case "visorwings":
      if (phase === "back") for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 16, -84); ctx.quadraticCurveTo(s * 34, -100, s * 30, -112); ctx.quadraticCurveTo(s * 26, -96, s * 14, -90); ctx.closePath(); fillStroke("#facc15", 2); }
      break;
    case "sunglassesup":
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-13, -92, 26, 6, 3); fillStroke("#111827", 2); }
      break;
    case "shutters": // shutter shades
      if (phase === "front") {
        ctx.beginPath(); ctx.roundRect(-14, -79, 28, 9, 3); fillStroke(col, 2);
        ctx.strokeStyle = "#111827"; ctx.lineWidth = 1.5;
        ctx.beginPath(); for (const y of [-76, -73]) { ctx.moveTo(-13, y); ctx.lineTo(13, y); } ctx.stroke();
      }
      break;
    case "redvisor":
      if (phase === "front") { ctx.beginPath(); ctx.roundRect(-15, -79, 30, 8, 3); fillStroke("#dc2626", 2); ctx.fillStyle = "rgba(254,202,202,0.8)"; ctx.fillRect(-12, -77, 24, 2); }
      break;
    case "warnlights":
      if (phase === "front") {
        const on = Math.sin(gameTime * 8) > 0;
        for (const [x, y] of [[-22, -40], [22, -40], [-9, -12], [9, -12]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); fillStroke(on ? "#f97316" : "#7c2d12", 1.5); }
      }
      break;
  }
}

// The Milestone skins' shirt prints. Returns true if it drew one.
function drawMilestonePattern(p, look) {
  const pc = look.patternColor;
  const word = (str, y, size, color) => { ctx.fillStyle = color; ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(str, 0, y); };
  switch (p) {
    case "num51": word("51", -34, 13, "#f8fafc"); break;
    case "stains":
      ctx.fillStyle = "#7f1d1d";
      for (const [x, y, r] of [[-8, -46, 4], [7, -36, 3], [-3, -28, 3.5], [10, -48, 2.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    case "chains":
      ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-17, -52); ctx.lineTo(17, -30); ctx.moveTo(17, -52); ctx.lineTo(-17, -30); ctx.stroke();
      break;
    case "buttons":
      ctx.fillStyle = INK;
      for (let y = -48; y < -24; y += 7) { ctx.beginPath(); ctx.arc(0, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#2563eb"; ctx.fillRect(7, -50, 2, 7); ctx.fillStyle = "#dc2626"; ctx.fillRect(10, -50, 2, 7);
      break;
    case "vestbrown": ctx.fillStyle = "#78350f"; ctx.fillRect(-18, -56, 10, 36); ctx.fillRect(8, -56, 10, 36); break;
    case "tie":
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath(); ctx.moveTo(-2, -54); ctx.lineTo(2, -54); ctx.lineTo(4, -32); ctx.lineTo(0, -28); ctx.lineTo(-4, -32); ctx.closePath(); ctx.fill();
      break;
    case "drape": ctx.fillStyle = "#6b7280"; ctx.beginPath(); ctx.moveTo(-17, -22); ctx.lineTo(0, -44); ctx.lineTo(17, -22); ctx.closePath(); ctx.fill(); break;
    case "zip":
      ctx.fillStyle = "#dc2626"; ctx.fillRect(-18, -56, 12, 36);
      ctx.fillStyle = "#14b8a6"; ctx.fillRect(-1.5, -56, 3, 36);
      ctx.beginPath(); ctx.arc(7, -40, 5, 0, Math.PI * 2); fillStroke("#a855f7", 1.5);
      break;
    case "tesseract":
      ctx.strokeStyle = "#e9d5ff"; ctx.lineWidth = 1.5;
      ctx.strokeRect(-9, -48, 14, 14); ctx.strokeRect(-4, -43, 14, 14);
      ctx.beginPath(); ctx.moveTo(-9, -48); ctx.lineTo(-4, -43); ctx.moveTo(5, -48); ctx.lineTo(10, -43); ctx.moveTo(-9, -34); ctx.lineTo(-4, -29); ctx.moveTo(5, -34); ctx.lineTo(10, -29); ctx.stroke();
      break;
    case "vortex":
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.5;
      ctx.beginPath(); for (let a = 0; a < 12; a += 0.3) ctx.lineTo(Math.cos(a) * a * 0.9, -39 + Math.sin(a) * a * 0.9); ctx.stroke();
      break;
    case "tiger":
      ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.5;
      ctx.beginPath(); for (let y = -50; y < -22; y += 8) { ctx.moveTo(-18, y); ctx.lineTo(-8, y + 4); ctx.moveTo(18, y + 3); ctx.lineTo(8, y + 7); } ctx.stroke();
      break;
    case "smiley": // the Epic Face
      ctx.beginPath(); ctx.arc(0, -39, 9, 0, Math.PI * 2); fillStroke("#facc15", 1.5);
      ctx.fillStyle = INK; ctx.fillRect(-4, -43, 2, 3); ctx.fillRect(2, -43, 2, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -39, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    case "pumpkin":
      ctx.beginPath(); ctx.arc(0, -39, 9, 0, Math.PI * 2); fillStroke("#dc2626", 1.5);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-5, -43); ctx.lineTo(-2, -40); ctx.lineTo(-6, -40); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, -43); ctx.lineTo(2, -40); ctx.lineTo(6, -40); ctx.fill();
      break;
    case "friedchicken": word("I ♥", -44, 8, "#dc2626"); word("FRIED", -36, 7, "#dc2626"); word("CHICKEN", -29, 6, "#dc2626"); break;
    case "siliconvalley": word("Silicon", -40, 7, "#f8fafc"); word("Valley", -32, 7, "#f8fafc"); break;
    case "marks":
      ctx.strokeStyle = "#111827"; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (const [x, y] of [[-10, -48], [6, -44], [-4, -34], [10, -30]]) { ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 4); } ctx.stroke();
      break;
    case "club": word("♣", -32, 18, "#111827"); break;
    case "heart": word("♥", -32, 18, "#dc2626"); break;
    case "diamond": word("♦", -32, 18, "#dc2626"); break;
    case "spade": word("♠", -32, 18, "#111827"); break;
    case "jabot":
      for (const y of [-54, -48, -42]) { ctx.beginPath(); ctx.ellipse(0, y, 6, 3.5, 0, 0, Math.PI * 2); fillStroke("#f8fafc", 1.2); }
      break;
    case "triangles":
      ctx.fillStyle = "#facc15";
      for (const [x, y] of [[-10, -48], [6, -48], [-2, -36], [-12, -28], [10, -30]]) { ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x + 3, y); ctx.lineTo(x + 6, y + 5); ctx.fill(); }
      break;
    case "wrench":
      ctx.save(); ctx.translate(0, -39); ctx.rotate(-0.7);
      ctx.fillStyle = "#e5e7eb"; ctx.fillRect(-1.5, -9, 3, 16);
      ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    case "toolbelt":
      ctx.fillStyle = "#78350f"; ctx.fillRect(-18, -27, 36, 5);
      ctx.fillStyle = "#9ca3af"; ctx.fillRect(-12, -24, 3, 8); ctx.fillRect(8, -24, 3, 8);
      break;
    case "armor":
      ctx.strokeStyle = "rgba(226,232,240,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, -22); ctx.moveTo(-17, -38); ctx.lineTo(17, -38); ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      for (const [x, y] of [[-12, -49], [12, -49], [-12, -27], [12, -27]]) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
      break;
    default: return false;
  }
  return true;
}

// ---------- Figures ----------
// Draws a character standing at the origin (feet at 0,0, about 100 px tall).
// p: facing, walk, moving, airborne, mood, scared, armed, swing (0..1, or -1), gray
function drawFigure(look, p) {
  if (!look.alpha && !look.glow) { drawFigureBody(look, p); return; }
  ctx.save();
  if (look.alpha) ctx.globalAlpha *= look.alpha;
  if (look.glow) { ctx.shadowColor = look.glow; ctx.shadowBlur = 14; }
  drawFigureBody(look, p);
  ctx.restore();
}

// Depth: every block is drawn as a box seen a little from above and from the
// right. depth3d draws the box's back, top and side; the front is drawn after it.
// ang is the drawing's rotation (an arm), so the depth still points up and right on screen.
function depth3d(x, y, w, h, r, color, ang = 0, dx0 = 5, dy0 = -5, topColor = null) {
  const c = Math.cos(-ang), sn = Math.sin(-ang);
  const dx = dx0 * c - dy0 * sn, dy = dx0 * sn + dy0 * c;
  const back = mixColor(color, "#0a0518", 0.45), side = mixColor(color, "#0a0518", 0.28);
  const top = topColor || mixColor(color, "#ffffff", 0.3);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.roundRect(x + dx, y + dy, w, h, r); ctx.fillStyle = back; ctx.fill(); ctx.stroke();
  const quad = (ax, ay, bx, by, col) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx + dx, by + dy); ctx.lineTo(ax + dx, ay + dy); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.stroke();
  };
  if (dy < 0) quad(x + r, y, x + w - r, y, top); else if (dy > 0) quad(x + r, y + h, x + w - r, y + h, back);
  if (dx > 0) quad(x + w, y + r, x + w, y + h - r, side); else if (dx < 0) quad(x, y + r, x, y + h - r, side);
}

// Light from the top left: a highlight along the top, shade down the right side.
function shade(x, y, w, h, r) {
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, w, Math.max(3, h * 0.2));
  ctx.fillStyle = "rgba(10,5,25,0.14)";
  ctx.fillRect(x + w * 0.66, y, w * 0.34, h);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
}

const addsOf = (look) => (Array.isArray(look.add) ? look.add : look.add ? [[look.add, look.addColor]] : []);

const LEG_STRETCH = 4 / 3, BODY_RAISE = 8, HEAD_SCALE = 0.8, ARM_STRETCH = 1.12;

function drawFigureBody(look, p) {
  const f = p.facing, ph = p.walk;
  const squash = p.airborne ? -3 : 0;
  const lift = (a) => (p.moving ? Math.max(0, Math.sin(a)) * 7 : 0);

  ctx.save();
  ctx.translate(0, -BODY_RAISE);
  // Behind everything: wings, a cape, or Azure's tentacles.
  if (look.wings) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 10, -50); ctx.quadraticCurveTo(s * 46, -80, s * 52, -36); ctx.quadraticCurveTo(s * 36, -44, s * 30, -24); ctx.quadraticCurveTo(s * 22, -36, s * 10, -34); ctx.closePath();
      fillStroke(look.wings, 2.5);
    }
  }
  if (look.cape) {
    ctx.beginPath(); ctx.moveTo(-18, -54); ctx.lineTo(18, -54); ctx.lineTo(25, -6); ctx.lineTo(-25, -6); ctx.closePath();
    fillStroke(look.cape);
  }
  if (look.tail) {
    ctx.lineCap = "round";
    for (const [w, col] of [[7, INK], [4, look.tail]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(-f * 4, -28); ctx.quadraticCurveTo(-f * 34, -30 + Math.sin(gameTime * 4) * 4, -f * 38, -4); ctx.stroke();
    }
    ctx.lineCap = "butt";
  }
  if (look.tentacles) {
    ctx.lineCap = "round";
    for (const [w, col] of [[9, INK], [5, "#1e1b4b"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      for (const [sx, a] of [[-1, 0], [-1, 1], [1, 2], [1, 3]]) {
        const wave = Math.sin(gameTime * 3 + a) * 6;
        ctx.moveTo(sx * 8, -48); ctx.quadraticCurveTo(sx * (26 + a * 4), -70 + wave, sx * (34 + a * 3), -40 - a * 14 + wave);
      }
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }
  ctx.restore();

  ctx.save();
  ctx.scale(1, LEG_STRETCH);
  if (!look.robe) {
    depth3d(-15, -24 - lift(ph) + squash, 12, 24, 3, look.pants);
    ctx.beginPath(); ctx.roundRect(-15, -24 - lift(ph) + squash, 12, 24, 3); fillStroke(look.pants);
    shade(-15, -24 - lift(ph) + squash, 12, 24, 3);
    depth3d(3, -24 - lift(ph + Math.PI) + squash, 12, 24, 3, look.pants);
    ctx.beginPath(); ctx.roundRect(3, -24 - lift(ph + Math.PI) + squash, 12, 24, 3); fillStroke(look.pants);
    shade(3, -24 - lift(ph + Math.PI) + squash, 12, 24, 3);
    if (look.boots) {
      for (const [x, a] of [[-15, ph], [3, ph + Math.PI]]) {
        ctx.beginPath(); ctx.roundRect(x - 1, -8 - lift(a) + squash, 14, 8, 2); fillStroke(look.boots, 2);
      }
    }
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, -BODY_RAISE);
  // Arms: swinging while walking, up in the air when scared, the weapon arm forward.
  const armAngle = (side) => {
    if (p.armed && side === f && p.spin >= 0) return -f * (1.1 + p.spin * Math.PI * 2);
    if (p.armed && side === f) return p.swing >= 0 ? -f * (2.7 - p.swing * 1.6) : -f * 1.1;
    if (p.climbing) return side * (Math.PI - 0.35) + Math.sin(ph * 2 + (side > 0 ? Math.PI : 0)) * 0.3;
    if (p.scared) return side * (Math.PI - 0.45) + Math.sin(gameTime * 30 + side) * 0.12;
    if (p.airborne) return side * 0.9;
    return p.moving ? Math.sin(ph + (side > 0 ? Math.PI : 0)) * 0.6 : side * 0.08;
  };
  const drawArm = (side) => {
    ctx.save();
    ctx.translate(side * 22, -50);
    const ang = armAngle(side);
    ctx.rotate(ang);
    ctx.scale(1, ARM_STRETCH);
    depth3d(-5, -3, 10, 27, 4, look.shirt, ang, 4, -4);
    ctx.beginPath(); ctx.roundRect(-5, -3, 10, 27, 4); fillStroke(look.shirt);
    shade(-5, -3, 10, 27, 4);
    ctx.beginPath(); ctx.roundRect(-5, 17, 10, 8, 3); fillStroke(look.skin, 2);
    if (look.wrist) { ctx.beginPath(); ctx.roundRect(-6, 13, 12, 5, 2); fillStroke(look.wrist, 1.5); }
    if (p.armed && side === f) {
      ctx.translate(0, 24);
      drawWeapon(look.weapon || "fist");
    }
    ctx.restore();
  };
  drawArm(-f);

  if (look.robe) depth3d(-19, -54, 38, 62, 6, look.shirt); else depth3d(-17, -54, 34, 32, 5, look.shirt);
  ctx.beginPath();
  if (look.robe) ctx.roundRect(-19, -54, 38, 62, 6); else ctx.roundRect(-17, -54, 34, 32, 5);
  fillStroke(look.shirt);
  drawPattern(look, look.robe);
  if (look.robe) shade(-19, -54, 38, 62, 6); else shade(-17, -54, 34, 32, 5);
  if (look.extras) drawKillerExtras(look, f, "torso");

  ctx.save();
  ctx.translate(0, -56);
  ctx.scale(HEAD_SCALE, HEAD_SCALE);
  ctx.translate(0, 56);
  drawHat(look, f, "back");
  if (look.extras) drawKillerExtras(look, f, "back");
  for (const [k, c] of addsOf(look)) drawAccessory(k, c, f, "back");
  const head = p.gray ? "#c9c9c9" : look.skin;
  depth3d(-16, -86, 32, 30, 6, head);
  ctx.beginPath(); ctx.roundRect(-16, -86, 32, 30, 6); fillStroke(head);
  shade(-16, -86, 32, 30, 6);
  drawHat(look, f, "mid");
  for (const [k, c] of addsOf(look)) drawAccessory(k, c, f, "mid");
  if (look.eyes && !p.gray) {
    ctx.save(); ctx.shadowColor = look.eyes; ctx.shadowBlur = 9;
    drawFace(f * 2, -71, 30, p.mood, f, look.eyes);
    ctx.restore();
  } else drawFace(f * 2, -71, 30, p.mood, f, look.eyes);
  if (look.grin && p.mood === "evil") {
    // c00lkidd's wide carved smile.
    ctx.beginPath(); ctx.moveTo(f * 2 - 11, -66); ctx.quadraticCurveTo(f * 2, -54, f * 2 + 11, -66); ctx.quadraticCurveTo(f * 2, -62, f * 2 - 11, -66);
    fillStroke("#450a0a", 1.5);
    ctx.fillStyle = "#ffffff";
    for (let x = -7; x <= 7; x += 4.5) { ctx.beginPath(); ctx.moveTo(f * 2 + x - 1.6, -64.5); ctx.lineTo(f * 2 + x + 1.6, -64.5); ctx.lineTo(f * 2 + x, -61.5); ctx.fill(); }
  }
  drawHat(look, f, "front");
  for (const [k, c] of addsOf(look)) drawAccessory(k, c, f, "front");
  if (look.extras) drawKillerExtras(look, f, "front");
  ctx.restore();
  drawArm(f);
  ctx.restore();
}

// The killers' signature details, from the Forsaken wiki's descriptions.
function drawKillerExtras(look, f, phase) {
  switch (look.extras) {
    case "slasher":
      if (phase === "torso") {
        // The shroud hangs over his chest in rags.
        ctx.beginPath(); ctx.moveTo(-18, -56); ctx.lineTo(18, -56); ctx.lineTo(15, -42); ctx.lineTo(10, -46); ctx.lineTo(5, -38); ctx.lineTo(0, -44); ctx.lineTo(-5, -37); ctx.lineTo(-10, -45); ctx.lineTo(-15, -40); ctx.closePath();
        fillStroke(look.hatColor || "#1c1917", 2);
      }
      if (phase === "front") {
        // The Necrobloxicon, pinned to his shoulder with a knife.
        ctx.save(); ctx.translate(-f * 16, -56); ctx.rotate(-f * 0.3);
        ctx.beginPath(); ctx.roundRect(-6, -7, 12, 14, 2); fillStroke("#7c2d12", 2);
        ctx.fillStyle = "#fde68a"; ctx.fillRect(-4, -5, 2, 10);
        ctx.beginPath(); ctx.roundRect(-1.5, -14, 3, 10, 1); fillStroke("#3f2a1d", 1.2);
        ctx.restore();
      }
      break;
    case "1x":
      if (phase === "torso") {
        // A domino shoulder pad and the crown-like marking round the neck.
        ctx.beginPath(); ctx.roundRect(-f * 20 - 7, -60, 14, 8, 2); fillStroke("#22c55e", 2);
        ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(-f * 20 - 3, -56, 1.4, 0, Math.PI * 2); ctx.arc(-f * 20 + 3, -56, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9, -54); ctx.lineTo(-5, -50); ctx.lineTo(0, -54); ctx.lineTo(5, -50); ctx.lineTo(9, -54); ctx.stroke();
      }
      break;
    case "guest666":
      if (phase === "back") {
        // A dark red mane behind the head.
        ctx.beginPath();
        ctx.moveTo(-18, -60);
        for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; ctx.lineTo(Math.cos(a) * (i % 2 ? 22 : 28), -72 + Math.sin(a) * (i % 2 ? 22 : 28)); }
        ctx.lineTo(18, -60); ctx.closePath();
        fillStroke("#7f1d1d", 2);
      }
      if (phase === "torso") {
        // The Roblox logo on the tip of his tail.
        ctx.save(); ctx.translate(-f * 38, -4); ctx.rotate(0.3);
        ctx.beginPath(); ctx.rect(-5, -5, 10, 10); fillStroke("#dc2626", 1.5);
        ctx.fillStyle = "#18181b"; ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
      break;
    case "azure":
      if (phase === "torso") {
        // A torn black capelet over the shoulders.
        ctx.beginPath(); ctx.moveTo(-20, -56); ctx.lineTo(20, -56); ctx.lineTo(18, -44); ctx.lineTo(12, -48); ctx.lineTo(6, -42); ctx.lineTo(0, -47); ctx.lineTo(-6, -41); ctx.lineTo(-12, -47); ctx.lineTo(-18, -43); ctx.closePath();
        fillStroke("#111827", 2);
      }
      if (phase === "front") {
        // Black scene hair over one eye, so only one glows.
        ctx.beginPath(); ctx.moveTo(-16, -86); ctx.lineTo(16, -86); ctx.lineTo(16, -80);
        ctx.lineTo(f * 5 - 1, -79); ctx.lineTo(f * 5 - 9 * f, -66); ctx.lineTo(f * 5 - 13 * f, -78); ctx.lineTo(-16, -80); ctx.closePath();
        fillStroke("#0a0a0a", 2);
      }
      break;
  }
}

function drawChar(c) {
  const mood = moodOf(c);

  ctx.save();
  // Shadow on the surface under the feet.
  if (c.alive) {
    const s = surfaces[c.onGround ? c.surf : landingAt(surfaces, c.x, c.y - 1)] || FLOOR;
    const lift = clamp((s.y - c.y) / 200, 0, 1);
    ctx.fillStyle = `rgba(30,25,40,${0.22 * (1 - lift)})`;
    ctx.beginPath();
    ctx.ellipse(c.x, s.y, 22 * (1 - lift * 0.5), 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Killers in Smittan glow green.
  if (mode === "smittan" && c.role === "hunter" && c.alive) {
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 46, 34, 56, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74,222,128,${0.22 + Math.sin(gameTime * 5) * 0.06})`;
    ctx.fill();
  }

  ctx.translate(c.x, c.y);
  if (!c.alive) {
    ctx.globalAlpha = 0.6;
    ctx.translate(0, -17);
    ctx.rotate(-c.facing * Math.PI / 2);
    ctx.translate(0, 40);
  } else if (c.invis > 0) {
    ctx.globalAlpha = 0.2;
  } else if (c.invuln > 0 && Math.floor(c.invuln * 20) % 2) {
    ctx.globalAlpha = 0.55;
  }
  if (c.alive) {
    const k = c.landT > 0 ? c.landT / 0.16 : 0;
    const st = !c.onGround && c.vy < -300 && !c.climbing ? 0.07 : 0;
    ctx.scale(1 + 0.16 * k - st, 1 - 0.14 * k + st);
    if (c.role === "hunter") ctx.scale(1.1, 1.1);
    if (lookOf(c).levitate) ctx.translate(0, -9 - Math.sin(gameTime * 3) * 3);
  }
  drawFigure(lookOf(c), {
    facing: c.facing,
    walk: c.walk,
    moving: c.onGround && Math.abs(c.vx) > 20 && !lookOf(c).levitate,
    airborne: !c.onGround && c.alive,
    mood,
    scared: mood === "scared",
    armed: c.role === "hunter" || c.fighter || c.slashT > 0,
    swing: c.swing > 0 ? 1 - c.swing / SWING_TIME : c.slashT > 0 ? 1 - c.slashT / 0.3 : -1,
    spin: c.spinT > 0 ? 1 - c.spinT / 0.45 : -1,
    climbing: c.climbing,
    gray: !c.alive,
  });
  if (c.skate > 0 && c.alive) {
    ctx.beginPath(); ctx.roundRect(-26, -2, 52, 6, 3); fillStroke("#ec4899", 2.5);
    for (const x of [-16, 16]) { ctx.beginPath(); ctx.arc(x, 6, 4, 0, Math.PI * 2); fillStroke("#f8fafc", 2); }
  }
  ctx.restore();

  if (c.alive) {
    if (c.shield > 0) {
      ctx.beginPath(); ctx.ellipse(c.x, c.y - 48, 40, 58, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(103,232,249,${0.15 + Math.sin(gameTime * 8) * 0.05})`; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(8,145,178,0.8)"; ctx.stroke();
    }
    if (c.stun > 0 || c.stuck > 0) {
      for (let i = 0; i < 3; i++) {
        const a = gameTime * 5 + i * 2.1;
        text("★", c.x + Math.cos(a) * 20, c.y - 92 + Math.sin(a) * 5, { size: 16, color: "#ffd166", ow: 3 });
      }
    }
  }

  // Name tag (and the hunter countdown above it, or the coins and shop key in the lobby).
  if (c.alive) {
    const tagY = c.y - 112;
    text(c.name, c.x, tagY, { size: c.human ? 17 : 14, color: c.color, ow: 4 });
    if (c.human) {
      ctx.font = `700 17px ${FONT}`;
      drawLevelBadge(c.x - ctx.measureText(c.name).width / 2 - 18, tagY, levelOf(c.human, lookOf(c).id).lv, 12);
    }
    if (c.human && !shops[c.human]) {
      ctx.font = `700 17px ${FONT}`;
      drawPowerBadge(c, c.x + ctx.measureText(c.name).width / 2 + 18, tagY);
    }
    if (c.hold > 0) text(String(Math.ceil(c.hold)), c.x, tagY - 30, { size: 34, color: "#ff6b6b" });
    if (state === "lobby" && c.human) {
      drawCoins(c.x, tagY - 21, save[c.human].coins, 15);
      if (!shops[c.human] && nearShop(c)) {
        text(`${c.human === 1 ? "W" : "↑"} = öppna affären`, c.x, tagY - 44 - Math.abs(Math.sin(gameTime * 4)) * 5, { size: 17, color: "#ffd166", ow: 4 });
      }
    }
  }
}

function drawCoinIcon(x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fillStroke("#facc15", Math.max(1.5, r / 4));
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = Math.max(1, r / 5); ctx.stroke();
}

// A coin and a number, centered on x.
function drawCoins(x, y, n, size, color = "#fff") {
  ctx.font = `700 ${size}px ${FONT}`;
  const w = ctx.measureText(String(n)).width + size + 4;
  drawCoinIcon(x - w / 2 + size / 2, y, size / 2);
  text(String(n), x - w / 2 + size + 4, y, { size, color, align: "left", ow: 4 });
}

// ---------- Scenery ----------
function skyGradient(top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Map drawing ----------
// The match maps are Forsaken's: Yorick's Resting Place, Work at a Pizza Place,
// Horror Hotel, C00l Carnival, Cake Factory and Planet Voss, drawn after the
// Forsaken wiki's descriptions. A map is three screens wide, so it is drawn in
// two parts: the background, fixed on the screen and sliding a little as the
// camera moves (fy is where the floor is on screen, px how far it has slid),
// and the world, drawn through the camera: floor, platforms and what stands on them.
function drawArena() {
  const fy = (GROUND - cam.y) * cam.z;
  const px = cam.x * 0.3;
  ({ yorick: bgYorick, pizza: bgPizza, hotel: bgHotel, carnival: bgCarnival, cake: bgCake, voss: bgVoss })[map.id](fy, px);
}

function drawArenaWorld() {
  ({ yorick: worldYorick, pizza: worldPizza, hotel: worldHotel, carnival: worldCarnival, cake: worldCake, voss: worldVoss })[map.id]();
}

// x wrapped onto the screen, for background things that repeat as the camera slides.
const wrapX = (x, px, span = W + 300) => ((((x - px) % span) + span) % span) - 150;
const bgTrees = Array.from({ length: 9 }, (_, i) => ({ x: i * 160 + rand(-20, 20), h: rand(160, 280), s: rand(0.8, 1.2) }));

// Every third of a match map is one copy of the screen-sized layout, the middle one mirrored.
function forEachSegment(fn) {
  for (let k = 0; k < Math.round(world.width / W); k++) {
    ctx.save();
    if (k % 2) { ctx.translate((k + 1) * W, 0); ctx.scale(-1, 1); } else ctx.translate(k * W, 0);
    fn(k);
    ctx.restore();
  }
}

// Things standing along the floor, every so often, worked out from x so they stay put.
function alongFloor(step, fn) {
  for (let x = 90; x < world.width - 40; x += step) fn(x, Math.abs(Math.sin(x * 12.9898)) % 1);
}

// --- Yorick's Resting Place: a graveyard on a Halloween night ---
function bgYorick(fy, px) {
  skyGradient("#1e1b4b", "#5b21b6");
  const g = ctx.createRadialGradient(1040, 150, 20, 1040, 150, 160);
  g.addColorStop(0, "rgba(254,249,195,0.45)"); g.addColorStop(1, "rgba(254,249,195,0)");
  ctx.fillStyle = g; ctx.fillRect(860, 0, 360, 320);
  ctx.fillStyle = "#fef9c3"; ctx.beginPath(); ctx.arc(1040, 150, 58, 0, Math.PI * 2); ctx.fill();
  // A church on the hill, and bare trees.
  const cx = wrapX(520, px * 0.5, W + 900);
  ctx.fillStyle = "#1a1033";
  ctx.fillRect(cx - 70, fy - 170, 140, 170);
  ctx.beginPath(); ctx.moveTo(cx - 80, fy - 170); ctx.lineTo(cx, fy - 240); ctx.lineTo(cx + 80, fy - 170); ctx.fill();
  ctx.fillRect(cx - 12, fy - 300, 24, 70); ctx.fillRect(cx - 24, fy - 285, 48, 8);
  ctx.strokeStyle = "#1a1033"; ctx.lineCap = "round";
  for (const t of bgTrees) {
    const x = wrapX(t.x, px);
    ctx.lineWidth = 10 * t.s;
    ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - t.h);
    ctx.moveTo(x, fy - t.h * 0.6); ctx.lineTo(x - 40 * t.s, fy - t.h * 0.85);
    ctx.moveTo(x, fy - t.h * 0.75); ctx.lineTo(x + 36 * t.s, fy - t.h * 0.98);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 40 * t.s, fy - t.h * 0.85); ctx.lineTo(x - 55 * t.s, fy - t.h * 0.95); ctx.moveTo(x, fy - t.h); ctx.lineTo(x + 12, fy - t.h - 26); ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#14532d"; ctx.fillRect(0, fy, W, H - fy);
}

function worldYorick() {
  drawFloor("#3f6212", "#292524");
  alongFloor(170, (x, r) => {
    if (r < 0.65) {
      // A tombstone.
      const h = 34 + r * 20;
      depth3d(x - 13, GROUND - h, 26, h, 10, "#9ca3af", 0, 5, -5);
      ctx.beginPath(); ctx.roundRect(x - 13, GROUND - h, 26, h, [12, 12, 2, 2]); fillStroke("#9ca3af", 2.5);
      ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, GROUND - h + 8); ctx.lineTo(x, GROUND - h + 24); ctx.moveTo(x - 6, GROUND - h + 13); ctx.lineTo(x + 6, GROUND - h + 13); ctx.stroke();
    } else {
      // A jack-o'-lantern, glowing.
      ctx.fillStyle = "rgba(251,146,60,0.3)"; ctx.beginPath(); ctx.arc(x, GROUND - 12, 26, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, GROUND - 12, 15, 12, 0, 0, Math.PI * 2); fillStroke("#f97316", 2.5);
      ctx.beginPath(); ctx.roundRect(x - 2, GROUND - 28, 4, 6, 1); fillStroke("#3f6212", 1.5);
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.moveTo(x - 8, GROUND - 16); ctx.lineTo(x - 4, GROUND - 20); ctx.lineTo(x - 2, GROUND - 15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 8, GROUND - 16); ctx.lineTo(x + 4, GROUND - 20); ctx.lineTo(x + 2, GROUND - 15); ctx.fill();
      ctx.fillRect(x - 6, GROUND - 10, 12, 3);
    }
  });
  drawPlatforms("#a8a29e", "#57534e", (s) => {
    ctx.fillStyle = "#4d7c0f";
    for (let x = s.x1 + 10; x < s.x2 - 10; x += 37) { ctx.beginPath(); ctx.ellipse(x, s.y + 2, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  });
  // Low mist over the graves.
  const g = ctx.createLinearGradient(0, GROUND - 70, 0, GROUND);
  g.addColorStop(0, "rgba(226,232,240,0)"); g.addColorStop(1, "rgba(226,232,240,0.3)");
  ctx.fillStyle = g; ctx.fillRect(0, GROUND - 70, world.width, 70);
}

// --- Work at a Pizza Place: the island town, wrecked by c00lkidd, under a red night ---
function bgPizza(fy, px) {
  skyGradient("#2a0606", "#b91c1c");
  ctx.fillStyle = "#1c0505";
  for (let i = 0; i < 12; i++) {
    const x = wrapX(i * 125, px * 0.5), h = 120 + ((i * 53) % 160);
    ctx.fillRect(x, fy - h, 90, h);
    ctx.beginPath(); ctx.moveTo(x, fy - h); ctx.lineTo(x + 20, fy - h - 18); ctx.lineTo(x + 45, fy - h - 6); ctx.lineTo(x + 70, fy - h - 22); ctx.lineTo(x + 90, fy - h); ctx.fill();
  }
  // Smoke rising from the town.
  for (let i = 0; i < 4; i++) {
    const x = wrapX(200 + i * 340, px * 0.5);
    for (let k = 0; k < 5; k++) {
      const y = fy - 160 - k * 60 - ((gameTime * 20) % 60);
      ctx.fillStyle = `rgba(40,20,20,${0.25 - k * 0.04})`;
      ctx.beginPath(); ctx.arc(x + Math.sin(gameTime + k + i) * 15, y, 30 + k * 10, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = "#3f3f46"; ctx.fillRect(0, fy, W, H - fy);
}

function worldPizza() {
  // Brick houses under the rooftops, windows dark or lit by fire.
  const roofs = surfaces.slice(1).sort((a, b) => a.y - b.y);
  roofs.forEach((s, i) => {
    ctx.beginPath(); ctx.rect(s.x1 + 6, s.y + 10, s.x2 - s.x1 - 12, GROUND - s.y - 10);
    fillStroke(["#7c2d12", "#9a3412", "#78350f", "#8a3a1e"][i % 4], 3);
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = s.y + 24; y < GROUND; y += 14) { ctx.moveTo(s.x1 + 6, y); ctx.lineTo(s.x2 - 6, y); }
    ctx.stroke();
    for (let wy = s.y + 34; wy < GROUND - 40; wy += 34) {
      for (let wx = s.x1 + 22; wx < s.x2 - 30; wx += 30) {
        const k = Math.floor(wx * 7 + wy * 3) % 7;
        ctx.fillStyle = k < 2 ? (Math.sin(gameTime * 9 + wx) > -0.3 ? "#fb923c" : "#f97316") : "#1c0a0a";
        ctx.fillRect(wx, wy, 14, 18);
      }
    }
  });
  // The pizzeria's sign on top of each tallest house.
  for (const s of surfaces.slice(1)) {
    if (s.y !== roofs[0].y) continue;
    const cx = (s.x1 + s.x2) / 2;
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - 50, s.y); ctx.lineTo(cx - 50, s.y - 40); ctx.moveTo(cx + 50, s.y); ctx.lineTo(cx + 50, s.y - 40); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(cx - 80, s.y - 82, 160, 44, 8); fillStroke("#fef3c7", 3);
    text("PIZZA", cx + 10, s.y - 60, { size: 26, color: "#b91c1c", outline: null });
    ctx.beginPath(); ctx.moveTo(cx - 64, s.y - 74); ctx.lineTo(cx - 40, s.y - 74); ctx.lineTo(cx - 52, s.y - 46); ctx.closePath(); fillStroke("#fbbf24", 2);
  }
  drawFloor("#52525b", "#27272a");
  ctx.fillStyle = "#facc15";
  for (let x = 20; x < world.width; x += 90) ctx.fillRect(x, GROUND + 36, 45, 6);
  // Pizza boxes and small fires in the street.
  alongFloor(230, (x, r) => {
    if (r < 0.5) {
      depth3d(x - 16, GROUND - 10, 32, 10, 2, "#d6b98c", 0, 5, -4);
      ctx.beginPath(); ctx.rect(x - 16, GROUND - 10, 32, 10); fillStroke("#d6b98c", 2);
      ctx.fillStyle = "#b91c1c"; ctx.fillRect(x - 6, GROUND - 8, 12, 4);
    } else {
      const f = 1 + Math.sin(gameTime * 14 + x) * 0.15;
      ctx.fillStyle = "#f97316"; ctx.beginPath(); ctx.ellipse(x, GROUND - 12 * f, 10, 14 * f, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fde047"; ctx.beginPath(); ctx.ellipse(x, GROUND - 8 * f, 5, 8 * f, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  drawPlatforms("#78716c", "#44403c", (s) => {
    ctx.fillStyle = INK;
    for (let x = s.x1 + 12; x < s.x2 - 6; x += 24) { ctx.beginPath(); ctx.arc(x, s.y + 13, 1.8, 0, Math.PI * 2); ctx.fill(); }
  });
}

// --- Horror Hotel: dark red hallways, elevator shafts and flickering chandeliers ---
function bgHotel(fy, px) {
  ctx.fillStyle = "#3b0d0d";
  ctx.fillRect(0, 0, W, H);
  // Damask wallpaper.
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  const ox = -(px % 80);
  for (let y = 20; y < H; y += 80) {
    for (let x = ox + ((y / 80) % 2) * 40; x < W + 40; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.quadraticCurveTo(x + 14, y, x, y + 18); ctx.quadraticCurveTo(x - 14, y, x, y - 18); ctx.fill();
    }
  }
}

function worldHotel() {
  forEachSegment(() => {
    // Elevator shafts where the castle had towers, with a balcony rail along the top floor.
    for (const [x1, x2] of [[40, 260], [1020, 1240]]) {
      ctx.beginPath(); ctx.rect(x1, 250, x2 - x1, GROUND - 250); fillStroke("#1f0a0a", 3);
      ctx.beginPath(); ctx.rect((x1 + x2) / 2 - 40, GROUND - 120, 80, 120); fillStroke("#a8a29e", 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo((x1 + x2) / 2, GROUND - 120); ctx.lineTo((x1 + x2) / 2, GROUND); ctx.stroke();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(40, 222); ctx.lineTo(1240, 222);
    for (let x = 40; x <= 1240; x += 40) { ctx.moveTo(x, 222); ctx.lineTo(x, 250); }
    ctx.stroke();
    ctx.strokeStyle = "#b45309"; ctx.lineWidth = 2.5; ctx.stroke();
    // Room doors, paintings and chandeliers.
    for (const dx of [340, 940]) {
      ctx.beginPath(); ctx.roundRect(dx - 30, GROUND - 110, 60, 110, [6, 6, 0, 0]); fillStroke("#5b2a16", 3);
      ctx.beginPath(); ctx.roundRect(dx - 10, GROUND - 96, 20, 10, 2); fillStroke("#facc15", 1.5);
      ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(dx + 18, GROUND - 55, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const fx of [420, 860]) {
      ctx.beginPath(); ctx.rect(fx - 40, 290, 80, 60); fillStroke("#b45309", 4);
      ctx.fillStyle = "#1e1b4b"; ctx.fillRect(fx - 32, 298, 64, 44);
      ctx.fillStyle = "#e7e5e4"; ctx.beginPath(); ctx.arc(fx, 318, 9, 0, Math.PI * 2); ctx.fill();
    }
    [500, 780].forEach((cx, i) => {
      const lit = Math.sin(gameTime * 23 + i * 7) > -0.85;
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 120); ctx.stroke();
      if (lit) { const g = ctx.createRadialGradient(cx, 140, 4, cx, 140, 110); g.addColorStop(0, "rgba(253,224,71,0.35)"); g.addColorStop(1, "rgba(253,224,71,0)"); ctx.fillStyle = g; ctx.fillRect(cx - 110, 30, 220, 220); }
      ctx.beginPath(); ctx.ellipse(cx, 135, 34, 12, 0, 0, Math.PI); fillStroke("#b45309", 2.5);
      for (const k of [-24, -8, 8, 24]) { ctx.fillStyle = lit ? "#fde047" : "#57534e"; ctx.beginPath(); ctx.arc(cx + k, 128, 4, 0, Math.PI * 2); ctx.fill(); }
    });
  });
  drawFloor("#991b1b", "#450a0a");
  drawPlatforms("#991b1b", "#5b2a16", (s) => {
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x1 + 6, s.y + 7); ctx.lineTo(s.x2 - 6, s.y + 7); ctx.stroke();
  });
  drawLadders();
}

// --- C00l Carnival: tents, a Ferris wheel and bounce pads ---
function bgCarnival(fy, px) {
  skyGradient("#5b21b6", "#f472b6");
  // The Ferris wheel turns slowly.
  const wx = wrapX(900, px * 0.4, W + 600), wy = fy - 240, r = 170;
  ctx.strokeStyle = "#2e1065"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(wx - 90, fy); ctx.lineTo(wx, wy); ctx.lineTo(wx + 90, fy); ctx.stroke();
  ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    const a = gameTime * 0.3 + (i / 10) * Math.PI * 2;
    ctx.strokeStyle = "#2e1065";
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * r, wy + Math.sin(a) * r); ctx.stroke();
    ctx.fillStyle = ["#facc15", "#22d3ee", "#f43f5e", "#a3e635"][i % 4];
    ctx.beginPath(); ctx.roundRect(wx + Math.cos(a) * r - 12, wy + Math.sin(a) * r, 24, 18, 4); ctx.fill();
  }
  // Striped tents.
  for (let i = 0; i < 5; i++) {
    const x = wrapX(i * 290 + 80, px * 0.7), w = 160, h = 130;
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = k % 2 ? "#fef2f2" : "#dc2626";
      ctx.beginPath(); ctx.moveTo(x + w / 2, fy - h - 40); ctx.lineTo(x + (k * w) / 8, fy - h); ctx.lineTo(x + ((k + 1) * w) / 8, fy - h); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + (k * w) / 8, fy - h, w / 8 + 0.5, h);
    }
  }
  ctx.fillStyle = "#78350f"; ctx.fillRect(0, fy, W, H - fy);
}

function worldCarnival() {
  drawFloor("#d97706", "#78350f");
  // String lights over the fairground.
  ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 2;
  for (let x = 0; x < world.width; x += 320) {
    ctx.beginPath(); ctx.moveTo(x, 150); ctx.quadraticCurveTo(x + 160, 210, x + 320, 150); ctx.stroke();
    for (let k = 1; k < 8; k++) {
      const t = k / 8, lx = x + 320 * t, ly = 150 + 4 * 60 * t * (1 - t) * 0.5 * 2;
      ctx.fillStyle = ["#facc15", "#22d3ee", "#f43f5e", "#a3e635"][(k + Math.floor(gameTime * 3)) % 4];
      ctx.beginPath(); ctx.arc(lx, ly + 4, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawPlatforms("#fef2f2", "#dc2626", (s) => {
    ctx.fillStyle = "#dc2626";
    for (let x = s.x1 + 6; x < s.x2 - 10; x += 20) ctx.fillRect(x, s.y + 1, 10, 6);
    // A balloon tied to one end.
    const bx = s.x2 - 8, by = s.y - 46 + Math.sin(gameTime * 2 + s.x1) * 3;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x2 - 8, s.y); ctx.lineTo(bx, by + 12); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx, by, 9, 12, 0, 0, Math.PI * 2); fillStroke(["#22d3ee", "#facc15", "#a855f7"][Math.floor(s.x1) % 3], 2);
  });
  drawTramps();
}

// --- Cake Factory: pastel machines, cake-layer platforms and slippery icing ---
function bgCake(fy, px) {
  skyGradient("#fce7f3", "#fbcfe8");
  const ox = -(px % 220);
  for (let x = ox; x < W + 220; x += 220) {
    // Big mixers and pipes on the factory wall.
    ctx.fillStyle = "#f5d0fe";
    ctx.fillRect(x + 20, 80, 26, fy - 80);
    ctx.fillStyle = "#e9d5ff";
    ctx.beginPath(); ctx.roundRect(x + 90, fy - 260, 100, 140, 20); ctx.fill();
    ctx.fillStyle = "#d8b4fe";
    ctx.beginPath(); ctx.ellipse(x + 140, fy - 120, 60, 22, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(x + 134, fy - 330, 12, 70);
  }
  // Sprinkles stuck to the wall.
  for (let i = 0; i < 40; i++) {
    const x = wrapX(i * 71, px), y = 60 + ((i * 97) % (fy - 120));
    ctx.fillStyle = ["#f472b6", "#60a5fa", "#facc15", "#34d399"][i % 4];
    ctx.save(); ctx.translate(x, y); ctx.rotate(i); ctx.fillRect(-4, -1.5, 8, 3); ctx.restore();
  }
  ctx.fillStyle = "#f5f5f4"; ctx.fillRect(0, fy, W, H - fy);
}

function worldCake() {
  drawFloor("#fda4af", "#f5f5f4");
  // A checkered tile floor.
  for (let x = 0; x < world.width; x += 30) {
    for (let y = GROUND + 12; y < H; y += 30) {
      if (((x + y) / 30) % 2 < 1) { ctx.fillStyle = "#fecdd3"; ctx.fillRect(x, y, 30, 30); }
    }
  }
  // Cakes on the floor.
  alongFloor(260, (x, r) => {
    const h = 30 + r * 18;
    depth3d(x - 22, GROUND - h, 44, h, 4, "#b45309", 0, 6, -5);
    ctx.beginPath(); ctx.roundRect(x - 22, GROUND - h, 44, h, 4); fillStroke("#b45309", 2.5);
    ctx.beginPath(); ctx.roundRect(x - 22, GROUND - h, 44, 9, [4, 4, 0, 0]); fillStroke("#f9a8d4", 2);
    ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(x, GROUND - h - 6, 5, 0, Math.PI * 2); ctx.fill();
  });
  drawPlatforms("#f9a8d4", "#b45309", (s) => {
    // Icing dripping over the edge, a cream line, and sprinkles.
    ctx.fillStyle = "#f9a8d4"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (let x = s.x1 + 12; x < s.x2 - 10; x += 26) {
      const l = 6 + ((x * 7) % 8);
      ctx.beginPath(); ctx.moveTo(x - 5, s.y + 7); ctx.quadraticCurveTo(x - 5, s.y + 7 + l, x, s.y + 7 + l); ctx.quadraticCurveTo(x + 5, s.y + 7 + l, x + 5, s.y + 7); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#fef3c7"; ctx.fillRect(s.x1 + 3, s.y + 13, s.x2 - s.x1 - 6, 2);
    for (let x = s.x1 + 8; x < s.x2 - 6; x += 13) {
      ctx.fillStyle = ["#60a5fa", "#facc15", "#34d399", "#ffffff"][Math.floor(x) % 4];
      ctx.fillRect(x, s.y + 2, 4, 2);
    }
  });
}

// --- Planet Voss: a grassy planet under big stars, with spaceships about ---
function bgVoss(fy, px) {
  skyGradient("#0c0a2e", "#1e3a8a");
  for (let i = 0; i < 14; i++) {
    const x = wrapX(i * 101 + 30, px * 0.2), y = 40 + ((i * 67) % 280), r = 5 + (i % 4) * 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(gameTime * 0.2 + i);
    drawStar(0, 0, r, 2, i % 3 ? "#fde047" : "#fef3c7");
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(1120, 170, 55, 0, Math.PI * 2); fillStroke("#a78bfa", 3);
  ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(1120, 170, 92, 20, -0.3, 0, Math.PI * 2); ctx.stroke();
  // A spaceship parked in the distance.
  const sx = wrapX(380, px * 0.5, W + 700);
  ctx.fillStyle = "#334155";
  ctx.beginPath(); ctx.moveTo(sx - 110, fy - 30); ctx.lineTo(sx - 60, fy - 90); ctx.lineTo(sx + 80, fy - 90); ctx.lineTo(sx + 130, fy - 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.ellipse(sx + 10, fy - 92, 34, 18, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#166534"; ctx.fillRect(0, fy, W, H - fy);
}

function worldVoss() {
  drawFloor("#4ade80", "#78350f");
  // Little domed buildings on the grass.
  alongFloor(420, (x, r) => {
    ctx.beginPath(); ctx.rect(x - 30, GROUND - 34, 60, 34); fillStroke("#cbd5e1", 2.5);
    ctx.beginPath(); ctx.ellipse(x, GROUND - 34, 30, 22, 0, Math.PI, Math.PI * 2); fillStroke("#93c5fd", 2.5);
    ctx.fillStyle = r < 0.5 ? "#fde047" : "#67e8f9"; ctx.fillRect(x - 6, GROUND - 26, 12, 10);
  });
  // Floating islands of grass and rock.
  for (const s of surfaces.slice(1)) {
    const w = s.x2 - s.x1;
    ctx.beginPath();
    ctx.moveTo(s.x1 + 4, s.y + 12);
    ctx.lineTo(s.x2 - 4, s.y + 12);
    ctx.lineTo(s.x2 - w * 0.2, s.y + 40);
    ctx.lineTo(s.x1 + w * 0.6, s.y + 62);
    ctx.lineTo(s.x1 + w * 0.25, s.y + 44);
    ctx.closePath();
    fillStroke("#78716c", 3);
  }
  drawPlatforms("#4ade80", "#57534e", (s) => {
    ctx.fillStyle = "#22c55e";
    for (let x = s.x1 + 8; x < s.x2 - 8; x += 14) { ctx.beginPath(); ctx.moveTo(x - 3, s.y + 1); ctx.lineTo(x, s.y - 6); ctx.lineTo(x + 3, s.y + 1); ctx.fill(); }
  });
}

function drawLadders() {
  for (const l of world.ladders) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (const dx of [-13, 13]) { ctx.moveTo(l.x + dx, l.top - 6); ctx.lineTo(l.x + dx, l.bottom); }
    for (let y = l.top + 10; y < l.bottom; y += 22) { ctx.moveTo(l.x - 13, y); ctx.lineTo(l.x + 13, y); }
    ctx.stroke();
    ctx.strokeStyle = "#a0703f";
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }
}

function drawTramps() {
  for (const t of world.tramps) {
    const s = surfaces[t.surf];
    const sq = t.squash > 0 ? Math.sin((t.squash / 0.25) * Math.PI) * 0.35 : 0;
    ctx.save();
    ctx.translate(t.x, s.y);
    for (const lx of [-20, 20]) { ctx.beginPath(); ctx.rect(lx - 3, -14, 6, 14); fillStroke("#6b7280", 2); }
    ctx.scale(1 + sq, 1 - sq);
    ctx.beginPath(); ctx.ellipse(0, -16, 30, 8, 0, 0, Math.PI * 2); fillStroke("#1e1b4b", 3);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -16, 26, 6, 0, 0, Math.PI * 2); ctx.clip();
    for (let x = -26; x < 26; x += 8) { ctx.fillStyle = ((x + 26) / 8) % 2 < 1 ? "#dc2626" : "#fef2f2"; ctx.fillRect(x, -24, 8, 16); }
    ctx.restore();
    ctx.restore();
  }
}

// ---------- Cars (Staden) ----------
let cars = [];
let carTimer = 0;
const CAR_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#a855f7"];

function updateCars(dt) {
  if (!world.cars) return;
  carTimer -= dt;
  if (carTimer <= 0) {
    carTimer = rand(5, 9);
    const dir = Math.random() < 0.5 ? 1 : -1;
    cars.push({ dir, x: dir > 0 ? -90 : world.width + 90, warn: 1.2, color: pick(CAR_COLORS) });
    tone(440, 0.15, { type: "sawtooth", vol: 0.04 });
    tone(370, 0.25, { type: "sawtooth", vol: 0.04, delay: 0.18 });
  }
  for (const car of cars) {
    if (car.warn > 0) { car.warn -= dt; continue; }
    car.x += car.dir * CAR_SPEED * dt;
    for (const c of cast) {
      if (!c.alive || c.y < GROUND - 30 || c.carHit > 0 || Math.abs(c.x - car.x) > 62) continue;
      Object.assign(c, { vx: car.dir * 650, vy: -560, onGround: false, carHit: 1 });
      c.stun = Math.max(c.stun, 0.6);
      floater(c.x, c.y - 125, "Påkörd!", "#ffd166");
      burst(c.x, c.y - 30, "#fde68a", 10, 200);
      sfx.hit();
    }
  }
  cars = cars.filter((car) => car.warn > 0 || (car.x > -150 && car.x < world.width + 150));
}

// Is a car about to run this character over?
function carComing(c) {
  return cars.some((car) => car.warn > 0
    ? car.warn < 0.5 && Math.abs(c.x - (car.dir > 0 ? 0 : world.width)) < 160
    : (c.x - car.x) * car.dir > 0 && Math.abs(c.x - car.x) < 230);
}

function drawCars() {
  for (const car of cars) {
    if (car.warn > 0) {
      // A warning sign at the edge the car is coming from.
      const x = car.dir > 0 ? 40 : world.width - 40;
      if (Math.floor(car.warn * 6) % 2) {
        ctx.beginPath(); ctx.moveTo(x, GROUND - 80); ctx.lineTo(x + 24, GROUND - 38); ctx.lineTo(x - 24, GROUND - 38); ctx.closePath();
        fillStroke("#facc15", 3);
        text("!", x, GROUND - 52, { size: 24, color: INK, outline: null });
      }
      continue;
    }
    ctx.save();
    ctx.translate(car.x, GROUND);
    ctx.scale(car.dir, 1);
    depth3d(-30, -62, 56, 26, 8, car.color, 0, 7, -6);
    depth3d(-58, -40, 116, 28, 8, car.color, 0, 7, -6);
    ctx.beginPath(); ctx.roundRect(-58, -40, 116, 28, 8); fillStroke(car.color);
    ctx.beginPath(); ctx.roundRect(-30, -62, 56, 26, [10, 14, 2, 2]); fillStroke(car.color);
    ctx.beginPath(); ctx.roundRect(-24, -57, 22, 17, 3); fillStroke("#bfe6ff", 2);
    ctx.beginPath(); ctx.roundRect(2, -57, 20, 17, 3); fillStroke("#bfe6ff", 2);
    ctx.fillStyle = "#fde047"; ctx.fillRect(50, -34, 8, 8);
    for (const wx of [-34, 34]) { ctx.beginPath(); ctx.arc(wx, -12, 12, 0, Math.PI * 2); fillStroke("#1f2937"); ctx.beginPath(); ctx.arc(wx, -12, 4, 0, Math.PI * 2); ctx.fillStyle = "#9ca3af"; ctx.fill(); }
    ctx.restore();
  }
}

// The lobby is Forsaken's cabin at night: log walls, a fireplace and couch
// downstairs, a café corner under the stairs, and upstairs a gambling table,
// a computer and Mart in a beanbag watching TV.
function drawLobby() {
  // Log walls
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0, i = 0; y < GROUND; y += 34, i++) {
    ctx.fillStyle = i % 2 ? "#7a4b2a" : "#704527";
    ctx.fillRect(0, y, W, 34);
    ctx.strokeStyle = "rgba(30,15,5,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Ceiling beams
  ctx.fillStyle = "#4a2c17";
  ctx.fillRect(0, 0, W, 18);
  for (let x = 40; x < W; x += 240) { ctx.beginPath(); ctx.rect(x, 0, 22, 30); fillStroke("#4a2c17", 2); }

  drawCabinWindow(430, 110, 500, 190, true);
  drawCabinWindow(800, 440, 170, 100, false);

  // Sign: Forsaken's "Welcome back to the Cabin."
  ctx.beginPath(); ctx.roundRect(965, 140, 285, 44, 6); fillStroke("#a0703f", 3);
  text("Välkommen tillbaka till stugan", 1107, 162, { size: 17, color: "#fef3c7", outline: "#4a2c17", ow: 4 });

  drawFireplace();

  // Couch with the cabin cat asleep on it
  ctx.beginPath(); ctx.roundRect(290, 585, 190, 40, 10); fillStroke("#9f1239", 3);
  ctx.beginPath(); ctx.roundRect(300, 615, 170, 30, 6); fillStroke("#be123c", 3);
  for (const x of [282, 466]) { ctx.beginPath(); ctx.roundRect(x, 600, 22, 46, 8); fillStroke("#9f1239", 3); }
  ctx.fillStyle = "#3b2414"; ctx.fillRect(300, 645, 8, 5); ctx.fillRect(462, 645, 8, 5);
  drawSleepingCat(420, 615);

  // Café corner: two little tables with mugs
  for (const tx of [830, 950]) {
    ctx.beginPath(); ctx.roundRect(tx - 34, 598, 68, 8, 3); fillStroke("#a0703f", 2.5);
    ctx.beginPath(); ctx.rect(tx - 4, 606, 8, 44); fillStroke("#7a4b2a", 2);
    ctx.beginPath(); ctx.roundRect(tx - 14, 586, 11, 12, 2); fillStroke("#f8fafc", 2);
    ctx.beginPath(); ctx.roundRect(tx + 6, 586, 11, 12, 2); fillStroke("#fde68a", 2);
  }

  // The stairs: a solid block under each step.
  for (const s of surfaces.slice(1, 3)) {
    ctx.beginPath(); ctx.rect(s.x1, s.y, s.x2 - s.x1, GROUND - s.y); fillStroke("#5a3820", 3);
  }

  drawUpstairsFurniture();

  drawFloor("#9a6b43", "#6e462d");
  ctx.strokeStyle = "rgba(40,20,8,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 60; x < W; x += 120) { ctx.moveTo(x, GROUND + 12); ctx.lineTo(x, H); }
  ctx.stroke();
  // Rug in front of the fireplace
  ctx.beginPath(); ctx.ellipse(250, GROUND + 6, 150, 8, 0, 0, Math.PI * 2); fillStroke("#b45309", 2);

  drawShopStall();
  drawPlatforms("#b07a47", "#7a4b2a", (s) => {
    if (s !== LOBBY_UPSTAIRS) return;
    // The upstairs floor is a thick beam with a railing along the edge.
    ctx.beginPath(); ctx.rect(s.x1, s.y + 18, s.x2 - s.x1, 12); fillStroke("#5a3820", 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y - 36); ctx.lineTo(s.x2, s.y - 36);
    for (let x = s.x1 + 4; x <= s.x2; x += 48) { ctx.moveTo(x, s.y - 36); ctx.lineTo(x, s.y); }
    ctx.stroke();
    ctx.strokeStyle = "#a0703f"; ctx.lineWidth = 3;
    ctx.stroke();
  });
}

// A window onto the night: dark pines, the moon, and the lake with the dock.
function drawCabinWindow(x, y, w, h, big) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#1e3a5f");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 18; i++) ctx.fillRect(x + ((i * 97) % w), y + ((i * 41) % (h * 0.5)), 2, 2);
  if (big) {
    ctx.fillStyle = "#fef9c3";
    ctx.beginPath(); ctx.arc(x + w * 0.78, y + 45, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(x, y + h - 45, w, 45);
    ctx.strokeStyle = "rgba(254,249,195,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const yy = y + h - 36 + i * 9; ctx.moveTo(x + w * 0.72 - i * 8, yy); ctx.lineTo(x + w * 0.84 + i * 8, yy); }
    ctx.stroke();
    // The dock
    ctx.fillStyle = "#3b2414";
    ctx.fillRect(x + 40, y + h - 48, 150, 8);
    for (const px of [50, 110, 180]) ctx.fillRect(x + px, y + h - 42, 5, 22);
  }
  ctx.fillStyle = "#0b1a12";
  for (let px = x - 20; px < x + w + 20; px += 34) {
    const th = (big ? 70 : 45) + ((px * 13) % 30);
    const base = big ? y + h - 44 : y + h;
    ctx.beginPath(); ctx.moveTo(px - 16, base); ctx.lineTo(px, base - th); ctx.lineTo(px + 16, base); ctx.fill();
  }
  ctx.restore();
  ctx.beginPath(); ctx.rect(x, y, w, h); fillStroke("rgba(0,0,0,0)", 6);
  ctx.strokeStyle = "#a0703f"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}

function drawFireplace() {
  // Warm light spilling into the room
  const flick = 1 + Math.sin(gameTime * 9) * 0.04 + Math.sin(gameTime * 23) * 0.03;
  const glow = ctx.createRadialGradient(160, 600, 10, 160, 600, 330 * flick);
  glow.addColorStop(0, "rgba(251,146,60,0.45)");
  glow.addColorStop(1, "rgba(251,146,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 250, 520, 400);

  // Stone chimney
  ctx.beginPath(); ctx.rect(90, 0, 140, GROUND); fillStroke("#78716c", 3);
  ctx.strokeStyle = "rgba(28,25,23,0.4)"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = 20, r = 0; y < GROUND; y += 26, r++) {
    ctx.moveTo(90, y); ctx.lineTo(230, y);
    for (let x = 90 + (r % 2) * 22; x < 230; x += 44) { ctx.moveTo(x, y); ctx.lineTo(x, y + 26); }
  }
  ctx.stroke();
  ctx.beginPath(); ctx.roundRect(72, 540, 176, 14, 3); fillStroke("#5a3820", 3);
  ctx.beginPath(); ctx.moveTo(110, GROUND); ctx.lineTo(110, 585); ctx.quadraticCurveTo(160, 560, 210, 585); ctx.lineTo(210, GROUND); ctx.closePath();
  fillStroke("#1c1917", 3);
  // Logs and flames
  ctx.beginPath(); ctx.roundRect(122, 638, 76, 10, 4); fillStroke("#7c4a1e", 2);
  for (const [dx, h, col] of [[-18, 34, "#f97316"], [0, 46, "#fb923c"], [18, 30, "#f97316"], [0, 26, "#fde047"]]) {
    const hh = h * (1 + Math.sin(gameTime * 14 + dx) * 0.15);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(160 + dx - 13, 640); ctx.quadraticCurveTo(160 + dx - 10, 640 - hh * 0.6, 160 + dx, 640 - hh); ctx.quadraticCurveTo(160 + dx + 10, 640 - hh * 0.6, 160 + dx + 13, 640); ctx.fill();
  }
}

function drawSleepingCat(x, y) {
  ctx.beginPath(); ctx.ellipse(x, y - 8, 22, 11, 0, 0, Math.PI * 2); fillStroke("#9ca3af", 2.5);
  ctx.beginPath(); ctx.arc(x - 18, y - 12, 9, 0, Math.PI * 2); fillStroke("#9ca3af", 2.5);
  for (const ex of [-24, -13]) { ctx.beginPath(); ctx.moveTo(ex - 4, y - 18); ctx.lineTo(ex, y - 26); ctx.lineTo(ex + 4, y - 18); ctx.closePath(); fillStroke("#9ca3af", 2); }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-23 + x, y - 12); ctx.lineTo(-19 + x, y - 12); ctx.moveTo(-16 + x, y - 12); ctx.lineTo(-12 + x, y - 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 20, y - 6); ctx.quadraticCurveTo(x + 34, y - 4, x + 26, y + 2); ctx.lineWidth = 4; ctx.stroke();
  const z = (gameTime * 0.8) % 1;
  ctx.globalAlpha = 1 - z;
  text("z", x - 8, y - 30 - z * 20, { size: 14, color: "#e0e7ff", outline: null });
  ctx.globalAlpha = 1;
}

// Upstairs, standing on the upper floor: a gambling table, a computer, and Mart in a beanbag.
function drawUpstairsFurniture() {
  const fy = LOBBY_UPSTAIRS.y;
  // Gambling table with chips and cards
  ctx.beginPath(); ctx.roundRect(330, fy - 46, 150, 12, 5); fillStroke("#166534", 3);
  for (const lx of [345, 460]) { ctx.beginPath(); ctx.rect(lx, fy - 34, 8, 34); fillStroke("#5a3820", 2); }
  for (const [cx, col] of [[352, "#dc2626"], [362, "#2563eb"], [372, "#f8fafc"]]) {
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx, fy - 49 - k * 3, 5, 2, 0, 0, Math.PI * 2); fillStroke(col, 1.2); }
  }
  ctx.beginPath(); ctx.roundRect(420, fy - 52, 12, 7, 1); fillStroke("#f8fafc", 1.5);
  ctx.beginPath(); ctx.roundRect(436, fy - 52, 12, 7, 1); fillStroke("#f8fafc", 1.5);

  // Computer desk
  ctx.beginPath(); ctx.roundRect(560, fy - 40, 120, 8, 3); fillStroke("#a0703f", 2.5);
  for (const lx of [566, 666]) { ctx.beginPath(); ctx.rect(lx, fy - 32, 8, 32); fillStroke("#7a4b2a", 2); }
  ctx.beginPath(); ctx.roundRect(596, fy - 84, 54, 38, 3); fillStroke("#1f2937", 2.5);
  ctx.fillStyle = Math.sin(gameTime * 3) > 0 ? "#38bdf8" : "#22d3ee";
  ctx.fillRect(600, fy - 80, 46, 30);
  ctx.beginPath(); ctx.rect(619, fy - 46, 8, 6); fillStroke("#1f2937", 2);

  // TV and Mart in a beanbag
  ctx.beginPath(); ctx.rect(1090, fy - 30, 50, 30); fillStroke("#5a3820", 2.5);
  ctx.beginPath(); ctx.roundRect(1080, fy - 82, 70, 50, 4); fillStroke("#111827", 3);
  ctx.fillStyle = `hsl(${(gameTime * 60) % 360}, 70%, 60%)`;
  ctx.fillRect(1086, fy - 76, 58, 38);
  ctx.beginPath(); ctx.ellipse(990, fy - 18, 40, 20, 0, Math.PI, Math.PI * 2); ctx.lineTo(1030, fy); ctx.lineTo(950, fy); ctx.closePath();
  fillStroke("#7c3aed", 3);
  ctx.beginPath(); ctx.roundRect(978, fy - 52, 26, 28, 4); fillStroke("#0ea5e9", 2.5);
  ctx.beginPath(); ctx.roundRect(980, fy - 78, 24, 24, 5); fillStroke("#f1c27d", 2.5);
  ctx.fillStyle = INK; ctx.fillRect(997, fy - 70, 3, 3);
  text("Mart", 992, fy - 92, { size: 13, color: "#fff", ow: 3 });
}

function drawFloor(top, body) {
  const g = ctx.createLinearGradient(0, GROUND - 16, 0, GROUND);
  g.addColorStop(0, mixColor(top, "#0a0518", 0.25));
  g.addColorStop(1, mixColor(top, "#ffffff", 0.2));
  ctx.fillStyle = g;
  const fw = world.width;
  ctx.fillRect(0, GROUND - 16, fw, 16);
  ctx.strokeStyle = "rgba(10,5,24,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND - 16); ctx.lineTo(fw, GROUND - 16); ctx.stroke();
  ctx.fillStyle = body;
  ctx.fillRect(0, GROUND, fw, H - GROUND);
  ctx.fillStyle = top;
  ctx.fillRect(0, GROUND, fw, 12);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(fw, GROUND); ctx.stroke();
}

// deco(s) adds a map's own details to each platform.
function drawPlatforms(top, side, deco) {
  for (const s of surfaces) {
    if (s === surfaces[0]) continue;
    // A soft shadow under the platform, then the platform with a lit top edge.
    ctx.fillStyle = "rgba(20,10,30,0.2)";
    ctx.beginPath(); ctx.roundRect(s.x1 + 8, s.y + 16, s.x2 - s.x1 - 16, 9, 4); ctx.fill();
    depth3d(s.x1, s.y, s.x2 - s.x1, 18, 5, side, 0, 10, -9, mixColor(top, "#ffffff", 0.15));
    ctx.beginPath(); ctx.roundRect(s.x1, s.y, s.x2 - s.x1, 18, 5); fillStroke(side);
    ctx.beginPath(); ctx.roundRect(s.x1, s.y, s.x2 - s.x1, 8, 4); fillStroke(top, 2);
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x1 + 7, s.y + 3); ctx.lineTo(s.x2 - 7, s.y + 3); ctx.stroke();
    if (deco) deco(s);
  }
}

function drawHeart(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-16, -2, -12, -16, 0, -8);
  ctx.bezierCurveTo(12, -16, 16, -2, 0, 10);
  fillStroke("#ff5b8a", 2.5);
  ctx.restore();
}

// ---------- HUD ----------
function drawBanner(str) {
  ctx.font = `700 30px ${FONT}`;
  const w = ctx.measureText(str).width + 96;
  ctx.fillStyle = "rgba(10,5,25,0.3)";
  ctx.beginPath(); ctx.roundRect(W / 2 - w / 2 + 3, 18, w, 56, 14); ctx.fill();
  const g = ctx.createLinearGradient(0, 14, 0, 70);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#e9e4f5");
  ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 14, w, 56, 14); fillStroke(g);
  // A little clock whose hand goes round.
  const cx = W / 2 - w / 2 + 32, cy = 42;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); fillStroke("#fde68a", 2.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  const a = gameTime * 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * 9, cy - Math.cos(a) * 9); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 6); ctx.stroke();
  ctx.lineCap = "butt";
  text(str, W / 2 + 16, 43, { size: 30, color: INK, outline: null });
}

function drawHunterCard() {
  const x = 62, y = 52;
  if (mode === "ffa" && state !== "lobby") {
    // Two crossed blades, and how many are still standing.
    ctx.fillStyle = `rgba(249,115,22,${0.25 + Math.sin(gameTime * 4) * 0.1})`;
    ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); fillStroke("#ffedd5");
    for (const a of [-0.7, 0.7]) { ctx.save(); ctx.translate(x - a * 14, y + 18); ctx.rotate(Math.PI + a); ctx.scale(0.6, 0.6); drawWeapon("machete"); ctx.restore(); }
    text(`${cast.filter((c) => c.alive).length} kvar`, x, y + 52, { size: 17, color: "#fdba74", ow: 4 });
    return;
  }
  const h = hunter();
  if (h) {
    ctx.fillStyle = `rgba(220,38,38,${0.25 + Math.sin(gameTime * 4) * 0.1})`;
    ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); fillStroke(h ? "#ffe3e3" : "rgba(255,255,255,0.9)");
  if (h) {
    ctx.save();
    ctx.translate(x + 6, y + 22);
    ctx.rotate(Math.PI + 0.5);
    ctx.scale(0.75, 0.75);
    drawWeapon(lookOf(h).weapon);
    ctx.restore();
    text(h.name, x, y + 52, { size: 18, color: h.human ? h.color : "#fff", ow: 4 });
    const n = hunters().length - 1;
    if (n > 0) text(`+${n} smittad${n > 1 ? "e" : ""}`, x, y + 72, { size: 15, color: "#4ade80", ow: 4 });
  } else {
    text("?", x, y + 2, { size: 38, color: INK, outline: null });
    text("Mördaren", x, y + 52, { size: 16, ow: 4 });
  }
}

function drawCastCards() {
  const list = state === "lobby" || mode === "ffa" ? cast : cast.filter((c) => c !== hunter());
  const cw = Math.min(76, 380 / list.length);
  // A dark glass panel behind the cards so they read on every map.
  ctx.fillStyle = "rgba(15,10,30,0.35)";
  ctx.beginPath(); ctx.roundRect(W - 22 - cw * list.length, 4, cw * list.length + 14, 114, 12); ctx.fill();
  list.forEach((c, i) => {
    const cx = W - 16 - cw * (list.length - i) + cw / 2;
    const hp = Math.round(c.hp);
    if (c.infected) text("Smittad", cx, 18, { size: 13, color: "#4ade80", ow: 4 });
    else text(`${hp}%`, cx, 18, { size: 16, color: hp <= 33 ? "#ffb4b4" : "#fff", ow: 4 });
    ctx.globalAlpha = c.alive ? 1 : 0.55;
    const look = lookOf(c);
    const head = c.infected ? "#86efac" : look.skin;
    ctx.beginPath(); ctx.roundRect(cx - 19, 30, 38, 36, 7); fillStroke(c.alive ? head : "#c9c9c9", 2.5);
    ctx.beginPath(); ctx.roundRect(cx - 19, 60, 38, 7, 3); fillStroke(look.shirt, 2);
    drawFace(cx, 46, 30, c.infected ? "evil" : healthMood(c.alive ? c.hp : 0));
    ctx.globalAlpha = 1;
    // Health bar: green, then yellow, then red.
    ctx.beginPath(); ctx.roundRect(cx - 19, 71, 38, 6, 3); fillStroke("#1f1b2e", 1.5);
    const frac = c.infected ? 1 : clamp(c.hp / 100, 0, 1);
    if (frac > 0) {
      ctx.fillStyle = c.infected ? "#4ade80" : frac > 0.66 ? "#22c55e" : frac > 0.33 ? "#facc15" : "#ef4444";
      ctx.beginPath(); ctx.roundRect(cx - 18, 72, 36 * frac, 4, 2); ctx.fill();
    }
    text(c.name === "Spelare 1" ? "S1" : c.name === "Spelare 2" ? "S2" : c.name, cx, 90, { size: 15, color: c.human ? c.color : "#fff", ow: 4 });
    if (c.wins) text(`★${c.wins}`, cx, 107, { size: 13, color: "#ffd166", ow: 3 });
  });
}

function drawHints() {
  if (state === "lobby") {
    const p1 = p2Joined ? "Spelare 1" : "Du";
    text(`${p1}: A D = gå · W = hoppa · S = hoppa ner · E = kraft · Mellanslag = starta/hugg`, W / 2, GROUND + 24, { size: 18, ow: 4 });
    text(p2Joined
      ? "Spelare 2: ← → = gå · ↑ = hoppa · ↓ = hoppa ner · Höger Shift = kraft · Enter = hugg · dubbelklicka Mellanslag = gå ur"
      : "Spelare 2: dubbelklicka på Mellanslag för att vara med", W / 2, GROUND + 52, { size: 18, color: "#ffe9a8", ow: 4 });
  } else if (state === "round") {
    const h = hunters().find((k) => k.human) || hunter();
    const msg = mode === "ffa"
      ? `Alla mot alla: hugg alla andra, sist kvar vinner! · Kraft: E / Höger Shift · ${map.tip || `Hjärtan ger +${HEART_HEAL}%`}`
      : h.human
      ? `Mördaren hugger med ${h.human === 1 ? "Mellanslag" : "Enter"} · Kraft: E / Höger Shift · ${map.tip || `Hjärtan ger +${HEART_HEAL}%`}`
      : `Fly från mördaren tills tiden är slut! · Kraft: E / Höger Shift · ${map.tip || `Hjärtan ger +${HEART_HEAL}%`}`;
    text(msg, W / 2, GROUND + 38, { size: 18, ow: 4 });
  }
}

function drawCallouts() {
  for (const co of callouts) {
    const pop = Math.min(1, co.t / 0.25);
    const scale = pop < 1 ? 0.6 + pop * 0.5 : 1.1 - Math.min(0.1, (co.t - 0.25) * 0.4);
    const fade = clamp((co.life - co.t) / 0.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(W / 2, 290);
    ctx.scale(scale, scale);
    // A soft drop shadow first, then the words.
    const sh = { color: "rgba(10,5,25,0.35)", outline: "rgba(10,5,25,0.35)" };
    if (co.top) text(co.top, 4, -61, { size: 34, ow: 6, ...sh });
    text(co.text, 6, 7, { size: 72, ow: 10, ...sh });
    if (co.sub) text(co.sub, 4, 69, { size: 32, ow: 6, ...sh });
    if (co.top) text(co.top, 0, -66, { size: 34, ow: 6 });
    text(co.text, 0, 0, { size: 72, color: co.color, ow: 10 });
    if (co.sub) text(co.sub, 0, 64, { size: 32, ow: 6 });
    ctx.restore();
  }
}

// ---------- The shop ----------
// A stall in the lobby. Walk up to it and press up to open your shop window.
const SHOP = { x1: 560, x2: 720 };
const nearShop = (c) => c.onGround && c.surf === 0 && c.x > SHOP.x1 && c.x < SHOP.x2;
let clickables = []; // mouse targets, collected while drawing

function openShop(c) {
  const s = save[c.human];
  shops[c.human] = {
    row: 1,
    idx: [Math.max(0, KILLERS.findIndex((k) => k.id === s.killer)), Math.max(0, SURVIVORS.findIndex((k) => k.id === s.survivor))],
    msg: "", msgOk: true, msgT: 0,
  };
  c.vx = 0;
  tone(520, 0.08, { vol: 0.05 });
  tone(780, 0.12, { vol: 0.05, delay: 0.06 });
}

function shopKeys(c, sh) {
  const k = c.keys;
  if (tapped(k.down)) { shops[c.human] = null; return; }
  if (tapped(k.jump)) sh.row = 1 - sh.row;
  const n = (sh.row ? SURVIVORS : KILLERS).length;
  if (tapped(k.left)) sh.idx[sh.row] = (sh.idx[sh.row] + n - 1) % n;
  if (tapped(k.right)) sh.idx[sh.row] = (sh.idx[sh.row] + 1) % n;
  syncShopSkin(c.human, sh);
  if (tapped(k.hit)) shopChoose(c.human, sh.row, sh.idx[sh.row]);
  if (tapped(k.power)) {
    sh.skin = (sh.skin + 1) % skinsFor((sh.row ? SURVIVORS : KILLERS)[sh.idx[sh.row]].id).length;
    tone(700, 0.05, { vol: 0.04 });
  }
}

// The skin shown for the chosen card starts out as the one that character wears.
function syncShopSkin(player, sh) {
  const key = sh.row + ":" + sh.idx[sh.row];
  if (sh.skinFor === key) return;
  sh.skinFor = key;
  const item = (sh.row ? SURVIVORS : KILLERS)[sh.idx[sh.row]];
  sh.skin = Math.max(0, skinsFor(item.id).findIndex((k) => k.id === save[player].skinOn[item.id]));
}

// Buy the character if it isn't yours yet, or else the skin shown on it, then put it on.
function shopChoose(player, row, i) {
  const item = (row ? SURVIVORS : KILLERS)[i];
  const s = save[player], sh = shops[player];
  syncShopSkin(player, sh);
  const skin = skinsFor(item.id)[sh.skin];
  if (s.owned.includes(item.id) && !ownsSkin(player, item.id, skin.id)) {
    if (skin.level) {
      Object.assign(sh, { msg: `${skin.name} låses upp när ${item.name} når nivå ${skin.level}.`, msgOk: false, msgT: 2.5 });
      sfx.no();
      return;
    }
    if (s.coins < skin.price) {
      Object.assign(sh, { msg: `För lite mynt! ${skin.name}-skinnet kostar ${skin.price}.`, msgOk: false, msgT: 2 });
      sfx.no();
      return;
    }
    s.coins -= skin.price;
    (s.skins[item.id] = s.skins[item.id] || []).push(skin.id);
    Object.assign(sh, { msg: `Du köpte ${skin.name}-skinnet till ${item.name}!`, msgOk: true, msgT: 2 });
    sfx.buy();
  }
  if (s.owned.includes(item.id)) s.skinOn[item.id] = skin.id;
  if (!s.owned.includes(item.id)) {
    if (s.coins < item.price) {
      Object.assign(sh, { msg: `För lite mynt! ${item.name} kostar ${item.price}.`, msgOk: false, msgT: 2 });
      sfx.no();
      return;
    }
    s.coins -= item.price;
    s.owned.push(item.id);
    Object.assign(sh, { msg: `Du köpte ${item.name}!`, msgOk: true, msgT: 2 });
    sfx.buy();
  } else {
    tone(660, 0.08, { vol: 0.05 });
  }
  if (row) s.survivor = item.id; else s.killer = item.id;
  writeSave();
}

function drawShopStall() {
  const { x1, x2 } = SHOP, w = x2 - x1;
  ctx.beginPath(); ctx.roundRect(x1 + 4, 500, 10, GROUND - 500, 2); fillStroke("#8b5a2b");
  ctx.beginPath(); ctx.roundRect(x2 - 14, 500, 10, GROUND - 500, 2); fillStroke("#8b5a2b");
  depth3d(x1 - 6, 584, w + 12, GROUND - 584, 4, "#b7794a", 0, 8, -7);
  ctx.beginPath(); ctx.roundRect(x1 - 6, 584, w + 12, GROUND - 584, 4); fillStroke("#b7794a");
  depth3d(x1 - 12, 576, w + 24, 12, 4, "#d69a62", 0, 8, -7);
  ctx.beginPath(); ctx.roundRect(x1 - 12, 576, w + 24, 12, 4); fillStroke("#d69a62");

  // On the counter: a pile of coins and a mannequin showing a different killer every few seconds.
  drawCoinIcon(x1 + 26, 566, 9);
  drawCoinIcon(x1 + 42, 568, 9);
  drawCoinIcon(x1 + 34, 557, 9);
  ctx.save();
  ctx.translate(x2 - 40, 576);
  ctx.scale(0.5, 0.5);
  drawFigure(KILLERS[Math.floor(gameTime / 2.5) % KILLERS.length], {
    facing: -1, walk: 0, moving: false, airborne: false, mood: "evil", scared: false, armed: true, swing: -1, gray: false,
  });
  ctx.restore();

  // Striped awning and the sign.
  const top = 478, bot = 512, n = 8, sw = (w + 32) / n;
  for (let i = 0; i < n; i++) {
    const sx = x1 - 16 + i * sw;
    ctx.beginPath();
    ctx.moveTo(sx, top); ctx.lineTo(sx + sw, top); ctx.lineTo(sx + sw, bot - 6);
    ctx.arc(sx + sw / 2, bot - 6, sw / 2, 0, Math.PI);
    ctx.closePath();
    fillStroke(i % 2 ? "#fff7ed" : "#ef4444", 2.5);
  }
  ctx.beginPath(); ctx.roundRect(x1 + 12, 432, w - 24, 40, 8); fillStroke("#ffd166");
  text("AFFÄR", (x1 + x2) / 2, 453, { size: 26, color: INK, outline: null });
}

// Text shrunk to fit a width.
function fitText(str, x, y, maxW, size, opts) {
  ctx.font = `700 ${size}px ${FONT}`;
  const w = ctx.measureText(str).width;
  text(str, x, y, { ...opts, size: w > maxW ? Math.floor(size * maxW / w) : size });
}

function drawShops() {
  const open = [1, 2].filter((n) => shops[n]);
  for (const n of open) {
    const w = open.length === 2 ? 610 : 780;
    const x = open.length === 2 ? (n === 1 ? 20 : 650) : (W - w) / 2;
    drawShopPanel(n, shops[n], x, w);
  }
}

function drawShopPanel(n, sh, x, w) {
  const y = 74, h = 600;
  const s = save[n];
  const who = cast.find((c) => c.human === n);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); fillStroke("rgba(255,250,240,0.97)", 4);
  text("AFFÄREN", x + 24, y + 32, { size: 30, color: INK, outline: null, align: "left" });
  if (who) text(who.name, x + 190, y + 33, { size: 20, color: PLAYER_COLORS[n], align: "left", ow: 4 });
  drawCoins(x + w - 120, y + 32, s.coins, 26);

  const bx = x + w - 32, by = y + 32;
  ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2); fillStroke("#fecaca", 2.5);
  text("✕", bx, by + 1, { size: 18, color: INK, outline: null });
  clickables.push({ x: bx - 16, y: by - 16, w: 32, h: 32, fn: () => { shops[n] = null; } });

  syncShopSkin(n, sh);
  drawShopRow(n, sh, 0, x, y + 72, w);
  drawShopRow(n, sh, 1, x, y + 282, w);

  const item = (sh.row ? SURVIVORS : KILLERS)[sh.idx[sh.row]];
  // Skin chips for the chosen character.
  const skinList = skinsFor(item.id);
  const chipW = (w - 48) / skinList.length;
  skinList.forEach((sk, k) => {
    const cx = x + 24 + k * chipW, cy = y + h - 116;
    const has = s.owned.includes(item.id) && ownsSkin(n, item.id, sk.id);
    const on = sh.skin === k;
    ctx.beginPath(); ctx.roundRect(cx + 2, cy, chipW - 4, 32, 9); fillStroke(on ? "#fff7d6" : "#ffffff", on ? 3 : 2);
    if (on) { ctx.beginPath(); ctx.roundRect(cx + 5, cy + 3, chipW - 10, 26, 7); ctx.lineWidth = 3; ctx.strokeStyle = PLAYER_COLORS[n]; ctx.stroke(); }
    ctx.fillStyle = sk.chip;
    ctx.beginPath(); ctx.arc(cx + 11, cy + 16, 5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    fitText(sk.name, cx + chipW / 2 + 5, cy + 10, chipW - 26, 11, { color: INK, outline: null });
    const tag = has ? (s.skinOn[item.id] || "standard") === sk.id ? "✓ på" : "din" : sk.level ? `nivå ${sk.level}` : `${sk.price} mynt`;
    text(tag, cx + chipW / 2 + 5, cy + 23, { size: 10, color: has ? "#15803d" : "#6b7280", outline: null });
    clickables.push({ x: cx, y: cy, w: chipW, h: 32, fn: () => { sh.skin = k; } });
  });
  let line, color = INK;
  if (sh.msgT > 0) { line = sh.msg; color = sh.msgOk ? "#15803d" : "#dc2626"; }
  else if (s.owned.includes(item.id) && !ownsSkin(n, item.id, skinsFor(item.id)[sh.skin].id)) {
    const sk = skinsFor(item.id)[sh.skin];
    line = sk.level ? `${sk.name}-skinnet låses upp när ${item.name} når nivå ${sk.level}` : `${sk.name}-skinnet till ${item.name} kostar ${sk.price} mynt`;
  }
  else if (s.owned.includes(item.id)) {
    const L = levelOf(n, item.id);
    const lv = L.lv >= MAX_LEVEL ? "nivå 100 (max)" : `nivå ${L.lv}, ${L.xp}/${xpToNext(L.lv)} XP till nästa`;
    line = (sh.row ? s.survivor : s.killer) === item.id ? `${item.name} (${lv}): den har du på dig` : `${item.name} (${lv}): välj den för att ta på den`;
  }
  else line = `${item.name} kostar ${item.price} mynt`;
  fitText(line, x + w / 2, y + h - 70, w - 40, 20, { color, outline: null });
  const pw = POWERS[item.id];
  fitText(`Kraft: ${pw.name} – ${pw.desc}`, x + w / 2, y + h - 44, w - 40, 17, { color: "#6d28d9", outline: null });
  text(n === 1
    ? "A D = välj · W = byt rad · E = byt skin · Mellanslag = köp/ta på · S = stäng"
    : "← → = välj · ↑ = byt rad · Höger Shift = byt skin · Enter = köp/ta på · ↓ = stäng",
  x + w / 2, y + h - 18, { size: 15, color: "#6b7280", outline: null });
}

function drawShopRow(n, sh, row, x, y, w) {
  const list = row ? SURVIVORS : KILLERS;
  const s = save[n];
  text(row ? "Överlevare" : "Mördare", x + 24, y, { size: 22, color: row ? "#15803d" : "#b91c1c", outline: null, align: "left" });
  const VISIBLE = 8;
  const gap = 8, cw = Math.min(88, (w - 40) / VISIBLE - gap), ch = 182;
  // Show 8 cards at a time, scrolled so the chosen one is always in view.
  sh.start = sh.start || [0, 0];
  let start = sh.start[row];
  if (sh.idx[row] < start) start = sh.idx[row];
  if (sh.idx[row] >= start + VISIBLE) start = sh.idx[row] - VISIBLE + 1;
  start = sh.start[row] = clamp(start, 0, Math.max(0, list.length - VISIBLE));
  const shown = list.slice(start, start + VISIBLE);
  const rowW = shown.length * (cw + gap) - gap;
  const left = x + (w - rowW) / 2;
  if (list.length > VISIBLE) {
    text(`${start + 1}–${start + shown.length} av ${list.length}`, x + w - 24, y, { size: 15, color: "#6b7280", outline: null, align: "right" });
    for (const [dir, ax, on] of [[-1, left - 11, start > 0], [1, left + rowW + 11, start + VISIBLE < list.length]]) {
      if (!on) continue;
      text(dir < 0 ? "‹" : "›", ax, y + 18 + ch / 2, { size: 34, color: INK, outline: null });
      clickables.push({ x: ax - 11, y: y + 18, w: 22, h: ch, fn: () => { sh.row = row; sh.idx[row] = dir < 0 ? start - 1 : start + VISIBLE; } });
    }
  }
  shown.forEach((item, k) => {
    const i = start + k;
    const sel = sh.row === row && sh.idx[row] === i;
    const owned = s.owned.includes(item.id), worn = (row ? s.survivor : s.killer) === item.id;
    const cx = left + k * (cw + gap), cy = y + 18 - (sel ? 5 : 0);

    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 10);
    fillStroke(worn ? "#dcfce7" : sel ? "#fff7d6" : "#ffffff", 2.5);
    if (sel) {
      ctx.beginPath(); ctx.roundRect(cx + 3, cy + 3, cw - 6, ch - 6, 8);
      ctx.lineWidth = 4; ctx.strokeStyle = PLAYER_COLORS[n]; ctx.stroke();
    }

    ctx.save();
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 10); ctx.clip();
    ctx.translate(cx + cw / 2, cy + 128);
    ctx.scale(cw / 92, cw / 92);
    const skin = sel ? skinsFor(item.id)[sh.skin].id : owned ? s.skinOn[item.id] : null;
    drawFigure(skinLook(item, skin), {
      facing: 1, walk: gameTime * 9, moving: sel, airborne: false,
      mood: row ? "happy" : "evil", scared: false, armed: !row, swing: -1, gray: false,
    });
    ctx.restore();

    fitText(item.name, cx + cw / 2, cy + 144, cw - 8, 14, { color: INK, outline: null });
    if (owned) drawLevelBadge(cx + 18, cy + 14, levelOf(n, item.id).lv, 11);
    if (worn) text("✓ Vald", cx + cw / 2, cy + 166, { size: 15, color: "#15803d", outline: null });
    else if (owned) text("Din", cx + cw / 2, cy + 166, { size: 15, color: "#2563eb", outline: null });
    else drawCoins(cx + cw / 2, cy + 166, item.price, 16, s.coins >= item.price ? "#ffffff" : "#fca5a5");

    clickables.push({ x: cx, y: cy, w: cw, h: ch, fn: () => { sh.row = row; sh.idx[row] = i; shopChoose(n, row, i); } });
  });
}

canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  for (let i = clickables.length - 1; i >= 0; i--) {
    const b = clickables[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); break; }
  }
});

// ---------- Mode chooser ----------
function drawModePick() {
  const w = 1200, h = 390, x = (W - w) / 2, y = 140;
  ctx.fillStyle = "rgba(20,18,30,0.35)";
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); fillStroke("rgba(255,250,240,0.98)", 4);
  text("Välj spelläge", W / 2, y + 40, { size: 34, color: INK, outline: null });
  MODES.forEach((m, i) => {
    const sel = modePick.idx === i;
    const cw = 270, ch = 250, cx = x + 30 + i * 288, cy = y + 76 - (sel ? 6 : 0);
    if (m.id === "slump") {
      // A big spinning question mark between a killer and a survivor.
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 16); fillStroke(sel ? "#fff7d6" : "#ffffff", 3);
      if (sel) { ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, cw - 8, ch - 8, 13); ctx.lineWidth = 5; ctx.strokeStyle = m.color; ctx.stroke(); }
      for (const [look, fx, face, mood, armed] of [[KILLERS[1], 50, 1, "evil", true], [SURVIVORS[1], cw - 50, -1, "scared", false]]) {
        ctx.save(); ctx.translate(cx + fx, cy + 140); ctx.scale(0.7, 0.7);
        drawFigure(look, { facing: face, walk: gameTime * 9, moving: sel, airborne: false, mood, scared: !armed, armed, swing: -1 });
        ctx.restore();
      }
      ctx.save();
      ctx.translate(cx + cw / 2, cy + 86);
      ctx.scale(sel ? Math.cos(gameTime * 3) : 1, 1);
      text("?", 0, 0, { size: 90, color: m.color, ow: 7 });
      ctx.restore();
      text(m.name, cx + cw / 2, cy + 172, { size: 30, color: m.color, ow: 5 });
      m.lines.forEach((line, j) => text(line, cx + cw / 2, cy + 204 + j * 24, { size: 16, color: INK, outline: null }));
      clickables.push({ x: cx, y: cy, w: cw, h: ch, fn: () => startCountdown(m.id) });
      return;
    }
    if (m.id === "ffa") {
      // Three killers going at each other.
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 16); fillStroke(sel ? "#fff7d6" : "#ffffff", 3);
      if (sel) { ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, cw - 8, ch - 8, 13); ctx.lineWidth = 5; ctx.strokeStyle = m.color; ctx.stroke(); }
      [[KILLERS[0], 55, 1], [KILLERS[5], 135, -1], [KILLERS[3], 215, -1]].forEach(([look, fx, face]) => {
        ctx.save(); ctx.translate(cx + fx, cy + 140); ctx.scale(0.75, 0.75);
        drawFigure(look, { facing: face, walk: gameTime * 9, moving: sel, airborne: false, mood: "evil", scared: false, armed: true, swing: sel ? (gameTime * 2) % 1 : -1 });
        ctx.restore();
      });
      text(m.name, cx + cw / 2, cy + 172, { size: 30, color: m.color, ow: 5 });
      m.lines.forEach((line, j) => text(line, cx + cw / 2, cy + 204 + j * 24, { size: 16, color: INK, outline: null }));
      clickables.push({ x: cx, y: cy, w: cw, h: ch, fn: () => startCountdown(m.id) });
      return;
    }
    ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 16); fillStroke(sel ? "#fff7d6" : "#ffffff", 3);
    if (sel) {
      ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, cw - 8, ch - 8, 13);
      ctx.lineWidth = 5; ctx.strokeStyle = m.color; ctx.stroke();
    }
    // A little scene: one killer chasing, or a killer with a green, infected friend.
    const fig = (look, fx, mood, armed, glow) => {
      if (glow) {
        ctx.beginPath(); ctx.ellipse(fx, cy + 104, 26, 42, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(74,222,128,0.3)"; ctx.fill();
      }
      ctx.save(); ctx.translate(fx, cy + 140); ctx.scale(0.75, 0.75);
      drawFigure(look, { facing: 1, walk: gameTime * 9, moving: sel, airborne: false, mood, scared: mood === "scared", armed, swing: -1 });
      ctx.restore();
    };
    if (m.id === "vanligt") {
      fig(KILLERS[0], cx + 90, "evil", true, false);
      fig(SURVIVORS[0], cx + 190, "scared", false, false);
    } else {
      fig(KILLERS[0], cx + 55, "evil", true, true);
      fig({ ...SURVIVORS[2], skin: "#86efac" }, cx + 135, "evil", false, true);
      fig(SURVIVORS[0], cx + 215, "scared", false, false);
    }
    text(m.name, cx + cw / 2, cy + 172, { size: 30, color: m.color, ow: 5 });
    m.lines.forEach((line, j) => text(line, cx + cw / 2, cy + 204 + j * 24, { size: 16, color: INK, outline: null }));
    clickables.push({ x: cx, y: cy, w: cw, h: ch, fn: () => startCountdown(m.id) });
  });
  text("A D / ← → = välj · Mellanslag / Enter = starta · S / ↓ = tillbaka", W / 2, y + h - 22, { size: 17, color: "#6b7280", outline: null });
}

// ---------- Ambient life ----------
// Small moving things in the background of each scene, all worked out from the
// clock so nothing needs to be stored: bats over the graveyard, embers over the
// burning town, flickering hotel lights, carnival confetti, falling sprinkles,
// shooting stars over Planet Voss, and embers from the cabin's fire.
function glowDot(x, y, r, color, a) {
  ctx.globalAlpha = a * 0.35;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAmbient() {
  const t = gameTime;
  const id = state === "lobby" ? "lobby" : map.id;
  if (id === "yorick") {
    // Bats.
    ctx.fillStyle = "#0f0a1f";
    for (let i = 0; i < 5; i++) {
      const x = ((t * (60 + i * 11) + i * 300) % (W + 200)) - 100, y = 120 + i * 30 + Math.sin(t * 3 + i) * 14;
      const flap = Math.sin(t * 16 + i * 2) * 6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 8, y - 6 - flap, x - 14, y + 2 - flap); ctx.quadraticCurveTo(x - 7, y + 1, x, y + 4);
      ctx.quadraticCurveTo(x + 7, y + 1, x + 14, y + 2 - flap); ctx.quadraticCurveTo(x + 8, y - 6 - flap, x, y); ctx.fill();
    }
  } else if (id === "pizza") {
    // Embers drifting up from the fires.
    for (let i = 0; i < 24; i++) {
      const k = ((t * 0.25 + i * 0.041) % 1);
      const x = (i * 53 + Math.sin(t + i) * 20) % W, y = H - k * H;
      glowDot(x, y, 1.8, i % 2 ? "#fb923c" : "#fde047", 1 - k);
    }
  } else if (id === "hotel") {
    // The lights flicker now and then.
    if (Math.sin(t * 1.7) > 0.96 || Math.sin(t * 13) > 0.995) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, W, H); }
  } else if (id === "carnival") {
    // Confetti.
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + Math.sin(t * 0.8 + i) * 30 + W) % W, y = (i * 61 + t * (40 + (i % 5) * 10)) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i);
      ctx.fillStyle = ["#facc15", "#22d3ee", "#f43f5e", "#a3e635", "#ffffff"][i % 5];
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
  } else if (id === "cake") {
    // Sprinkles falling from the machines.
    for (let i = 0; i < 26; i++) {
      const x = (i * 131 + W) % W, y = (i * 83 + t * (70 + (i % 4) * 15)) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i + t);
      ctx.fillStyle = ["#f472b6", "#60a5fa", "#facc15", "#34d399"][i % 4];
      ctx.fillRect(-4, -1.5, 8, 3);
      ctx.restore();
    }
  } else if (id === "voss") {
    for (let i = 0; i < 2; i++) {
      const k = ((t + i * 3.7) % 7) / 7;
      if (k > 0.18) continue;
      const p = k / 0.18, x = 200 + i * 520 + p * 380, y = 80 + i * 60 + p * 160;
      ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60, y - 25); ctx.stroke();
      glowDot(x, y, 2.5, "#ffffff", 1 - p);
    }
  } else if (id === "lobby") {
    for (let i = 0; i < 10; i++) {
      const k = ((t * 0.35 + i * 0.1) % 1);
      const x = 160 + Math.sin(i * 3 + t * 2) * 22 + (i - 5) * 3, y = 600 - k * 230;
      glowDot(x, y, 1.8, i % 2 ? "#fb923c" : "#fde047", 1 - k);
    }
  }
}

// ---------- Minimap ----------
// The match maps are three screens wide, so a strip under the banner shows the
// whole map: its platforms, the part on screen, and where everyone is.
function drawMinimap() {
  if (state !== "round") return;
  const mw = 480, mh = 44, x = (W - mw) / 2, y = 80;
  const top = Math.min(...surfaces.map((sf) => sf.y)) - 90;
  const mx = (wx) => x + 6 + (wx / world.width) * (mw - 12);
  const my = (wy) => y + 4 + ((wy - top) / (GROUND - top)) * (mh - 10);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, mw, mh, 10);
  ctx.fillStyle = "rgba(10,5,25,0.55)"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const sf of surfaces) { ctx.moveTo(mx(sf.x1), my(sf.y)); ctx.lineTo(mx(sf.x2), my(sf.y)); }
  ctx.stroke();
  // The part of the map that's on screen.
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(mx(cam.x), y, mx(cam.x + W / cam.z) - mx(cam.x), mh);
  const dots = cast.filter((c) => c.alive).sort((a, b) => !!a.human - !!b.human);
  for (const c of dots) {
    const killer = c.role === "hunter" || c.fighter;
    const r = c.human ? 5 : 3.5;
    ctx.beginPath(); ctx.arc(mx(c.x), my(c.y) - r, r, 0, Math.PI * 2);
    ctx.fillStyle = c.human ? c.color : killer ? "#ef4444" : "#f8fafc";
    ctx.fill();
    if (c.human || killer) { ctx.lineWidth = 1.5; ctx.strokeStyle = c.human && killer ? "#ef4444" : INK; ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- Atmosphere ----------
function drawAtmosphere() {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, "rgba(10,5,25,0)");
  v.addColorStop(1, state === "lobby" ? "rgba(40,15,0,0.32)" : "rgba(10,5,25,0.36)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  if (state !== "round") return;
  let danger = 0, hurt = 0;
  for (const c of cast) {
    if (!c.human || !c.alive || (c.role !== "survivor" && mode !== "ffa")) continue;
    const h = mode === "ffa" ? victimsOf(c).reduce((a, b) => (!a || Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? b : a), null) : nearestHunter(c);
    if (h) danger = Math.max(danger, clamp(1 - Math.hypot(h.x - c.x, h.y - c.y) / 260, 0, 1));
    hurt = Math.max(hurt, c.hurt / 0.3);
  }
  const a = danger * (0.2 + Math.sin(gameTime * 9) * 0.08) + hurt * 0.3;
  if (a <= 0.01) return;
  const r = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
  r.addColorStop(0, "rgba(220,38,38,0)");
  r.addColorStop(1, `rgba(220,38,38,${a})`);
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Render ----------
function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); // a clean start even after a broken frame
  ctx.globalAlpha = 1;
  clickables = [];
  if (state === "lobby") drawLobby(); else drawArena();
  drawAmbient();

  ctx.save();
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  if (state !== "lobby") drawArenaWorld();
  if (shake > 0) ctx.translate(rand(-6, 6) * shake / 0.3, rand(-6, 6) * shake / 0.3);
  drawTraps();
  drawHelpers();
  for (const hh of hearts) if (hh.pizza) drawPizza(hh.x, hh.y - 22 - Math.sin(hh.t * 4) * 4, 1.1);
  for (const hh of hearts) {
    const g = ctx.createRadialGradient(hh.x, hh.y - 24, 2, hh.x, hh.y - 24, 30);
    g.addColorStop(0, hh.pizza ? "rgba(251,191,36,0.5)" : "rgba(255,91,138,0.5)");
    g.addColorStop(1, "rgba(255,91,138,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(hh.x, hh.y - 24, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(20,10,30,0.2)";
    ctx.beginPath(); ctx.ellipse(hh.x, hh.y, 12 - Math.sin(hh.t * 4) * 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const hh of hearts) if (!hh.pizza) drawHeart(hh.x, hh.y - 24 - Math.sin(hh.t * 4) * 4, 1.3 + Math.sin(hh.t * 6) * 0.05);

  // Dead first, then bots, then the players on top.
  const order = [...cast].sort((a, b) => (a.alive - b.alive) || (!!a.human - !!b.human));
  for (const c of order) drawChar(c);
  for (const d of decoys) drawChar(d);
  drawProjectiles();
  drawCars();

  for (const p of particles) {
    const a = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a * 0.25; // a soft glow around each spark
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.4), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const drawFloater = (fl) => {
    ctx.globalAlpha = clamp((fl.life - fl.t) / 0.6, 0, 1);
    const pop = 1 + 0.45 * Math.max(0, 1 - fl.t / 0.15);
    text(fl.text, fl.x, fl.y - fl.t * (fl.size > 22 ? 12 : 40), { size: Math.round(fl.size * pop), color: fl.color, ow: fl.size > 22 ? 7 : 5 });
  };
  for (const fl of floaters) if (!fl.screen) drawFloater(fl);
  ctx.globalAlpha = 1;
  ctx.restore();
  for (const fl of floaters) if (fl.screen) drawFloater(fl);
  ctx.globalAlpha = 1;

  drawAtmosphere();
  if (state === "lobby") drawBanner(timer > LOBBY_COUNTDOWN ? "Tryck på mellanslag för att börja" : `${mode === "smittan" ? "Smittan" : mode === "ffa" ? "Alla mot alla" : "Ronden"} börjar om ${fmtTime(timer)}`);
  else if (state === "round") drawBanner(`Ronden slutar om ${fmtTime(timer)}`);
  else drawBanner(`Tillbaka till lobbyn om ${fmtTime(timer)}`);

  drawMinimap();
  drawHunterCard();
  drawCastCards();
  drawHints();
  if (state === "lobby") drawShops();
  if (modePick) drawModePick();
  drawCallouts();
  drawMusicLabel();
  if (sceneFade > 0) {
    ctx.fillStyle = `rgba(10,5,25,${sceneFade})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === "lobby" && timer <= 3) {
    const n = Math.ceil(timer);
    const t = n - timer;
    text(String(n), W / 2, 300, { size: 140 + t * 40, color: "#ffd166", ow: 12 });
  }
}

// ---------- Camera ----------
// In a match the camera follows the players (both, when there are two), and
// zooms out as far as it needs to keep them on screen. The floor stays at the
// bottom of the screen. In the lobby it doesn't move.
const cam = { x: 0, y: 0, z: 1, snap: true };
function updateCamera(dt) {
  if (state === "lobby") { Object.assign(cam, { x: 0, y: 0, z: 1, snap: true }); return; }
  let pts = cast.filter((c) => c.human && c.alive);
  if (!pts.length) pts = cast.filter((c) => c.alive);
  if (!pts.length) pts = cast;
  let x1 = Infinity, x2 = -Infinity, top = Infinity;
  for (const c of pts) { x1 = Math.min(x1, c.x); x2 = Math.max(x2, c.x); top = Math.min(top, c.y - 120); }
  const ww = world.width;
  const tz = clamp(Math.min(W / (x2 - x1 + 520), H / (GROUND + 70 - top)), W / ww, 1);
  const k = cam.snap ? 1 : Math.min(1, dt * 3);
  cam.z += (tz - cam.z) * k;
  const viewW = W / cam.z;
  const tx = clamp((x1 + x2) / 2 - viewW / 2, 0, ww - viewW);
  cam.x += (tx - cam.x) * (cam.snap ? 1 : Math.min(1, dt * 6));
  cam.y = H - H / cam.z;
  cam.snap = false;
}

// ---------- Main loop ----------
const STEP = 1 / 120;
let acc = 0, last = performance.now();
// If something goes wrong in a frame, the game keeps going instead of freezing.
let frameErrors = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (hitStop > 0) hitStop -= real;
  else acc += real * (slowMo > 0 ? 0.3 : 1);
  slowMo = Math.max(0, slowMo - real);
  try {
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    updateMusic();
    updateCamera(1 / 60);
    render();
  } catch (e) {
    acc = 0;
    if (frameErrors++ < 5) console.error(e);
  }
}

startLobby();
requestAnimationFrame(frame);
