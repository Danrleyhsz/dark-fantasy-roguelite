// Efeitos sonoros sintetizados com WebAudio: sem arquivos externos nem licenças de terceiros.
// O navegador só libera áudio após um gesto do usuário: unlock() é chamado no primeiro clique/tecla.

export type SfxName = 'swing' | 'hit' | 'crit' | 'hurt' | 'kill' | 'dodge' | 'skill' | 'pickup' | 'levelup' | 'door' | 'shot' | 'windup' | 'victory' | 'defeat';

export interface Sfx {
  play(name: SfxName): void;
  setVolume(v: number): void;
  unlock(): void;
}

export function createSfx(initialVolume: number): Sfx {
  let ctx: AudioContext | null = null, master: GainNode | null = null, noiseBuf: AudioBuffer | null = null;
  let volume = initialVolume;

  function unlock(): void {
    if (!ctx) {
      try {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch {
        ctx = null; // sem WebAudio: o jogo segue em silêncio
      }
    } else if (ctx.state === 'suspended') void ctx.resume();
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, endFreq = freq, delay = 0): void {
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur: number, gain: number, freq: number, q = 1, delay = 0): void {
    if (!ctx || !master || !noiseBuf) return;
    const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const SOUNDS: Record<SfxName, () => void> = {
    swing: () => noise(0.12, 0.25, 1800, 0.8),
    hit: () => { noise(0.08, 0.35, 900, 1.2); tone(140, 0.1, 'square', 0.12, 70); },
    crit: () => { noise(0.1, 0.4, 1200, 1.5); tone(520, 0.18, 'triangle', 0.15, 260); },
    hurt: () => { tone(220, 0.25, 'sawtooth', 0.18, 80); noise(0.2, 0.2, 400); },
    kill: () => { noise(0.35, 0.3, 300, 0.7); tone(90, 0.35, 'sine', 0.25, 40); },
    dodge: () => noise(0.18, 0.18, 2600, 0.6),
    skill: () => { noise(0.5, 0.35, 700, 0.6); tone(110, 0.5, 'sawtooth', 0.15, 220); },
    pickup: () => { tone(660, 0.12, 'triangle', 0.15); tone(990, 0.18, 'triangle', 0.12, 990, 0.08); },
    levelup: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, f, i * 0.09)),
    door: () => { tone(70, 0.8, 'sine', 0.3, 50); noise(0.6, 0.15, 200, 0.5); },
    shot: () => { noise(0.25, 0.15, 500, 0.8); tone(300, 0.2, 'sine', 0.08, 600); },
    windup: () => tone(180, 0.22, 'square', 0.06, 260),
    victory: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.6, 'triangle', 0.14, f, i * 0.15)),
    defeat: () => [330, 262, 196, 131].forEach((f, i) => tone(f, 0.6, 'sine', 0.16, f, i * 0.2)),
  };

  return {
    unlock,
    play(name) {
      if (volume > 0 && ctx && ctx.state === 'running') SOUNDS[name]();
    },
    setVolume(v) {
      volume = v;
      if (master) master.gain.value = v;
    },
  };
}
