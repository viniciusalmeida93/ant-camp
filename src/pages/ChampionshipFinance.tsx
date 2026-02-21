import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Filter, DollarSign,
  TrendingUp, Users, CheckCircle, XCircle, Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ChampionshipFinance() {
  const { championshipId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [championship, setChampionship] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalGross: 0,
    totalFees: 0,
    totalNet: 0,
    approvedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
  });
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    confirmedRevenue: 0,
    pendingRevenue: 0,
    totalRegistrations: 0,
    paymentMethods: [] as any[],
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, [championshipId]);

  useEffect(() => {
    applyFilters();
  }, [registrations, filterStatus, searchTerm]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("id", championshipId)
        .single();

      if (champError) throw champError;
      setChampionship(champ);

      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select("*, categories(*), payments(*)")
        .eq("championship_id", championshipId)
        .order("created_at", { ascending: false });

      if (regsError) throw regsError;
      setRegistrations(regs || []);

      // Calculate stats
      const approved = regs?.filter(r => r.payment_status === "approved") || [];
      const pending = regs?.filter(r => r.payment_status === "pending") || [];
      const cancelled = regs?.filter(r => r.payment_status === "cancelled" || r.payment_status === "expired") || [];

      const totalGross = approved.reduce((sum, r) => sum + r.subtotal_cents, 0);
      const totalFees = approved.reduce((sum, r) => sum + r.platform_fee_cents, 0);

      setStats({
        totalGross,
        totalFees,
        totalNet: totalGross,
        approvedCount: approved.length,
        pendingCount: pending.length,
        cancelledCount: cancelled.length,
      });

      // Calculate financial stats
      const pendingRevenue = pending.reduce((sum, r) => sum + (r.subtotal_cents || 0), 0);
      const totalRevenue = (regs || []).reduce((sum, r) => sum + (r.subtotal_cents || 0), 0);

      const methodMap = new Map<string, number>();
      approved.forEach(reg => {
        const method = reg.payment_method || 'Não informado';
        methodMap.set(method, (methodMap.get(method) || 0) + (reg.subtotal_cents || 0));
      });

      const paymentMethods = Array.from(methodMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalGross > 0 ? Math.round((amount / totalGross) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setFinancialStats({
        totalRevenue,
        confirmedRevenue: totalGross,
        pendingRevenue,
        totalRegistrations: (regs || []).length,
        paymentMethods,
      });

    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...registrations];

    if (filterStatus !== "all") {
      filtered = filtered.filter(r => r.payment_status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.athlete_name.toLowerCase().includes(term) ||
        r.athlete_email.toLowerCase().includes(term) ||
        r.team_name?.toLowerCase().includes(term)
      );
    }

    setFilteredRegistrations(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Categoria", "Status", "Valor", "Taxa", "Líquido", "Data"];
    const rows = filteredRegistrations.map(r => [
      r.athlete_name,
      r.athlete_email,
      r.categories.name,
      r.payment_status,
      formatCurrency(r.subtotal_cents),
      formatCurrency(r.platform_fee_cents),
      formatCurrency(r.subtotal_cents),
      new Date(r.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${championship?.slug || 'campeonato'}.csv`;
    a.click();
    toast.success("CSV exportado com sucesso!");
  };


  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      approved: { variant: "default", icon: CheckCircle, label: "Aprovado" },
      pending: { variant: "secondary", icon: Clock, label: "Pendente" },
      cancelled: { variant: "destructive", icon: XCircle, label: "Cancelado" },
      expired: { variant: "destructive", icon: XCircle, label: "Expirado" },
      refunded: { variant: "outline", icon: XCircle, label: "Reembolsado" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <div className="w-full mx-auto px-6 py-6 max-w-[98%]">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="w-full mx-auto px-6 py-4 max-w-[98%]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Financeiro</h1>
              <p className="text-sm text-muted-foreground">{championship?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financialStats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Todas as inscrições</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmado</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(financialStats.confirmedRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.approvedCount} pagamentos aprovados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(financialStats.pendingRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} aguardando confirmação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialStats.totalRegistrations > 0
                  ? Math.round(financialStats.totalRevenue / financialStats.totalRegistrations)
                  : 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por atleta</p>
            </CardContent>
          </Card>
        </div>

        {/* Métodos de Pagamento */}
        {financialStats.paymentMethods.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Métodos de Pagamento</CardTitle>
              <CardDescription>Distribuição dos pagamentos confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialStats.paymentMethods.map((method) => (
                  <div key={method.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{method.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {method.percentage}% ({formatCurrency(method.amount)})
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-[#D71C1D] h-2 rounded-full transition-all"
                        style={{ width: `${method.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inscrições e Pagamentos</CardTitle>
                <CardDescription>
                  Gerencie todas as inscrições do campeonato
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atleta/Time</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reg.athlete_name}</p>
                          {reg.team_name && (
                            <p className="text-xs text-muted-foreground">{reg.team_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{reg.athlete_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{reg.categories.name}</TableCell>
                      <TableCell>{getStatusBadge(reg.payment_status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(reg.subtotal_cents)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(reg.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRegistrations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma inscrição encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}