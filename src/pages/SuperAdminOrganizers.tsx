import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OrganizerStats {
    organizer_id: string;
    organizer_email: string;
    organizer_name: string | null;
    total_championships: number;
    total_registrations: number;
    paid_payments: number;
    total_revenue_cents: number;
}

export default function SuperAdminOrganizers() {
    const [loading, setLoading] = useState(true);
    const [organizers, setOrganizers] = useState<OrganizerStats[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: organizerData, error: orgError } = await supabase.rpc("get_organizer_stats");

            if (orgError) {
                console.error("Error calling RPC:", orgError);
                toast.error("Erro ao carregar dados dos organizadores");
                return;
            }

            if (organizerData) {
                setOrganizers(organizerData as OrganizerStats[]);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
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
                <h1 className="text-2xl font-bold">Organizadores</h1>
                <p className="text-sm text-muted-foreground">
                    Lista de todos os organizadores cadastrados na plataforma e seus desempenhos.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organizadores e Faturamento</CardTitle>
                    <CardDescription>
                        Detalhamento por organizador
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {organizers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum organizador encontrado
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organizador</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Campeonatos</TableHead>
                                        <TableHead>Inscrições</TableHead>
                                        <TableHead>Pagamentos</TableHead>
                                        <TableHead className="text-right">Faturamento Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organizers.map((org) => (
                                        <TableRow key={org.organizer_id}>
                                            <TableCell className="font-medium">
                                                {org.organizer_name || "Sem nome"}
                                            </TableCell>
                                            <TableCell>{org.organizer_email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{org.total_championships}</Badge>
                                            </TableCell>
                                            <TableCell>{org.total_registrations}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{org.paid_payments}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(org.total_revenue_cents)}
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
