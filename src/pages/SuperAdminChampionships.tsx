import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Championship {
    id: string;
    name: string;
    event_date: string;
    status: string;
    organizer: {
        name: string | null;
        email: string | null;
    } | null; // Joined profile
}

export default function SuperAdminChampionships() {
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<Championship[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch championships with organizer details
            // We need to join with auth.users possibly via profiles if it exists, or just use user_id
            // Since supabase client types might be strict, we'll try to fetch safely

            const { data, error } = await supabase
                .from('championships')
                .select(`
            id,
            name,
            event_date,
            status,
            owner_id
        `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error loading championships", error);
                toast.error("Erro ao carregar campeonatos");
                return;
            }

            // Fetch organizer emails manually to avoid complex joins if profiles are not strictly linked or if we need email from auth.users (which we can't join directly in client)
            // Actually, for Super Admin, we might want to create a View or a Function later. 
            // For now, let's just show the ID or fetch profiles if possible.
            // Let's try fetching profiles
            const ownerIds = Array.from(new Set(data.map(c => c.owner_id)));
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', ownerIds);

            const profileMap = new Map();
            profiles?.forEach(p => profileMap.set(p.id, p));

            const formatted = data.map(c => ({
                ...c,
                organizer: {
                    name: profileMap.get(c.owner_id)?.name || 'N/A',
                    email: null // Can't easily get email from client side without edge function or proper RLS on auth.users view
                }
            }));

            setChampionships(formatted);

        } finally {
            setLoading(false);
        }
    };

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
                    <CardTitle>Todos os Campeonatos</CardTitle>
                    <CardDescription>
                        Lista completa de eventos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {championships.length === 0 ? (
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
                                    {championships.map((camp) => (
                                        <TableRow key={camp.id}>
                                            <TableCell className="font-medium">
                                                {camp.name}
                                            </TableCell>
                                            <TableCell>{camp.organizer?.name}</TableCell>
                                            <TableCell>
                                                {camp.event_date ? format(new Date(camp.event_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant={camp.status === 'published' ? 'default' : 'secondary'} className="w-fit">
                                                        {camp.status === 'published' ? 'Publicado' : 'Rascunho'}
                                                    </Badge>
                                                    {camp.event_date && new Date(camp.event_date) < new Date() && (
                                                        <Badge variant="outline" className="w-fit border-muted-foreground text-muted-foreground">
                                                            Concluído
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {/* Placeholder for future actions */}
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
