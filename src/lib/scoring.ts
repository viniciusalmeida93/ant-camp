import { WODResult, ScoringConfig, LeaderboardEntry } from './types';

// Preset CrossFit Games: pontuação padrão
export const CROSSFIT_GAMES_POINTS: { [position: number]: number } = {
  1: 100, 2: 97, 3: 94, 4: 91, 5: 88, 6: 85, 7: 82, 8: 79, 9: 76, 10: 73,
  11: 70, 12: 68, 13: 66, 14: 64, 15: 62, 16: 60, 17: 58, 18: 56, 19: 54, 20: 52,
  21: 50, 22: 48, 23: 46, 24: 44, 25: 42, 26: 40, 27: 38, 28: 36, 29: 34, 30: 32,
  31: 30, 32: 28, 33: 26, 34: 24, 35: 22, 36: 20, 37: 18, 38: 16, 39: 14, 40: 12,
};

// Preset Ordem Simples: 1º = 1 ponto, 2º = 2 pontos, etc. (menor pontuação ganha)
export const generateSimpleOrderPoints = (maxParticipants: number): { [position: number]: number } => {
  const points: { [position: number]: number } = {};
  for (let i = 1; i <= maxParticipants; i++) {
    points[i] = i;
  }
  return points;
};

// Função para gerar pontos decrescentes
export const generateDefaultPoints = (maxParticipants: number): { [position: number]: number } => {
  const points: { [position: number]: number } = {};
  for (let i = 1; i <= Math.min(maxParticipants, 40); i++) {
    points[i] = CROSSFIT_GAMES_POINTS[i] || Math.max(1, 40 - i);
  }
  return points;
};

// Função auxiliar para converter tempo MM:SS ou minutos:segundos para segundos
const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;

  const cleanTime = timeStr.toString().trim();

  // Formato MM:SS (ex: 5:30 = 5 minutos e 30 segundos)
  const match = cleanTime.match(/^(\d+):(\d{2})$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }

  // Tentar como número direto (segundos)
  const num = parseFloat(cleanTime);
  if (!isNaN(num)) return num;

  return 0;
};

// Comparar resultados de WOD (menor é melhor para tempo, maior para reps/carga)
export const compareResults = (a: WODResult, b: WODResult, wodType: string): number => {
  // DNS e DNF vão para o final
  if (a.status === 'dns' && b.status !== 'dns') return 1;
  if (a.status !== 'dns' && b.status === 'dns') return -1;
  if (a.status === 'dnf' && b.status !== 'dnf') return 1;
  if (a.status !== 'dnf' && b.status === 'dnf') return -1;

  if (!a.result || !b.result) return 0;

  const normalizedType = wodType ? wodType.toLowerCase().trim() : '';
  const resultLooksLikeTime = a.result.toString().includes(':') || b.result.toString().includes(':');

  // Para For Time: converter tempo para segundos e comparar (menor é melhor)
  // SE o tipo for explicitamente tempo OU se o resultado parecer tempo (contém :)
  if (
    normalizedType === 'for-time' ||
    normalizedType === 'for_time' ||
    normalizedType === 'tempo' ||
    normalizedType === 'time' ||
    (resultLooksLikeTime && normalizedType !== 'amrap' && normalizedType !== 'reps' && normalizedType !== 'carga' && normalizedType !== 'tonelagem')
  ) {
    const aSeconds = parseTimeToSeconds(a.result);
    const bSeconds = parseTimeToSeconds(b.result);

    // DEBUG: Se a diferença for pequena, garantir ordem correta
    if (aSeconds !== bSeconds) return aSeconds - bSeconds;

    // Tiebreak: reps completados (maior é melhor)
    if (a.tiebreakValue && b.tiebreakValue) {
      const aTiebreak = parseFloat(a.tiebreakValue);
      const bTiebreak = parseFloat(b.tiebreakValue);
      return bTiebreak - aTiebreak; // Maior reps é melhor no tiebreak
    }
    return 0;
  }

  // Para AMRAP: maior rounds/reps é melhor
  if (normalizedType === 'amrap' || normalizedType === 'emom') {
    const aValue = parseFloat(a.result);
    const bValue = parseFloat(b.result);
    if (bValue !== aValue) return bValue - aValue;
    // Tiebreak: tempo restante (maior é melhor, ou seja, mais tempo sobrou)
    if (a.tiebreakValue && b.tiebreakValue) {
      const aTiebreak = parseTimeToSeconds(a.tiebreakValue);
      const bTiebreak = parseTimeToSeconds(b.tiebreakValue);
      return bTiebreak - aTiebreak;
    }
    return 0;
  }

  // Para Tonelagem e Carga Máxima: maior peso é melhor
  if (normalizedType === 'tonelagem' || normalizedType === 'carga-maxima' || normalizedType === 'carga') {
    const aValue = parseFloat(a.result);
    const bValue = parseFloat(b.result);
    if (bValue !== aValue) return bValue - aValue;
    // Tiebreak: menor tempo é melhor
    if (a.tiebreakValue && b.tiebreakValue) {
      const aTiebreak = parseTimeToSeconds(a.tiebreakValue);
      const bTiebreak = parseTimeToSeconds(b.tiebreakValue);
      return aTiebreak - bTiebreak;
    }
    return 0;
  }

  // Fallback seguro: se parece tempo, usa parser de tempo
  if (resultLooksLikeTime) {
    const aSeconds = parseTimeToSeconds(a.result);
    const bSeconds = parseTimeToSeconds(b.result);
    if (aSeconds !== bSeconds) return aSeconds - bSeconds;
  }

  // Fallback numérico genérico (reps, carga simples)
  const aValue = parseFloat(a.result);
  const bValue = parseFloat(b.result);
  if (!isNaN(aValue) && !isNaN(bValue)) {
    if (bValue !== aValue) return bValue - aValue;
  }

  // Tiebreak geral
  if (a.tiebreakValue && b.tiebreakValue) {
    return parseFloat(a.tiebreakValue) - parseFloat(b.tiebreakValue);
  }

  return 0;
};

