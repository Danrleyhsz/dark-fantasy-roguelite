// Bênçãos da incursão (GDD: devem mudar a estratégia, não só números) e melhorias permanentes.

export type UpgradeId = 'vigor' | 'reach' | 'swift' | 'shadowStep' | 'lifesteal' | 'thorns' | 'holyWave' | 'deflect';

export interface UpgradeDef {
  name: string;
  text: string;
  /** Índice do ícone na folha de ícones. */
  icon: number;
  /** Pode ser escolhida mais de uma vez. */
  stack?: boolean;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  vigor: { name: 'Coração de Espinhos', text: '+2 de vida máxima e cura 2.', icon: 0, stack: true },
  reach: { name: 'Lâmina Longa', text: 'O golpe alcança 35% mais longe: lute à distância segura.', icon: 1 },
  swift: { name: 'Fúria Penitente', text: 'Golpes 30% mais rápidos: pressione sem parar.', icon: 2 },
  shadowStep: { name: 'Passo Sombrio', text: 'A esquiva atravessa inimigos e fere cada um (1 de dano).', icon: 3 },
  lifesteal: { name: 'Cálice de Sangue', text: 'Cura 1 de vida a cada 3 inimigos derrotados.', icon: 4 },
  thorns: { name: 'Coroa de Espinhos', text: 'Ao sofrer dano, fere os inimigos ao redor (2 de dano).', icon: 5 },
  holyWave: { name: 'Lâmina Sagrada', text: 'Cada golpe lança uma onda de luz que fere à distância.', icon: 6 },
  deflect: { name: 'Auréola Partida', text: 'Golpear projéteis os devolve contra os inimigos.', icon: 7 },
};

export type MetaId = 'vigor' | 'edge' | 'breath';
export type MetaLevels = Record<MetaId, number>;

export interface MetaDef {
  name: string;
  text: string;
  /** Custo em cinzas de cada nível; o tamanho da lista é o nível máximo. */
  costs: number[];
  /** Efeito por nível (vida extra ou fração de recarga reduzida). */
  perLevel: number;
}

// Progressão permanente modesta (GDD: ajudar sem tornar o desafio irrelevante).
export const META: Record<MetaId, MetaDef> = {
  vigor: { name: 'Fé Inabalável', text: '+1 de vida máxima por nível.', costs: [20, 40, 70], perLevel: 1 },
  edge: { name: 'Fio Abençoado', text: 'Golpes 6% mais rápidos por nível.', costs: [25, 50, 80], perLevel: 0.06 },
  breath: { name: 'Fôlego do Peregrino', text: 'Esquiva recarrega 10% mais rápido por nível.', costs: [15, 30, 60], perLevel: 0.1 },
};

export const NO_META: MetaLevels = { vigor: 0, edge: 0, breath: 0 };
