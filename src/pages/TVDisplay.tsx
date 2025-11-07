import { useState, useEffect } from 'react';
import { Trophy, Clock, Users } from 'lucide-react';
import { 
  getCategories, 
  getWODs,
  getAthletes, 
  getTeams,
  getWODResults,
  getHeats
} from '@/lib/storage';
import { Category, WOD, Heat, LeaderboardEntry } from '@/lib/types';
import { calculateLeaderboard } from '@/lib/scoring';
import { Badge } from '@/components/ui/badge';

export default function TVDisplay() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wods, setWODs] = useState<WOD[]>([]);
  const [heats, setHeats] = useState<Heat[]>([]);
  const [leaderboards, setLeaderboards] = useState<Map<string, LeaderboardEntry[]>>(new Map());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(() => {
      loadData();
      setCurrentTime(new Date());
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const cats = getCategories();
    const wodsList = getWODs();
    const heatsList = getHeats();
    const results = getWODResults();
    const athletes = getAthletes();
    const teams = getTeams();
    
    setCategories(cats);
    setWODs(wodsList);
    setHeats(heatsList);
    
    // Calcular leaderboards para todas as categorias
    const participantNames = new Map<string, string>();
    athletes.forEach(a => participantNames.set(a.id, a.name));
    teams.forEach(t => participantNames.set(t.id, t.name));
    
    const leaderboardMap = new Map<string, LeaderboardEntry[]>();
    cats.forEach(cat => {
      const entries = calculateLeaderboard(results, cat.id, participantNames);
      leaderboardMap.set(cat.id, entries);
    });
    
    setLeaderboards(leaderboardMap);
  };

  const getUpcomingHeats = () => {
    const now = currentTime;
    const upcomingHeats: (Heat & { categoryName: string; wodName: string })[] = [];
    
    heats.forEach(heat => {
      if (heat.scheduledTime) {
        const [hours, minutes] = heat.scheduledTime.split(':');
        const heatTime = new Date();
        heatTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Próximas 2 horas
        if (heatTime > now && heatTime.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
          const category = categories.find(c => c.id === heat.categoryId);
          const wod = wods.find(w => w.id === heat.wodId);
          
          upcomingHeats.push({
            ...heat,
            categoryName: category?.name || 'Categoria',
            wodName: wod?.name || 'WOD',
          });
        }
      }
    });
    
    return upcomingHeats.sort((a, b) => {
      if (!a.scheduledTime || !b.scheduledTime) return 0;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    }).slice(0, 5);
  };

  const upcomingHeats = getUpcomingHeats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-12 h-12 text-primary" />
            <h1 className="text-6xl font-bold">CrossFit Competition</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboards */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Leaderboard Ao Vivo
            </h2>
            
            {categories.slice(0, 2).map(category => {
              const entries = leaderboards.get(category.id) || [];
              const topEntries = entries.slice(0, 10);
              
              return (
                <div key={category.id} className="bg-card rounded-2xl p-6 shadow-card animate-slide-up">
                  <h3 className="text-2xl font-bold mb-4">{category.name}</h3>
                  
                  <div className="space-y-2">
                    {topEntries.map((entry, index) => (
                      <div
                        key={entry.participantId}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          index === 0 
                            ? 'bg-primary/20 border-2 border-primary' 
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className={`font-bold text-xl w-8 ${
                            index === 0 ? 'text-primary text-2xl' : ''
                          }`}>
                            {entry.position}º
                          </span>
                          <span className={`font-semibold ${
                            index === 0 ? 'text-xl' : 'text-lg'
                          }`}>
                            {entry.participantName}
                          </span>
                          {index === 0 && (
                            <Badge className="ml-2">LÍDER</Badge>
                          )}
                        </div>
                        <span className={`font-bold ${
                          index === 0 ? 'text-2xl text-primary' : 'text-xl'
                        }`}>
                          {entry.totalPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Próximas Baterias */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-8 h-8 text-primary" />
              Próximas Baterias
            </h2>
            
            {upcomingHeats.length > 0 ? (
              <div className="space-y-4">
                {upcomingHeats.map(heat => (
                  <div key={heat.id} className="bg-card rounded-2xl p-6 shadow-card animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Badge variant="default" className="text-lg px-4 py-2 mb-2">
                          Bateria {heat.heatNumber}
                        </Badge>
                        <h3 className="text-xl font-bold">{heat.wodName}</h3>
                        <p className="text-sm text-muted-foreground">{heat.categoryName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">
                          {heat.scheduledTime}
                        </div>
                        <p className="text-xs text-muted-foreground">Horário</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{heat.participants.length} atletas/times</span>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {heat.participants.slice(0, 8).map(p => (
                        <span key={p.id} className="text-xs px-2 py-1 rounded bg-muted">
                          {p.name}
                        </span>
                      ))}
                      {heat.participants.length > 8 && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                          +{heat.participants.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-12 text-center shadow-card">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Nenhuma bateria programada nas próximas horas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>Atualizado automaticamente a cada 10 segundos</p>
        </div>
      </div>
    </div>
  );
}