// Calcular pontos para um WOD específico
export const calculateWODPoints = (
  results: WODResult[],
  config: ScoringConfig,
  wodType: string
): WODResult[] => {
  // Ordenar resultados
  const sorted = [...results].sort((a, b) => compareResults(a, b, wodType));

  // Atribuir posições e pontos com suporte a empates
  // Se dois resultados têm o mesmo valor, ficam na mesma posição
  // Mas próxima posição diferente é sequencial (não pula números)
  let currentPosition = 1;

  return sorted.map((result, index) => {
    // Verificar se é empate usando a função compareResults
    // Se compareResults retorna 0, os resultados são iguais
    const isTie = index > 0 &&
      result.status === 'completed' &&
      sorted[index - 1].status === 'completed' &&
      compareResults(result, sorted[index - 1], wodType) === 0;

    // Se não é empate, atualizar posição
    if (!isTie) {
      if (config.rankingMethod === 'standard') {
        // Método Standard (Crossfit/Olímpico): 1, 1, 3 (pula posições)
        currentPosition = index + 1;
      } else {
        // Método Simple (Sequencial): 1, 1, 2 (não pula posições) - Comportamento padrão anterior
        if (index > 0) currentPosition++;
      }
    }

    let position = currentPosition;
    let points = 0;

    if (result.status === 'dns') {
      points = config.dnsPoints || 0;
      position = results.length;
    } else if (result.status === 'dnf') {
      points = config.dnfPoints || 0;
      position = results.length;
    } else {
      // Verificar se pointsTable existe e tem a posição
      if (config.pointsTable && typeof config.pointsTable === 'object') {
        points = config.pointsTable[position] || 1;
      } else {
        // Fallback: pontos decrescentes simples
        points = Math.max(1, 100 - (position - 1) * 3);
      }
    }

    return {
      ...result,
      position,
      points,
    };
  });
};

