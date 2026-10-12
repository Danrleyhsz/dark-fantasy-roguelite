// Valores de equilíbrio centralizados (GDD: vida, dano, recarga e recompensas num só lugar).
// Distâncias em pixels lógicos, tempos em segundos.

/** Golpe em setor à frente (Penitente). */
export interface SweepAttack { kind: 'sweep'; range: number; windup: number; active: number; recover: number; reach: number; arc: number; damage: number }
/** Investida em linha reta; atordoa ao bater na parede (Bruto, estocada do chefe). */
export interface ChargeAttack { kind: 'charge'; range: number; windup: number; speed: number; duration: number; recover: number; stun: number; damage: number }
/** Projéteis em leque (Acólito, penas do chefe). */
export interface VolleyAttack { kind: 'volley'; range: number; windup: number; count: number; spread: number; speed: number; recover: number; damage: number; projectile: 'ember' | 'feather' }
/** Impacto em círculo ao redor do inimigo (queda do chefe). */
export interface SlamAttack { kind: 'slam'; range: number; windup: number; radius: number; recover: number; damage: number }
export type AttackDef = SweepAttack | ChargeAttack | VolleyAttack | SlamAttack;

export type EnemyKind = 'penitent' | 'acolyte' | 'brute' | 'angel';

export interface EnemyDef {
  name: string;
  hp: number;
  radius: number;
  speed: number;
  aggroRange: number;
  /** Distância que inimigos à distância tentam manter (0 = corpo a corpo). */
  keepAway: number;
  /** Multiplicador do recuo sofrido (1 = normal). */
  knockback: number;
  /** Tempo atordoado ao levar golpe fora de ataque (0 = não é interrompido). */
  stagger: number;
  /** Espera mínima entre ataques. */
  cooldown: number;
  attacks: AttackDef[];
  boss?: boolean;
}

const ENEMIES: Record<EnemyKind, EnemyDef> = {
  penitent: {
    name: 'Penitente', hp: 4, radius: 11, speed: 85, aggroRange: 300, keepAway: 0, knockback: 1, stagger: 0.18, cooldown: 0,
    attacks: [{ kind: 'sweep', range: 50, windup: 0.6, active: 0.12, recover: 0.7, reach: 56, arc: 1.9, damage: 1 }],
  },
  acolyte: {
    name: 'Acólito', hp: 3, radius: 10, speed: 75, aggroRange: 420, keepAway: 190, knockback: 1.1, stagger: 0.25, cooldown: 1.1,
    attacks: [{ kind: 'volley', range: 330, windup: 0.75, count: 1, spread: 0, speed: 230, recover: 0.5, damage: 1, projectile: 'ember' }],
  },
  brute: {
    name: 'Flagelante', hp: 8, radius: 16, speed: 55, aggroRange: 340, keepAway: 0, knockback: 0.3, stagger: 0, cooldown: 1.0,
    attacks: [{ kind: 'charge', range: 280, windup: 0.85, speed: 430, duration: 0.75, recover: 0.8, stun: 1.6, damage: 2 }],
  },
  angel: {
    name: 'Anjo Caído', hp: 36, radius: 22, speed: 70, aggroRange: 9999, keepAway: 120, knockback: 0.15, stagger: 0, cooldown: 0.7, boss: true,
    attacks: [
      { kind: 'charge', range: 340, windup: 0.75, speed: 620, duration: 0.45, recover: 0.6, stun: 1.2, damage: 2 },
      { kind: 'volley', range: 9999, windup: 0.8, count: 5, spread: 1.0, speed: 210, recover: 0.6, damage: 1, projectile: 'feather' },
      { kind: 'slam', range: 120, windup: 0.95, radius: 100, recover: 1.1, damage: 2 },
    ],
  },
};

export const CONFIG = {
  tile: 32,
  view: { w: 960, h: 544 },
  step: 1 / 60,
  /** Limite do delta por quadro, para não "saltar" após trocar de aba. */
  maxFrame: 0.25,
  /** Amortecimento do recuo (knockback), por segundo. */
  damping: 12,
  hitstop: 0.06,
  victoryDelay: 1.2,
  defeatDelay: 1.4,
  /** Pausa entre limpar a sala e oferecer a recompensa. */
  rewardDelay: 0.8,
  maxParticles: 240,

  player: {
    maxHp: 5,
    radius: 10,
    speed: 210,
    /** Multiplicador de velocidade enquanto o golpe está ativo. */
    swingMoveFactor: 0.45,
    iframes: 1.0,
    hurtKnockback: 320,
    attack: {
      damage: 1,
      range: 46,
      arc: 2.2,
      windup: 0.05,
      active: 0.1,
      /** Tempo que o rastro do golpe continua visível após o dano. */
      trail: 0.08,
      cooldown: 0.34,
      /** Janela em que um clique antecipado ainda vira golpe. */
      buffer: 0.15,
      knockback: 300,
    },
    dodge: { speed: 560, duration: 0.18, cooldown: 0.55, buffer: 0.12 },
  },

  enemies: ENEMIES,

  /** Fase 2: phase2 do chefe abaixo desta fração de vida; preparações ficam mais curtas. */
  bossPhase2: 0.5,
  bossPhase2Speed: 1.25,

  run: {
    /** Composições possíveis por sala; a última sala é o chefe. */
    encounters: [
      [['penitent', 'penitent'], ['penitent', 'acolyte']],
      [['penitent', 'penitent', 'acolyte'], ['penitent', 'acolyte', 'acolyte']],
      [['brute', 'penitent'], ['brute', 'acolyte', 'penitent']],
      [['brute', 'acolyte', 'acolyte', 'penitent'], ['brute', 'brute', 'acolyte'], ['brute', 'penitent', 'penitent', 'acolyte']],
      [['angel']],
    ] as EnemyKind[][][],
    /** Cinzas (moeda permanente) ganhas na incursão. */
    ashesPerKill: 1,
    ashesPerRoom: 5,
    ashesVictory: 25,
  },

  /** Projéteis amigos da bênção "Lâmina Sagrada". */
  holyWave: { speed: 380, life: 0.45, radius: 9, damage: 1 },
  /** Bênção "Espinhos do Martírio": dano em volta ao sofrer dano. */
  thorns: { radius: 90, damage: 2 },
  /** Bênção "Sangue por Sangue": vida curada a cada N abates. */
  lifestealEvery: 3,
};
