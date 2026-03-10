import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface Championship {
    id: string;
    name: string;
    date: string;
    is_published: boolean;
    organizer: {
        name: string | null;
        email: string | null;
    } | null;
}

export default function SuperAdminChampionships() {
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<Championship[]>([]);

    // Filters state
    const [searchName, setSearchName] = useState("");
    const [searchOrganizer, setSearchOrganizer] = useState("");
    const [searchDate, setSearchDate] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('championships')
                .select(`
            id,
            name,
            date,
            is_published,
            organizer_id
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error loading championships", error);
                toast.error("Erro ao carregar campeonatos");
                return;
            }

            const ownerIds = Array.from(new Set(data.map(c => c.organizer_id)));
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', ownerIds);

            const profileMap = new Map();
            profiles?.forEach(p => profileMap.set(p.id, p));

            const formatted = data.map(c => ({
                id: c.id,
                name: c.name,
                date: c.date,
                is_published: c.is_published,
                organizer: {
                    name: profileMap.get(c.organizer_id)?.full_name || 'N/A',
                    email: null
                }
            }));

            setChampionships(formatted);

        } finally {
            setLoading(false);
        }
    };

    const filteredChampionships = useMemo(() => {
        return championships.filter(camp => {
            const matchName = camp.name?.toLowerCase().includes(searchName.toLowerCase()) ?? false;
            const matchOrganizer = camp.organizer?.name?.toLowerCase().includes(searchOrganizer.toLowerCase()) ?? false;

            // Allow basic match on YYYY-MM-DD or partial combinations
            const matchDate = searchDate === "" || (camp.date && camp.date.includes(searchDate));

            return matchName && matchOrganizer && matchDate;
        });
    }, [championships, searchName, searchOrganizer, searchDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Campeonatos</h1>
                <p className="text-sm text-muted-foreground">
                    Gestão de todos os eventos da plataforma.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por nome do campeonato..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por nome do organizador..."
                                value={searchOrganizer}
                                onChange={(e) => setSearchOrganizer(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                type="date"
                                value={searchDate}
                                onChange={(e) => setSearchDate(e.target.value)}
                                className="text-muted-foreground"
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Todos os Campeonatos</CardTitle>
                    <CardDescription>
                        Lista completa de eventos ({filteredChampionships.length})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredChampionships.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum campeonato encontrado
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Evento</TableHead>
                                        <TableHead>Organizador</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredChampionships.map((camp) => (
                                        <TableRow key={camp.id}>
                                            <TableCell className="font-medium">
                                                {camp.name}
                                            </TableCell>
                                            <TableCell>{camp.organizer?.name}</TableCell>
                                            <TableCell>
                                                {camp.date ? format(new Date(camp.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant={camp.is_published ? 'default' : 'secondary'} className="w-fit">
                                                        {camp.is_published ? 'Publicado' : 'Rascunho'}
                                                    </Badge>
                                                    {camp.date && new Date(camp.date) < new Date() && (
                                                        <Badge variant="outline" className="w-fit border-muted-foreground text-muted-foreground">
                                                            Concluído
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-xs text-muted-foreground">Visualizar</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
