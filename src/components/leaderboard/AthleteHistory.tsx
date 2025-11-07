import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeaderboardEntry, WOD } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface AthleteHistoryProps {
  entry: LeaderboardEntry | null;
  wods: WOD[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AthleteHistory = ({ entry, wods, open, onOpenChange }: AthleteHistoryProps) => {
  if (!entry) return null;

  const getWODName = (wodId: string) => {
    return wods.find(w => w.id === wodId)?.name || 'WOD';
  };

  const getPositionBadge = (position?: number) => {
    if (!position) return null;
    
    if (position === 1) {
      return <span className="px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold">🥇 1º</span>;
    }
    if (position === 2) {
      return <span className="px-2 py-1 rounded-full bg-muted text-foreground text-xs font-bold">🥈 2º</span>;
    }
    if (position === 3) {
      return <span className="px-2 py-1 rounded-full bg-muted text-foreground text-xs font-bold">🥉 3º</span>;
    }
    return <span className="text-muted-foreground text-sm">{position}º</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Histórico - {entry.participantName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{entry.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Pontos Totais</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{entry.position}º</p>
              <p className="text-xs text-muted-foreground">Posição Atual</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{entry.firstPlaces}</p>
              <p className="text-xs text-muted-foreground">Primeiros Lugares</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Resultados por WOD</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WOD</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.wodResults.map((result, index) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-semibold">
                      {getWODName(result.wodId)}
                    </TableCell>
                    <TableCell>
                      {result.status === 'completed' 
                        ? result.result 
                        : result.status.toUpperCase()}
                    </TableCell>
                    <TableCell>{getPositionBadge(result.position)}</TableCell>
                    <TableCell className="font-bold text-primary">
                      {result.points} pts
                    </TableCell>
                    <TableCell>
                      {result.status === 'completed' && (
                        <span className="text-xs text-green-500">✓ Completo</span>
                      )}
                      {result.status === 'dnf' && (
                        <span className="text-xs text-destructive">DNF</span>
                      )}
                      {result.status === 'dns' && (
                        <span className="text-xs text-muted-foreground">DNS</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
