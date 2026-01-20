export interface Insignia {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono?: string;
  puntos: number;
  criterios: {
    eventosCreadosRequeridos?: number;
    eventosUnidosRequeridos?: number;
    valoracionesRequeridas?: number;
    amigosRequeridos?: number;
    puntosRequeridos?: number;
  };
}

export interface UsuarioProgreso {
  _id: string;
  usuario: string;
  puntos: number;
  nivel: 'Novato' | 'Explorador' | 'Organizador' | 'Experto' | 'Leyenda';
  insignias: Insignia[];
  estadisticas: {
    eventosCreadosTotal: number;
    eventosUnidosTotal: number;
    valoracionesTotal: number;
    amigosTotal: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RankingUsuario {
  posicion: number;
  usuario: string;
  gmail: string;
  puntos: number;
  nivel: string;
  insignias: number;
}

export const NIVELES_CONFIG = [
  { nombre: 'Novato', puntosMin: 0, puntosMax: 99, color: '#9ca3af', emoji: '🌱' },
  { nombre: 'Explorador', puntosMin: 100, puntosMax: 299, color: '#60a5fa', emoji: '🗺️' },
  { nombre: 'Organizador', puntosMin: 300, puntosMax: 599, color: '#a78bfa', emoji: '🎯' },
  { nombre: 'Experto', puntosMin: 600, puntosMax: 999, color: '#f59e0b', emoji: '⭐' },
  { nombre: 'Leyenda', puntosMin: 1000, puntosMax: Infinity, color: '#ef4444', emoji: '🏆' }
];

export function getNivelInfo(nivel: string) {
  return NIVELES_CONFIG.find(n => n.nombre === nivel) || NIVELES_CONFIG[0];
}

export function calcularProgresoNivel(puntos: number): {
  nivelActual: typeof NIVELES_CONFIG[0];
  siguienteNivel: typeof NIVELES_CONFIG[0] | null;
  progreso: number;
  puntosRestantes: number;
} {
  const nivelActual = NIVELES_CONFIG.find(
    n => puntos >= n.puntosMin && puntos <= n.puntosMax
  ) || NIVELES_CONFIG[0];

  const indexActual = NIVELES_CONFIG.indexOf(nivelActual);
  const siguienteNivel = indexActual < NIVELES_CONFIG.length - 1 
    ? NIVELES_CONFIG[indexActual + 1] 
    : null;

  if (!siguienteNivel) {
    return {
      nivelActual,
      siguienteNivel: null,
      progreso: 100,
      puntosRestantes: 0
    };
  }

  const puntosEnNivel = puntos - nivelActual.puntosMin;
  const puntosNecesarios = siguienteNivel.puntosMin - nivelActual.puntosMin;
  const progreso = Math.min(100, Math.floor((puntosEnNivel / puntosNecesarios) * 100));
  const puntosRestantes = siguienteNivel.puntosMin - puntos;

  return {
    nivelActual,
    siguienteNivel,
    progreso,
    puntosRestantes
  };
}