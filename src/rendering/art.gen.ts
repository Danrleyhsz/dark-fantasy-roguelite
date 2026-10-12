// Gerado por tools/art.mjs a partir de art/raw. Não editar à mão: rode `npm run art`.
export const ART = {
  "hero": {
    "src": "assets/characters/hero.png",
    "frameW": 252,
    "frameH": 228,
    "anchorX": 126,
    "anchorY": 226,
    "frames": [
      "idleF",
      "runF",
      "slashF",
      "dodgeF",
      "idleB",
      "runB",
      "slashB",
      "dodgeB"
    ]
  },
  "penitent": {
    "src": "assets/enemies/penitent.png",
    "frameW": 177,
    "frameH": 212,
    "anchorX": 88.5,
    "anchorY": 210,
    "frames": [
      "pray",
      "walk",
      "windup",
      "attack"
    ]
  },
  "acolyte": {
    "src": "assets/enemies/acolyte.png",
    "frameW": 174,
    "frameH": 212,
    "anchorX": 87,
    "anchorY": 210,
    "frames": [
      "idle",
      "walk",
      "windup",
      "throw"
    ]
  },
  "brute": {
    "src": "assets/enemies/brute.png",
    "frameW": 310,
    "frameH": 244,
    "anchorX": 155,
    "anchorY": 242,
    "frames": [
      "idle",
      "windup",
      "charge",
      "stun"
    ]
  },
  "angel": {
    "src": "assets/bosses/angel.png",
    "frameW": 399,
    "frameH": 324,
    "anchorX": 199.5,
    "anchorY": 322,
    "frames": [
      "idle",
      "windup",
      "thrust",
      "wings"
    ]
  },
  "props": {
    "src": "assets/environment/props.png",
    "frameW": 228,
    "frameH": 228,
    "anchorX": 114,
    "anchorY": 114,
    "frames": [
      "window",
      "doorClosed",
      "doorOpen",
      "plaque",
      "column",
      "brazier",
      "statue",
      "candelabra"
    ]
  },
  "icons": {
    "src": "assets/ui/icons.png",
    "frameW": 100,
    "frameH": 100,
    "anchorX": 50,
    "anchorY": 50,
    "frames": [
      "vigor",
      "reach",
      "swift",
      "shadowStep",
      "lifesteal",
      "thorns",
      "holyWave",
      "deflect",
      "ash",
      "weapon",
      "armor",
      "relic",
      "attack",
      "dodge",
      "skill",
      "level"
    ]
  },
  "keyArt": {
    "src": "assets/ui/key-art.jpg",
    "width": 1600,
    "height": 893
  },
  "floor": {
    "src": "assets/environment/floor.jpg",
    "width": 512,
    "height": 512
  },
  "wall": {
    "src": "assets/environment/wall.jpg",
    "width": 384,
    "height": 384
  }
} as const;
