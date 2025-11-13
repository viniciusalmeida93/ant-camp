import { WODResult, ScoringConfig, LeaderboardEntry, WOD } from './types';

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
  
  // Formato MM:SS (ex: 5:30 = 5 minutos e 30 segundos)
  const match = timeStr.match(/^(\d+):(\d{2})$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }
  
  // Tentar como número direto (segundos)
  const num = parseFloat(timeStr);
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
  
  // Para For Time: converter tempo para segundos e comparar (menor é melhor)
  if (wodType === 'for-time' || wodType === 'tempo') {
    const aSeconds = parseTimeToSeconds(a.result);
    const bSeconds = parseTimeToSeconds(b.result);
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
  if (wodType === 'amrap' || wodType === 'emom') {
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
  if (wodType === 'tonelagem' || wodType === 'carga-maxima' || wodType === 'carga') {
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
  
  // Para reps (legado): maior é melhor
  if (wodType === 'reps') {
    const aValue = parseFloat(a.result);
    const bValue = parseFloat(b.result);
    if (bValue !== aValue) return bValue - aValue;
    // Tiebreak (menor tempo é melhor)
    if (a.tiebreakValue && b.tiebreakValue) {
      return parseFloat(a.tiebreakValue) - parseFloat(b.tiebreakValue);
    }
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
  
  // Atribuir posições e pontos
  return sorted.map((result, index) => {
    let position = index + 1;
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

// Calcular leaderboard de uma categoria
export const calculateLeaderboard = (
  allResults: WODResult[],
  categoryId: string,
  participantNames: Map<string, string>,
  presetType?: string
): LeaderboardEntry[] => {
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
  
  // Ordenar e atribuir posições
  // Para "simple-order", menor pontuação ganha (ordem crescente)
  // Para outros sistemas, maior pontuação ganha (ordem decrescente)
  const isSimpleOrder = presetType === 'simple-order';
  
  entries.sort((a, b) => {
    // 1. Pontos (invertido para simple-order)
    if (b.totalPoints !== a.totalPoints) {
      return isSimpleOrder ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints;
    }
    
    // 2. Mais primeiros lugares (sempre melhor ter mais)
    if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
    
    // 3. Mais segundos lugares (sempre melhor ter mais)
    if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces;
    
    // 4. Mais terceiros lugares (sempre melhor ter mais)
    if (b.thirdPlaces !== a.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;
    
    // 5. Melhor posição no último WOD (menor posição é melhor)
    if (a.lastWodPosition && b.lastWodPosition) {
      return a.lastWodPosition - b.lastWodPosition;
    }
    
    return 0;
  });
  
  // Atribuir posições finais
  entries.forEach((entry, index) => {
    entry.position = index + 1;
  });
  
  return entries;
};