// Função auxiliar para comparar dois atletas com desempate completo
export const compareLeaderboardEntries = (
  a: { totalPoints: number; wodResults: WODResult[]; orderIndex?: number | null },
  b: { totalPoints: number; wodResults: WODResult[]; orderIndex?: number | null },
  sortDirection: 'asc' | 'desc' = 'asc' // asc = menor melhor (Simple), desc = maior melhor (CrossFit)
): number => {
  // Se um tem 0 e outro não, quem tem 0 vai para o final
  if (a.totalPoints === 0 && b.totalPoints > 0) return 1;
  if (a.totalPoints > 0 && b.totalPoints === 0) return -1;

  // Se ambos têm 0 pontos (sem resultados), ordenar por order_index
  if (a.totalPoints === 0 && b.totalPoints === 0) {
    if (a.orderIndex !== null && a.orderIndex !== undefined &&
      b.orderIndex !== null && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
    if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;
    return 0;
  }

  // 1. Pontos
  if (a.totalPoints !== b.totalPoints) {
    return sortDirection === 'asc'
      ? a.totalPoints - b.totalPoints
      : b.totalPoints - a.totalPoints;
  }

  // 2. Desempate por número de colocações (1º, 2º, 3º, 4º, etc.)
  // Encontrar a maior posição possível entre todos os resultados
  const aPositions = a.wodResults.map(r => r.position || 0).filter(p => p > 0);
  const bPositions = b.wodResults.map(r => r.position || 0).filter(p => p > 0);
  const maxPosition = Math.max(
    ...(aPositions.length > 0 ? aPositions : [0]),
    ...(bPositions.length > 0 ? bPositions : [0]),
    0
  );

  // Comparar sequencialmente cada posição (1º, 2º, 3º, 4º, ...)
  for (let position = 1; position <= maxPosition; position++) {
    const aCount = a.wodResults.filter(r => r.position === position).length;
    const bCount = b.wodResults.filter(r => r.position === position).length;

    if (aCount !== bCount) {
      // Maior quantidade dessa posição é melhor
      return bCount - aCount;
    }
  }

  // 3. Se ainda empatar, usar order_index como desempate final
  if (a.orderIndex !== null && a.orderIndex !== undefined &&
    b.orderIndex !== null && b.orderIndex !== undefined) {
    return a.orderIndex - b.orderIndex;
  }

  // Se apenas um tem order_index, ele vem primeiro
  if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
  if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;

  // Fallback: comparar por ID dos participantes
  const aId = (a as any).participantId || (a as any).registrationId || '';
  const bId = (b as any).participantId || (b as any).registrationId || '';
  return aId.localeCompare(bId);
};

// Calcular leaderboard de uma categoria
export const calculateLeaderboard = (
  allResults: WODResult[],
  categoryId: string,
  participantNames: Map<string, string>,
  presetType: string = 'crossfit-games'
): LeaderboardEntry[] => {
  // Determine sort direction based on preset
  // CrossFit Games = Higher points win (DESC)
  // Simple Order = Lower points win (ASC)
  const sortDirection = presetType === 'simple-order' ? 'asc' : 'desc';

  // Agrupar resultados por participante
  const participantMap = new Map<string, WODResult[]>();

  allResults
    .filter(r => r.categoryId === categoryId)
    .forEach(result => {
      // Usar registrationId se disponível, senão usar athleteId ou teamId
      const participantId = (result as any).registrationId || result.athleteId || result.teamId || '';
      if (participantId && !participantMap.has(participantId)) {
        participantMap.set(participantId, []);
      }
      if (participantId) {
        participantMap.get(participantId)!.push(result);
      }
    });

  // Criar entradas do leaderboard
  const entries: LeaderboardEntry[] = [];

  participantMap.forEach((wodResults, participantId) => {
    const totalPoints = wodResults.reduce((sum, r) => sum + (r.points || 0), 0);
    const firstPlaces = wodResults.filter(r => r.position === 1).length;
    const secondPlaces = wodResults.filter(r => r.position === 2).length;
    const thirdPlaces = wodResults.filter(r => r.position === 3).length;
    const lastWodPosition = wodResults.length > 0
      ? wodResults[wodResults.length - 1].position
      : undefined;

    entries.push({
      participantId,
      participantName: participantNames.get(participantId) || 'Desconhecido',
      categoryId,
      totalPoints,
      position: 0, // será calculado depois
      firstPlaces,
      secondPlaces,
      thirdPlaces,
      lastWodPosition,
      wodResults: wodResults.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
    });
  });

  // Ordenar usando a função de comparação completa
  entries.sort((a, b) => compareLeaderboardEntries(a, b, sortDirection));

  // Atribuir posições finais (sem empates - cada um tem posição única)
  entries.forEach((entry, index) => {
    entry.position = index + 1;
  });

  return entries;
};
