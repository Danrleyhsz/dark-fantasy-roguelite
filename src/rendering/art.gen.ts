// Gerado por tools/art.mjs a partir de art/raw. Não editar à mão: rode `npm run art`.
export const ART = {
  "player": {
    "src": "assets/characters/player.png",
    "frameW": 205,
    "frameH": 196,
    "anchorX": 102.5,
    "anchorY": 194,
    "frames": [
      "idle",
      "run",
      "slash",
      "dodge"
    ]
  },
  "penitent": {
    "src": "assets/enemies/penitent.png",
    "frameW": 206,
    "frameH": 196,
    "anchorX": 103,
    "anchorY": 194,
    "frames": [
      "pray",
      "walk",
      "windup",
      "attack"
    ]
  },
  "props": {
    "src": "assets/environment/props.png",
    "frameW": 196,
    "frameH": 196,
    "anchorX": 98,
    "anchorY": 98,
    "frames": [
      "window",
      "doorClosed",
      "doorOpen",
      "column"
    ]
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
