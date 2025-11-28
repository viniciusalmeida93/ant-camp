import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, X, Edit, Trash2, CheckCircle2, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';

export default function Registrations() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<any[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    teamName: '',
    members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' }],
    boxName: '',
  });

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();
    }
  }, [selectedChampionship]);

  // Filtrar inscrições por categoria
  useEffect(() => {
    if (selectedCategoryFilter === 'all') {
      setFilteredRegistrations(registrations);
    } else {
      setFilteredRegistrations(registrations.filter(reg => reg.category_id === selectedCategoryFilter));
    }
  }, [selectedCategoryFilter, registrations]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadData = async () => {
    try {
      if (!selectedChampionship) {
        toast.error("Selecione um campeonato primeiro");
        navigate("/app");
        return;
      }

      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_index", { ascending: true });

      if (catsError) throw catsError;
      setCategories(cats || []);

      // Load registrations ordenadas por data de criação (mais antigas primeiro para ordem de inscrição)
      // Apenas mostrar inscrições pagas (payment_status = 'approved')
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("championship_id", selectedChampionship.id)
        .eq("payment_status", "approved") // Apenas inscrições pagas
        .order("created_at", { ascending: true }); // Ordem crescente: mais antigas primeiro

      if (regsError) throw regsError;
      
      // Calcular ordem de inscrição por categoria
      const registrationsWithOrder = (regs || []).map((reg, index) => {
        // Contar quantas inscrições anteriores existem na mesma categoria
        const sameCategoryRegs = (regs || []).filter(r => 
          r.category_id === reg.category_id && 
          new Date(r.created_at).getTime() <= new Date(reg.created_at).getTime()
        );
        return {
          ...reg,
          registrationOrder: sameCategoryRegs.length, // Ordem dentro da categoria
        };
      });
      
      setRegistrations(registrationsWithOrder);
      setFilteredRegistrations(registrationsWithOrder);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    setSelectedCategory(category);
    
    // Initialize form based on category format
    const teamSize = category.team_size || (category.format === 'dupla' ? 2 : category.format === 'trio' ? 3 : category.format === 'time' ? 4 : 1);
    
    if (category.format === 'individual') {
      setFormData({
        teamName: '',
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M' }],
        boxName: '',
      });
    } else {
      setFormData({
        teamName: '',
        members: Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M' })),
        boxName: '',
      });
    }
  };

  const updateMember = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      ),
    }));
  };

  const handleEdit = (reg: any) => {
    const category = categories.find(c => c.id === reg.category_id);
    if (!category) {
      toast.error("Categoria não encontrada");
      return;
    }

    setEditingRegistration(reg);
    setSelectedCategory(category);

    // Parse team_members if exists
    let members: any[] = [];
    if (reg.team_members && Array.isArray(reg.team_members)) {
      members = reg.team_members.map((m: any) => ({
        name: m.name || '',
        email: m.email || '',
        whatsapp: m.whatsapp || '',
        shirtSize: m.shirtSize || 'M',
      }));
    } else if (category.format === 'individual') {
      members = [{
        name: reg.athlete_name || '',
        email: reg.athlete_email || '',
        whatsapp: reg.athlete_phone || '',
        shirtSize: reg.shirt_size || 'M',
      }];
    }

    setFormData({
      teamName: reg.team_name || '',
      members: members.length > 0 ? members : [{ name: '', email: '', whatsapp: '', shirtSize: 'M' }],
      boxName: '', // Box name não está na tabela ainda
    });

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta inscrição?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Inscrição excluída com sucesso!");
      await loadData();
    } catch (error: any) {
      console.error("Error deleting registration:", error);
      toast.error("Erro ao excluir inscrição");
    }
  };

  const handleApprovePayment = async (reg: any) => {
    if (!confirm(`Confirmar pagamento de R$ ${(reg.total_cents / 100).toFixed(2).replace('.', ',')} para ${reg.team_name || reg.athlete_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: 'approved',
          paid_at: new Date().toISOString(),
        })
        .eq("id", reg.id);

      if (error) throw error;

      toast.success("Pagamento aprovado com sucesso!");
      await loadData();
    } catch (error: any) {
      console.error("Error approving payment:", error);
      toast.error("Erro ao aprovar pagamento");
    }
  };

  const handlePreviewEmail = async (reg: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Abrir preview em nova aba
      const previewUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/preview-registration-email`;
      
      // Criar formulário para fazer POST em nova aba
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = previewUrl;
      form.target = '_blank';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'registrationId';
      input.value = reg.id;
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      toast.success("Abrindo visualização do email...");
    } catch (error: any) {
      console.error("Error previewing email:", error);
      toast.error("Erro ao visualizar email: " + error.message);
    }
  };

  const handleSendEmail = async (reg: any) => {
    const teamMembersCount = reg.team_members ? reg.team_members.length : 0;
    const totalRecipients = 1 + teamMembersCount; // atleta principal + membros do time
    
    if (!confirm(`Enviar email de confirmação para ${reg.team_name || reg.athlete_name}?\n\nSerão enviados ${totalRecipients} email(s):\n- ${reg.athlete_email}${teamMembersCount > 0 ? `\n- + ${teamMembersCount} membro(s) do time` : ''}`)) {
      return;
    }

    const toastId = toast.loading("Enviando email...");

    try {
      const { data, error } = await supabase.functions.invoke('send-registration-email', {
        body: { registrationId: reg.id }
      });

      if (error) throw error;

      toast.success(`Email enviado com sucesso para ${data.recipients} destinatário(s)!`, { id: toastId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Erro ao enviar email: " + error.message, { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!selectedCategory) {
        toast.error("Selecione uma categoria");
        setSaving(false);
        return;
      }

      // Validate all required fields
      if (selectedCategory.format !== 'individual' && !formData.teamName.trim()) {
        toast.error("Digite o nome do time");
        setSaving(false);
        return;
      }

      for (let i = 0; i < formData.members.length; i++) {
        const member = formData.members[i];
        if (!member.name.trim()) {
          toast.error(`Digite o nome completo do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`}`);
          setSaving(false);
          return;
        }
        if (!member.email.trim()) {
          toast.error(`Digite o email do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`}`);
          setSaving(false);
          return;
        }
        if (!member.whatsapp.trim()) {
          toast.error(`Digite o WhatsApp do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`}`);
          setSaving(false);
          return;
        }
        if (!member.cpf.trim()) {
          toast.error(`Digite o CPF do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`}`);
          setSaving(false);
          return;
        }
        const cpfClean = member.cpf.replace(/\D/g, '');
        if (cpfClean.length !== 11) {
          toast.error(`CPF do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`} deve ter 11 dígitos`);
          setSaving(false);
          return;
        }
        if (!member.birthDate.trim()) {
          toast.error(`Digite a data de nascimento do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`}`);
          setSaving(false);
          return;
        }
      }

      // Calcular valores com taxa de plataforma de 5%
      const subtotalCents = selectedCategory.price_cents;
      const platformFeeCents = Math.round(subtotalCents * 0.05); // 5% de taxa de plataforma
      const totalCents = subtotalCents + platformFeeCents; // Valor total com taxa

      // Create or update registration
      const registrationData = {
        championship_id: selectedChampionship.id,
        category_id: selectedCategory.id,
        athlete_name: selectedCategory.format === 'individual' ? formData.members[0].name : formData.teamName,
        athlete_email: formData.members[0].email,
        athlete_phone: formData.members[0].whatsapp,
        athlete_cpf: formData.members[0].cpf.replace(/\D/g, ''),
        athlete_birth_date: formData.members[0].birthDate,
        team_name: selectedCategory.format !== 'individual' ? formData.teamName : null,
        team_members: selectedCategory.format !== 'individual' ? formData.members.map(m => ({
          name: m.name,
          email: m.email,
          whatsapp: m.whatsapp,
          shirtSize: m.shirtSize || 'M',
          cpf: m.cpf.replace(/\D/g, ''),
          birthDate: m.birthDate,
        })) : null,
        shirt_size: selectedCategory.format === 'individual' ? (formData.members[0].shirtSize || 'M') : null,
        subtotal_cents: subtotalCents,
        platform_fee_cents: platformFeeCents,
        total_cents: totalCents,
      };

      if (editingRegistration) {
        // Update existing registration
        const { error } = await supabase
          .from("registrations")
          .update(registrationData)
          .eq("id", editingRegistration.id);

        if (error) throw error;
        toast.success("Inscrição atualizada com sucesso!");
      } else {
        // Create new registration
        // Inscrições manuais já são aprovadas (pagamento feito fora da plataforma)
        const { data: registration, error } = await supabase
          .from("registrations")
          .insert({
            ...registrationData,
            status: 'approved',
            payment_status: 'approved',
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Inscrição criada e aprovada com sucesso!");
      }

      setIsDialogOpen(false);
      setSelectedCategory(null);
      setEditingRegistration(null);
      setFormData({
        teamName: '',
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' }],
        boxName: '',
      });
      await loadData();
    } catch (error: any) {
      console.error("Error creating registration:", error);
      console.error("Error details:", error.message, error.details, error.hint);
      // Mostrar erro detalhado para debug
      if (error.message?.includes("violates check constraint")) {
        toast.error("Erro ao processar inscrição. Verifique os dados e tente novamente.");
      } else if (error.message?.includes("null value")) {
        toast.error("Erro: Todos os campos obrigatórios devem ser preenchidos.");
      } else {
        toast.error(`Erro ao criar inscrição: ${error.message || "Tente novamente"}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Selecione um campeonato primeiro.</p>
          <Button onClick={() => navigate("/app")}>
            Ir para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Inscrições</h1>
          <p className="text-muted-foreground">Gerencie as inscrições do campeonato</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setEditingRegistration(null);
            setFormData({
              teamName: '',
              members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' }],
              boxName: '',
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Nova Inscrição
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRegistration ? 'Editar' : 'Nova'} Inscrição</DialogTitle>
            </DialogHeader>
            
            {!selectedCategory ? (
              <div className="space-y-4 mt-4">
                <Label>Categoria *</Label>
                <Select onValueChange={handleCategorySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.format} - {cat.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecione a categoria para continuar com a inscrição
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="p-3 bg-primary/10 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selectedCategory.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.format} - {selectedCategory.gender}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedCategory.format !== 'individual' && (
                  <div>
                    <Label htmlFor="teamName">Nome do Time/Pessoa *</Label>
                    <Input
                      id="teamName"
                      value={formData.teamName}
                      onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      placeholder="Ex: Time RX"
                      required
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <Label>
                    {selectedCategory.format === 'individual' ? 'Dados do Atleta' : 'Integrantes'}
                  </Label>
                  {formData.members.map((member, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        {selectedCategory.format !== 'individual' && (
                          <p className="text-sm font-semibold text-muted-foreground">
                            Integrante {index + 1}
                          </p>
                        )}
                        <div>
                          <Label>Nome Completo *</Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            placeholder="Nome completo"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Email *</Label>
                            <Input
                              type="email"
                              value={member.email}
                              onChange={(e) => updateMember(index, 'email', e.target.value)}
                              placeholder="email@exemplo.com"
                              required
                            />
                          </div>
                          <div>
                            <Label>WhatsApp *</Label>
                            <Input
                              value={member.whatsapp}
                              onChange={(e) => updateMember(index, 'whatsapp', e.target.value)}
                              placeholder="(11) 99999-9999"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>CPF *</Label>
                            <Input
                              value={member.cpf}
                              onChange={(e) => updateMember(index, 'cpf', e.target.value)}
                              placeholder="000.000.000-00"
                              required
                            />
                          </div>
                          <div>
                            <Label>Data de Nascimento *</Label>
                            <Input
                              type="date"
                              value={member.birthDate}
                              onChange={(e) => updateMember(index, 'birthDate', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Tamanho da Camisa *</Label>
                          <Select
                            value={member.shirtSize || 'M'}
                            onValueChange={(value) => updateMember(index, 'shirtSize', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PP">PP</SelectItem>
                              <SelectItem value="P">P</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="G">G</SelectItem>
                              <SelectItem value="GG">GG</SelectItem>
                              <SelectItem value="XG">XG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div>
                  <Label htmlFor="boxName">Nome do Box</Label>
                  <Input
                    id="boxName"
                    value={formData.boxName}
                    onChange={(e) => setFormData({ ...formData, boxName: e.target.value })}
                    placeholder="Ex: CrossFit SP (opcional)"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedCategory(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      editingRegistration ? "Atualizar Inscrição" : "Criar Inscrição"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {/* Filtro por categoria */}
        {categories.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="categoryFilter" className="whitespace-nowrap">Filtrar por Categoria:</Label>
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger id="categoryFilter" className="w-full md:w-[300px]">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.format} - {cat.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground ml-auto">
                {filteredRegistrations.length} inscrição(ões)
              </div>
            </div>
          </Card>
        )}

        {filteredRegistrations.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {registrations.length === 0 
                ? "Nenhuma inscrição ainda." 
                : "Nenhuma inscrição encontrada para o filtro selecionado."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {registrations.length === 0 
                ? "Clique em \"Nova Inscrição\" para começar." 
                : "Tente selecionar outra categoria."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  {/* Header - Nome e Número */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                      #{reg.registrationOrder || 0}
                    </span>
                    <p className="font-semibold truncate">{reg.team_name || reg.athlete_name}</p>
                    <span className="font-semibold text-foreground ml-auto shrink-0">
                      R$ {(reg.total_cents / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  
                  {/* Info - Layout Responsivo */}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{reg.category?.name}</span>
                      {reg.team_members && reg.team_members.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{reg.team_members.length} integrante(s)</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="truncate max-w-[180px] sm:max-w-none">{reg.athlete_email}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{reg.athlete_phone}</span>
                    </div>
                    <div className="text-xs">
                      Inscrito em {new Date(reg.created_at).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Botões de Ação */}
                <div className="flex gap-1 shrink-0 justify-end sm:justify-start">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePreviewEmail(reg)}
                    title="👁️ Visualizar email"
                    className="h-8 w-8"
                  >
                    <Eye className="w-4 h-4 text-purple-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSendEmail(reg)}
                    title="✉️ Enviar email"
                    className="h-8 w-8"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(reg)}
                    title="Editar"
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(reg.id)}
                    title="Excluir"
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
