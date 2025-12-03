import { useState, useEffect } from 'react';
import { Users, Loader2, GripVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface HeatEntry {
  id: string;
  heat_id: string;
  athlete_id?: string;
  team_id?: string;
  lane_number: number;
  participant_name?: string;
}

interface Heat {
  id: string;
  heat_number: number;
  category_id: string;
  category_name: string;
  wod_id: string;
  wod_name: string;
  scheduled_time: string | null;
  athletes_per_heat: number;
  entries: HeatEntry[];
}

function SortableHeatEntry({ entry, heatId }: { entry: HeatEntry; heatId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `heat-${heatId}-entry-${entry.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-sm border border-border bg-card hover:bg-muted/50 transition-all"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-xs font-mono text-muted-foreground w-6">
        {entry.lane_number}
      </span>
      <span className="flex-1 text-sm font-medium truncate">
        {entry.participant_name || 'Sem nome'}
      </span>
    </div>
  );
}

function DroppableHeat({ heat, entries }: { heat: Heat; entries: HeatEntry[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `heat-drop-${heat.id}`,
  });

  const sortableEntries = entries.map(e => `heat-${heat.id}-entry-${e.id}`);

  return (
    <Card
      ref={setNodeRef}
      className={`p-4 min-h-[200px] transition-all ${
        isOver ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            #{heat.heat_number}
          </Badge>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{heat.category_name}</span>
            <span className="text-xs text-muted-foreground">{heat.wod_name}</span>
          </div>
        </div>
        {heat.scheduled_time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {entries.length} / {heat.athletes_per_heat} atletas
      </div>
      <SortableContext items={sortableEntries} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 min-h-[100px]">
          {entries.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed rounded-sm">
              Arraste atletas aqui
            </div>
          ) : (
            entries
              .sort((a, b) => a.lane_number - b.lane_number)
              .map((entry) => (
                <SortableHeatEntry key={entry.id} entry={entry} heatId={heat.id} />
              ))
          )}
        </div>
      </SortableContext>
    </Card>
  );
}

export default function GlobalHeats() {
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heats, setHeats] = useState<Heat[]>([]);
  const [heatEntriesMap, setHeatEntriesMap] = useState<Map<string, HeatEntry[]>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (selectedChampionship) {
      loadAllHeats();
    }
  }, [selectedChampionship]);

  const loadAllHeats = async () => {
    if (!selectedChampionship) return;

    setLoading(true);
    try {
      // Buscar todas as baterias do campeonato
      const { data: heatsData, error: heatsError } = await supabase
        .from('heats')
        .select('id, heat_number, category_id, wod_id, scheduled_time, athletes_per_heat')
        .eq('championship_id', selectedChampionship.id)
        .order('heat_number', { ascending: true });

      if (heatsError) throw heatsError;

      // Buscar categorias e WODs separadamente
      const categoryIds = [...new Set((heatsData || []).map(h => h.category_id))];
      const wodIds = [...new Set((heatsData || []).map(h => h.wod_id))];

      const [categoriesResult, wodsResult] = await Promise.all([
        supabase.from('categories').select('id, name').in('id', categoryIds),
        supabase.from('wods').select('id, name').in('id', wodIds),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (wodsResult.error) throw wodsResult.error;

      const categoriesMap = new Map((categoriesResult.data || []).map(c => [c.id, c.name]));
      const wodsMap = new Map((wodsResult.data || []).map(w => [w.id, w.name]));

      // Buscar todas as entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('heat_entries')
        .select('id, heat_id, athlete_id, team_id, lane_number')
        .in('heat_id', heatsData?.map(h => h.id) || []);

      if (entriesError) throw entriesError;

      // Buscar athletes e teams separadamente
      const athleteIds = [...new Set((entriesData || []).map(e => e.athlete_id).filter(Boolean))];
      const teamIds = [...new Set((entriesData || []).map(e => e.team_id).filter(Boolean))];

      const [athletesResult, teamsResult] = await Promise.all([
        athleteIds.length > 0
          ? supabase.from('athletes').select('id, name').in('id', athleteIds)
          : Promise.resolve({ data: [], error: null }),
        teamIds.length > 0
          ? supabase.from('teams').select('id, name').in('id', teamIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (athletesResult.error) throw athletesResult.error;
      if (teamsResult.error) throw teamsResult.error;

      const athletesMap = new Map((athletesResult.data || []).map(a => [a.id, a.name]));
      const teamsMap = new Map((teamsResult.data || []).map(t => [t.id, t.name]));

      // Processar dados
      const processedHeats: Heat[] = (heatsData || []).map(heat => ({
        id: heat.id,
        heat_number: heat.heat_number,
        category_id: heat.category_id,
        category_name: categoriesMap.get(heat.category_id) || 'Sem categoria',
        wod_id: heat.wod_id,
        wod_name: wodsMap.get(heat.wod_id) || 'Sem WOD',
        scheduled_time: heat.scheduled_time,
        athletes_per_heat: heat.athletes_per_heat,
        entries: [],
      }));

      // Agrupar entries por heat_id
      const entriesMap = new Map<string, HeatEntry[]>();
      (entriesData || []).forEach((entry: any) => {
        const participantName = entry.athlete_id
          ? athletesMap.get(entry.athlete_id) || 'Sem nome'
          : entry.team_id
          ? teamsMap.get(entry.team_id) || 'Sem nome'
          : 'Sem nome';

        const heatEntry: HeatEntry = {
          id: entry.id,
          heat_id: entry.heat_id,
          athlete_id: entry.athlete_id,
          team_id: entry.team_id,
          lane_number: entry.lane_number,
          participant_name: participantName,
        };

        if (!entriesMap.has(entry.heat_id)) {
          entriesMap.set(entry.heat_id, []);
        }
        entriesMap.get(entry.heat_id)!.push(heatEntry);
      });

      setHeats(processedHeats);
      setHeatEntriesMap(entriesMap);
    } catch (error: any) {
      console.error('Error loading heats:', error);
      toast.error('Erro ao carregar baterias');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Formato: "heat-{heatId}-entry-{entryId}"
    const activeMatch = activeIdStr.match(/^heat-(.+?)-entry-(.+)$/);
    if (!activeMatch) {
      setActiveId(null);
      return;
    }

    const [, activeHeatId, activeEntryId] = activeMatch;
    const activeEntry = heatEntriesMap.get(activeHeatId)?.find(e => e.id === activeEntryId);
    if (!activeEntry) {
      setActiveId(null);
      return;
    }

    const newEntriesMap = new Map(heatEntriesMap);

    // Verificar se está sendo movido para outra bateria ou reordenado na mesma
    if (overIdStr.startsWith('heat-drop-')) {
      // Movendo para uma bateria (pode ser diferente)
      const targetHeatId = overIdStr.replace('heat-drop-', '');
      const targetHeat = heats.find(h => h.id === targetHeatId);
      
      if (!targetHeat) {
        setActiveId(null);
        return;
      }

      // Verificar se a bateria de destino tem espaço
      const targetEntries = newEntriesMap.get(targetHeatId) || [];
      if (targetEntries.length >= targetHeat.athletes_per_heat) {
        toast.error('Bateria cheia!');
        setActiveId(null);
        return;
      }

      // Remover da bateria original
      const sourceEntries = newEntriesMap.get(activeHeatId) || [];
      const updatedSourceEntries = sourceEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedSourceEntries);

      // Adicionar à bateria de destino
      const newLaneNumber = targetEntries.length + 1;
      const updatedTargetEntries = [
        ...targetEntries,
        {
          ...activeEntry,
          heat_id: targetHeatId,
          lane_number: newLaneNumber,
        },
      ];
      newEntriesMap.set(targetHeatId, updatedTargetEntries);

      // Reordenar lane_numbers da bateria original
      const reorderedSourceEntries = updatedSourceEntries.map((entry, index) => ({
        ...entry,
        lane_number: index + 1,
      }));
      newEntriesMap.set(activeHeatId, reorderedSourceEntries);

      setHeatEntriesMap(newEntriesMap);
      await saveHeatEntry(activeEntryId, targetHeatId, newLaneNumber, reorderedSourceEntries);
    } else if (overIdStr.match(/^heat-(.+?)-entry-(.+)$/)) {
      // Reordenando dentro da mesma bateria ou movendo para outra posição
      const overMatch = overIdStr.match(/^heat-(.+?)-entry-(.+)$/);
      if (!overMatch) {
        setActiveId(null);
        return;
      }

      const [, overHeatId, overEntryId] = overMatch;
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];
      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];

      // Remover da bateria original
      const updatedActiveHeat = activeHeatEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedActiveHeat);

      // Encontrar índice de destino
      const overIndex = overHeatEntries.findIndex(e => e.id === overEntryId);

      if (activeHeatId === overHeatId) {
        // Mesma bateria - reordenar
        const activeIndex = activeHeatEntries.findIndex(e => e.id === activeEntryId);
        const reorderedEntries = arrayMove(activeHeatEntries, activeIndex, overIndex);
        const reorderedWithLanes = reorderedEntries.map((entry, index) => ({
          ...entry,
          lane_number: index + 1,
        }));
        newEntriesMap.set(activeHeatId, reorderedWithLanes);
        setHeatEntriesMap(newEntriesMap);
        await saveLaneNumbers(activeHeatId, reorderedWithLanes);
      } else {
        // Bateria diferente - mover
        const targetHeat = heats.find(h => h.id === overHeatId);
        if (!targetHeat) {
          setActiveId(null);
          return;
        }

        const targetEntries = newEntriesMap.get(overHeatId) || [];
        if (targetEntries.length >= targetHeat.athletes_per_heat) {
          toast.error('Bateria cheia!');
          setActiveId(null);
          return;
        }

        const updatedOverHeat = [...overHeatEntries];
        updatedOverHeat.splice(overIndex, 0, {
          ...activeEntry,
          heat_id: overHeatId,
          lane_number: overIndex + 1,
        });

        // Reordenar lane_numbers
        const reorderedOverHeat = updatedOverHeat.map((entry, index) => ({
          ...entry,
          lane_number: index + 1,
        }));

        // Reordenar lane_numbers da bateria original
        const reorderedActiveHeat = updatedActiveHeat.map((entry, index) => ({
          ...entry,
          lane_number: index + 1,
        }));

        newEntriesMap.set(overHeatId, reorderedOverHeat);
        newEntriesMap.set(activeHeatId, reorderedActiveHeat);
        setHeatEntriesMap(newEntriesMap);
        await saveHeatEntry(activeEntryId, overHeatId, overIndex + 1, reorderedActiveHeat);
        await saveLaneNumbers(overHeatId, reorderedOverHeat);
      }
    }

    setActiveId(null);
  };

  const saveHeatEntry = async (
    entryId: string,
    newHeatId: string,
    newLaneNumber: number,
    sourceEntries: HeatEntry[]
  ) => {
    setSaving(true);
    try {
      // Atualizar entry
      const { error: updateError } = await supabase
        .from('heat_entries')
        .update({
          heat_id: newHeatId,
          lane_number: newLaneNumber,
        })
        .eq('id', entryId);

      if (updateError) throw updateError;

      // Atualizar lane_numbers da bateria original
      if (sourceEntries.length > 0) {
        for (const entry of sourceEntries) {
          await supabase
            .from('heat_entries')
            .update({ lane_number: entry.lane_number })
            .eq('id', entry.id);
        }
      }

      toast.success('Bateria atualizada!');
    } catch (error: any) {
      console.error('Error saving heat entry:', error);
      toast.error('Erro ao salvar alterações');
      await loadAllHeats(); // Recarregar em caso de erro
    } finally {
      setSaving(false);
    }
  };

  const saveLaneNumbers = async (heatId: string, entries: HeatEntry[]) => {
    try {
      for (const entry of entries) {
        await supabase
          .from('heat_entries')
          .update({ lane_number: entry.lane_number })
          .eq('id', entry.id);
      }
    } catch (error: any) {
      console.error('Error saving lane numbers:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Agrupar baterias por categoria e WOD
  const groupedHeats = new Map<string, Heat[]>();
  heats.forEach(heat => {
    const key = `${heat.category_id}-${heat.wod_id}`;
    if (!groupedHeats.has(key)) {
      groupedHeats.set(key, []);
    }
    groupedHeats.get(key)!.push(heat);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visualização Global de Baterias</h1>
          <p className="text-muted-foreground mt-2">
            Arraste e solte atletas entre baterias de diferentes categorias
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Salvando...</span>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
          {Array.from(groupedHeats.entries()).map(([key, groupHeats]) => {
            const firstHeat = groupHeats[0];
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">{firstHeat.category_name}</h2>
                  <span className="text-sm text-muted-foreground">-</span>
                  <span className="text-sm text-muted-foreground">{firstHeat.wod_name}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupHeats
                    .sort((a, b) => a.heat_number - b.heat_number)
                    .map((heat) => (
                      <DroppableHeat
                        key={heat.id}
                        heat={heat}
                        entries={heatEntriesMap.get(heat.id) || []}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>

      {heats.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma bateria encontrada. Gere baterias na página de Baterias primeiro.
          </p>
        </Card>
      )}
    </div>
  );
}

