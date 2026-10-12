import { ART } from './art.gen.ts';
import type { Images } from './render.ts';

/** Carrega as imagens do manifesto. Uma falha vira aviso no console e o jogo usa o desenho provisório. */
export async function loadImages(): Promise<Images> {
  const images: Images = {};
  await Promise.all(Object.entries(ART).map(([id, def]) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[id] = img;
      resolve();
    };
    img.onerror = () => {
      console.warn(`Falha ao carregar ${def.src}; usando desenho provisório.`);
      resolve();
    };
    img.src = def.src;
  })));
  return images;
}
