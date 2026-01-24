import { Heat, LeaderboardEntry, Registration } from './types';

// Gerar baterias baseado no ranking atual
export const generateHeats = (
  leaderboard: LeaderboardEntry[],
  athletesPerHeat: number,
  categoryId: string,
  wodId: string,
  participantNames: Map<string, string>,
  // sortDirection determines "Better" logic.
  // 'desc' (default/CrossFit): Higher points = Better. We sort ASC [Low -> High] to put Best (High) in Last Heat.
  // 'asc' (Simple): Lower points = Better. We sort DESC [High -> Low] to put Best (Low) in Last Heat.
  sortDirection: 'asc' | 'desc' = 'desc'
): Heat[] => {
  const heats: Heat[] = [];

  // Se não há ranking (primeiro WOD), ordem alfabética
  let orderedParticipants = [...leaderboard];

  if (leaderboard.length === 0 || leaderboard.every(e => e.totalPoints === 0)) {
    // Primeiro WOD - ordem alfabética ou aleatória
    orderedParticipants.sort((a, b) => a.participantName.localeCompare(b.participantName));
  } else {
    // WODs seguintes - ordenar "Pior para Melhor" para que os Melhores fiquem na última bateria
    if (sortDirection === 'desc') {
      // High Points = Best. Sort Ascending (Low -> High)
      orderedParticipants.sort((a, b) => a.totalPoints - b.totalPoints);
    } else {
      // Low Points = Best. Sort Descending (High -> Low)
      orderedParticipants.sort((a, b) => b.totalPoints - a.totalPoints);
    }
  }

  const totalHeats = Math.ceil(orderedParticipants.length / athletesPerHeat);

  // Distribuir atletas nas baterias
  for (let i = 0; i < totalHeats; i++) {
    const startIndex = i * athletesPerHeat;
    const endIndex = Math.min(startIndex + athletesPerHeat, orderedParticipants.length);
    const heatParticipants = orderedParticipants.slice(startIndex, endIndex);

    heats.push({
      id: crypto.randomUUID(),
      categoryId,
      wodId,
      heatNumber: i + 1,
      participants: heatParticipants.map(p => ({
        id: p.participantId,
        name: p.participantName,
        position: p.position,
        totalPoints: p.totalPoints,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return heats;
};

// Gerar baterias para novos atletas (sem score)
export const generateHeatsForNewAthletes = (
  registrations: Registration[],
  athletesPerHeat: number,
  categoryId: string,
  wodId: string,
  participantNames: Map<string, string>
): Heat[] => {
  const heats: Heat[] = [];

  const participants = registrations
    .filter(r => r.categoryId === categoryId)
    .map(r => {
      const id = r.athleteId || r.teamId || '';
      return {
        id,
        name: participantNames.get(id) || 'Desconhecido',
        position: undefined,
        totalPoints: 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalHeats = Math.ceil(participants.length / athletesPerHeat);

  for (let i = 0; i < totalHeats; i++) {
    const startIndex = i * athletesPerHeat;
    const endIndex = Math.min(startIndex + athletesPerHeat, participants.length);
    const heatParticipants = participants.slice(startIndex, endIndex);

    heats.push({
      id: crypto.randomUUID(),
      categoryId,
      wodId,
      heatNumber: i + 1,
      participants: heatParticipants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return heats;
};

// Exportar para CSV
export const exportHeatsToCSV = (heats: Heat[], categoryName: string, wodName: string): string => {
  let csv = 'Bateria,Horário,Atleta/Time,Posição,Pontos\n';

  heats.forEach(heat => {
    const time = heat.scheduledTime || '-';
    heat.participants.forEach(p => {
      const position = p.position ? `${p.position}º` : 'N/A';
      const points = p.totalPoints !== undefined ? p.totalPoints : 'N/A';
      csv += `${heat.heatNumber},${time},${p.name},${position},${points}\n`;
    });
  });

  return csv;
};

// Download CSV
export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
