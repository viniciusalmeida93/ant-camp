import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Coffee } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleSettingsProps {
    championshipId: string;
    days: any[];
    onUpdate: () => void;
}

export function ScheduleSettings({ championshipId, days, onUpdate }: ScheduleSettingsProps) {
    const [selectedDayId, setSelectedDayId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Local state for the selected day's config
    const [dayConfig, setDayConfig] = useState({
        startTime: '',
        enableBreak: false,
        breakAfterWod: 1
    });

    const [originalDayConfig, setOriginalDayConfig] = useState({
        startTime: '',
        enableBreak: false,
        breakAfterWod: 1,
        breakDurationMinutes: 60
    });

    // Configuração de tempo em string (mm:ss)
    const [breakDurationStr, setBreakDurationStr] = useState("60:00");

    // Lista de WODs do dia selecionado
    const [availableWods, setAvailableWods] = useState<{ id: string, name: string, order_num: number }[]>([]);

    // Helper functions for time conversion
    const minutesToString = (minutes: number) => {
        if (isNaN(minutes)) return "00:00";
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const stringToMinutes = (str: string) => {
        if (!str) return 0;
        if (!str.includes(':')) return parseInt(str) || 0;
        const [mins, secs] = str.split(':').map(Number);
        return (mins || 0) + ((secs || 0) / 60);
    };

    const handleTimeInputChange = (value: string) => {
        // Remove non-numeric except :
        let clean = value.replace(/[^\d:]/g, '');

        // Auto-format MM:SS
        if (clean.length === 2 && !clean.includes(':') && value.length > breakDurationStr.length) {
            clean += ':';
        }

        setBreakDurationStr(clean);
    };

    // Initialize selected day
    useEffect(() => {
        if (days.length > 0 && !selectedDayId) {
            setSelectedDayId(days[0].id);
        }
    }, [days]);

    // Fetch Day Config and WODs when day changes
    useEffect(() => {
        const loadDayDetails = async () => {
            if (!selectedDayId) return;

            // 1. Load Config
            const day = days.find(d => d.id === selectedDayId);
            if (day) {
                const config = {
                    startTime: day.start_time || '08:00',
                    enableBreak: day.enable_break || false,
                    breakAfterWod: day.break_after_wod_number || 1
                };
                setDayConfig(config);
                const duration = day.break_duration_minutes || 60;
                setBreakDurationStr(minutesToString(duration));

                setOriginalDayConfig({
                    ...config,
                    breakDurationMinutes: duration
                });
            }

            // 2. Load WODs for this day
            const { data, error } = await supabase
                .from('championship_day_wods')
                .select(`
                    order_num,
                    wods (
                        id,
                        name
                    )
                `)
                .eq('championship_day_id', selectedDayId)
                .order('order_num');

            if (data) {
                const formatted = data.map((item: any) => ({
                    id: item.wods.id,
                    name: item.wods.name,
                    order_num: item.order_num
                }));
                setAvailableWods(formatted);
            }
        };

        loadDayDetails();
    }, [selectedDayId, days]);

    const [success, setSuccess] = useState(false);

    const handleSaveDayConfig = async () => {
        if (!selectedDayId) return;
        setLoading(true);

        try {
            const breakDuration = stringToMinutes(breakDurationStr);

            const { error } = await supabase
                .from('championship_days')
                .update({
                    start_time: dayConfig.startTime,
                    enable_break: dayConfig.enableBreak,
                    break_duration_minutes: breakDuration,
                    break_after_wod_number: dayConfig.breakAfterWod
                })
                .eq('id', selectedDayId);

            if (error) throw error;

            toast.success("Configurações do dia salvas!");
            onUpdate(); // Trigger refresh in parent

            // Update original config to match saved
            setOriginalDayConfig({
                startTime: dayConfig.startTime,
                enableBreak: dayConfig.enableBreak,
                breakAfterWod: dayConfig.breakAfterWod,
                breakDurationMinutes: breakDuration
            });
            setSuccess(true);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar configurações");
        } finally {
            setLoading(false);
        }
    };

    // Check if dirty
    const minutes = stringToMinutes(breakDurationStr);
    const isDirty =
        dayConfig.startTime !== originalDayConfig.startTime ||
        dayConfig.enableBreak !== originalDayConfig.enableBreak ||
        dayConfig.breakAfterWod !== originalDayConfig.breakAfterWod ||
        Math.abs(minutes - originalDayConfig.breakDurationMinutes) > 0.01;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <CardTitle>Configuração Diária</CardTitle>
                </div>
                <CardDescription>
                    Defina horário de início e pausas fixas para cada dia do evento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Day Selector */}
                <div className="flex gap-4 items-center">
                    <Label className="w-24">Selecionar Dia:</Label>
                    <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Selecione um dia" />
                        </SelectTrigger>
                        <SelectContent>
                            {days.map(day => (
                                <SelectItem key={day.id} value={day.id}>
                                    Dia {day.day_number} - {new Date(day.date).toLocaleDateString('pt-BR')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Start Time Config */}
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Início do Dia
                        </h4>
                        <div className="grid gap-2">
                            <Label>Horário da Primeira Bateria</Label>
                            <Input
                                type="time"
                                value={dayConfig.startTime}
                                onChange={(e) => setDayConfig(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Define quando começa a primeira bateria deste dia.
                            </p>
                        </div>
                    </div>

                    {/* Break Config */}
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Pausa</h4>
                            <Switch
                                id="enable-break"
                                checked={dayConfig.enableBreak}
                                onCheckedChange={(checked) => setDayConfig(prev => ({ ...prev, enableBreak: checked }))}
                            />
                        </div>

                        {dayConfig.enableBreak && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                <div className="grid gap-2">
                                    <Label>Duração</Label>
                                    <Input
                                        type="text"
                                        placeholder="00:00"
                                        maxLength={5}
                                        value={breakDurationStr}
                                        onChange={(e) => handleTimeInputChange(e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Após o Evento</Label>
                                    <Select
                                        value={dayConfig.breakAfterWod.toString()}
                                        onValueChange={(val) => setDayConfig(prev => ({ ...prev, breakAfterWod: parseInt(val) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o evento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableWods.map(wod => (
                                                <SelectItem key={wod.id} value={wod.order_num.toString()}>
                                                    Prova {wod.order_num} - {wod.name}
                                                </SelectItem>
                                            ))}
                                            {availableWods.length === 0 && (
                                                <SelectItem value="0" disabled>Nenhum evento neste dia</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        A pausa ocorrerá após o término de todas as baterias deste evento.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSaveDayConfig}
                        disabled={loading || !isDirty}
                        className={`text-white ${!isDirty ? "bg-[#D71C1D] hover:bg-[#D71C1D]/90 opacity-80" : "bg-[#D71C1D] hover:bg-[#D71C1D]/90"}`}
                    >
                        {loading ? "APLICANDO..." : !isDirty ? "APLICADO" : "APLICAR"}
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
