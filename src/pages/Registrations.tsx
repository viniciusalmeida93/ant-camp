import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, X, Edit, Trash2, CheckCircle2, Mail, Eye, ChevronDown, ChevronUp, GripVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente SortableRegistrationItem para drag and drop
function SortableRegistrationItem({ 
  reg, 
  onEdit, 
  onDelete, 
  onPreviewEmail, 
  onSendEmail,
  isExpanded,
  onToggleExpand 
}: { 
  reg: any; 
  onEdit: () => void; 
  onDelete: () => void;
  onPreviewEmail: () => void;
  onSendEmail: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reg.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasMembers = reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-sm border border-border bg-card hover:bg-muted/50 transition-all">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1 self-start sm:self-center"
          title="Arrastar para reorganizar"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          {/* Header - Nome e Número */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm shrink-0">
              #{reg.registrationOrder || 0}
            </span>
            <p className="font-semibold truncate">{reg.team_name || reg.athlete_name}</p>
          </div>
          
          {/* Info Simplificada - Apenas Categoria e Data */}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{reg.category?.name}</span>
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

          {/* Dropdown de Integrantes - Sempre disponível para ver detalhes */}
          <Collapsible open={isExpanded} onOpenChange={onToggleExpand} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs h-8"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Ver integrantes{hasMembers ? ` (${reg.team_members.length})` : ''}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 rounded-sm p-3 space-y-2">
                {/* Integrantes do Time */}
                {hasMembers && reg.team_members.map((member: any, index: number) => (
                  <div key={index} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="font-semibold mb-1">
                      {member.name || `Integrante ${index + 1}`}
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      {member.email && <div>📧 {member.email}</div>}
                      {member.whatsapp && <div>📱 {member.whatsapp}</div>}
                      {member.cpf && <div>🆔 CPF: {member.cpf}</div>}
                      {member.birthDate && (
                        <div>🎂 {new Date(member.birthDate).toLocaleDateString('pt-BR')}</div>
                      )}
                      {member.shirtSize && <div>👕 Tamanho: {member.shirtSize}</div>}
                    </div>
                  </div>
                ))}
                {!hasMembers && (
                  <div className="text-xs text-muted-foreground">
                    Nenhum integrante adicional cadastrado.
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex gap-1 shrink-0 justify-end sm:justify-start">
          <Button
            size="icon"
            variant="ghost"
            onClick={onPreviewEmail}
            title="👁️ Visualizar email"
            className="h-8 w-8"
          >
            <Eye className="w-4 h-4 text-purple-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onSendEmail}
            title="✉️ Enviar email"
            className="h-8 w-8"
          >
            <Mail className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            title="Editar"
            className="h-8 w-8"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            title="Excluir"
            className="h-8 w-8"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Registrations() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<any[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  
  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
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

      // Load registrations ordenadas por order_index ou created_at (fallback)
      // Apenas mostrar inscrições pagas (payment_status = 'approved')
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("championship_id", selectedChampionship.id)
        .eq("payment_status", "approved") // Apenas inscrições pagas
        .order("order_index", { ascending: true, nullsLast: false }) // Ordenar por order_index primeiro
        .order("created_at", { ascending: true }); // Fallback para created_at se order_index for NULL

      if (regsError) throw regsError;
      
      // Calcular ordem de inscrição por categoria baseado em order_index ou created_at
      const registrationsWithOrder = (regs || []).map((reg, index) => {
        // Se order_index não existe, calcular baseado em created_at
        if (reg.order_index === null || reg.order_index === undefined) {
          const sameCategoryRegs = (regs || []).filter(r => 
            r.category_id === reg.category_id && 
            (r.order_index === null || r.order_index === undefined) &&
            new Date(r.created_at).getTime() <= new Date(reg.created_at).getTime()
          );
          return {
            ...reg,
            registrationOrder: sameCategoryRegs.length, // Ordem dentro da categoria
          };
        }
        // Se order_index existe, usar ele diretamente
        const sameCategoryRegs = (regs || []).filter(r => 
          r.category_id === reg.category_id && 
          (r.order_index === null || r.order_index === undefined || r.order_index <= reg.order_index)
        );
        return {
          ...reg,
          registrationOrder: reg.order_index || sameCategoryRegs.length,
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
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' }],
        boxName: '',
      });
    } else {
      setFormData({
        teamName: '',
        members: Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' })),
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
    if (reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0) {
      // Só usar team_members se tiver dados reais (não apenas objetos vazios)
      const validMembers = reg.team_members.filter((m: any) => 
        m && (m.name || m.email || m.whatsapp || m.cpf || m.birthDate)
      );
      if (validMembers.length > 0) {
        members = validMembers.map((m: any) => ({
          name: m.name || '',
          email: m.email || '',
          whatsapp: m.whatsapp || '',
          shirtSize: m.shirtSize || 'M',
          cpf: m.cpf || '',
          birthDate: m.birthDate || '',
        }));
      }
    }
    
    // Se não encontrou membros válidos, inicializar vazio baseado no formato
    if (members.length === 0) {
      const teamSize = category.team_size || (category.format === 'dupla' ? 2 : category.format === 'trio' ? 3 : category.format === 'time' ? 4 : 1);
      members = Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '' }));
    }

    setFormData({
      teamName: reg.team_name || reg.athlete_name || '',
      members: members,
      boxName: reg.box_name || '',
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
      
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }
      
      toast.info("Carregando visualização do email...");
      
      // Fazer requisição com autorização
      const previewUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/preview-registration-email`;
      
      const response = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          registrationId: reg.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      // Pegar o HTML retornado
      const htmlContent = await response.text();
      
      // Abrir em nova aba e escrever o HTML
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        toast.success("Email visualizado em nova aba!");
      } else {
        toast.error("Bloqueador de pop-up ativo. Permita pop-ups para este site.");
      }
    } catch (error: any) {
      console.error("Error previewing email:", error);
      toast.error("Erro ao visualizar email: " + error.message);
    }
  };

  const toggleMembersExpanded = (regId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(regId)) {
        newSet.delete(regId);
      } else {
        newSet.add(regId);
      }
      return newSet;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredRegistrations.findIndex((r) => r.id === active.id);
    const newIndex = filteredRegistrations.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newRegistrations = arrayMove(filteredRegistrations, oldIndex, newIndex);
    
    // Obter a categoria do item movido (assumindo que todas as inscrições filtradas são da mesma categoria)
    // Se houver filtro por categoria, usar essa categoria
    const movedReg = newRegistrations[newIndex];
    const categoryId = movedReg.category_id;
    
    // Filtrar apenas inscrições da mesma categoria e atualizar order_index
    const sameCategoryRegs = newRegistrations.filter(r => r.category_id === categoryId);
    
    try {
      // Atualizar order_index no banco de dados para todas as inscrições desta categoria
      for (let i = 0; i < sameCategoryRegs.length; i++) {
        const reg = sameCategoryRegs[i];
        await supabase
          .from("registrations")
          .update({ order_index: i + 1 })
          .eq("id", reg.id);
      }

      // Atualizar estado local com nova ordem
      const updatedRegistrations = newRegistrations.map((reg, index) => {
        if (reg.category_id === categoryId) {
          const categoryIndex = sameCategoryRegs.findIndex(r => r.id === reg.id);
          return {
            ...reg,
            registrationOrder: categoryIndex !== -1 ? categoryIndex + 1 : reg.registrationOrder,
            order_index: categoryIndex !== -1 ? categoryIndex + 1 : reg.order_index,
          };
        }
        return reg;
      });
      
      setFilteredRegistrations(updatedRegistrations);
      
      toast.success("Ordem das inscrições atualizada e salva!");
    } catch (error: any) {
      console.error("Erro ao salvar ordem:", error);
      toast.error("Erro ao salvar ordem das inscrições");
      // Reverter para ordem anterior em caso de erro
      await loadData();
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
    e.stopPropagation();
    setSaving(true);

    try {
      if (!selectedCategory) {
        toast.error("Selecione uma categoria");
        setSaving(false);
        return;
      }

      // Validar apenas campos obrigatórios: nome do time/atleta e box
      if (!formData.teamName.trim()) {
        const errorMsg = selectedCategory.format === 'individual' 
          ? "Digite o nome do atleta" 
          : "Digite o nome do time";
        toast.error(errorMsg);
        setSaving(false);
        return;
      }

      if (!formData.boxName.trim()) {
        toast.error("Digite o nome do box");
        setSaving(false);
        return;
      }

      // Validar CPF apenas se foi preenchido (não obrigatório, mas se preenchido deve ser válido)
      for (let i = 0; i < formData.members.length; i++) {
        const member = formData.members[i];
        if (member.cpf.trim()) {
          const cpfClean = member.cpf.replace(/\D/g, '');
          if (cpfClean.length !== 11) {
            toast.error(`CPF do ${selectedCategory.format === 'individual' ? 'atleta' : `integrante ${i + 1}`} deve ter 11 dígitos`);
            setSaving(false);
            return;
          }
        }
      }

      // Calcular valores com taxa de plataforma de 5%
      const subtotalCents = selectedCategory.price_cents;
      const platformFeeCents = Math.round(subtotalCents * 0.05); // 5% de taxa de plataforma
      const totalCents = subtotalCents + platformFeeCents; // Valor total com taxa

      // Create or update registration
      // Campos opcionais podem ser vazios/null, mas athlete_name é obrigatório (NOT NULL)
      const athleteName = selectedCategory.format === 'individual' 
        ? (formData.members[0]?.name?.trim() || formData.teamName.trim() || 'Sem nome')
        : formData.teamName.trim();
      
      if (!athleteName || athleteName.trim() === '') {
        toast.error("Nome do time/atleta é obrigatório");
        setSaving(false);
        return;
      }

      const registrationData: any = {
        championship_id: selectedChampionship.id,
        category_id: selectedCategory.id,
        athlete_name: athleteName,
        athlete_email: formData.members[0]?.email?.trim() || null,
        athlete_phone: formData.members[0]?.whatsapp?.trim() || null,
        athlete_cpf: (formData.members[0]?.cpf?.replace(/\D/g, '') || '').length > 0 
          ? formData.members[0].cpf.replace(/\D/g, '') 
          : null,
        athlete_birth_date: formData.members[0]?.birthDate?.trim() || null,
        team_name: selectedCategory.format !== 'individual' ? formData.teamName.trim() : null,
        team_members: selectedCategory.format !== 'individual' ? formData.members.map(m => {
          // Retornar apenas campos preenchidos, campos vazios não devem aparecer
          const member: any = {};
          if (m.name?.trim()) member.name = m.name.trim();
          if (m.email?.trim()) member.email = m.email.trim();
          if (m.whatsapp?.trim()) member.whatsapp = m.whatsapp.trim();
          if (m.shirtSize) member.shirtSize = m.shirtSize;
          if (m.cpf?.replace(/\D/g, '')) member.cpf = m.cpf.replace(/\D/g, '');
          if (m.birthDate?.trim()) member.birthDate = m.birthDate.trim();
          return member;
        }).filter(m => Object.keys(m).length > 0) : null,
        shirt_size: selectedCategory.format === 'individual' ? (formData.members[0]?.shirtSize || 'M') : null,
        box_name: formData.boxName.trim() || null,
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
        // Create new registration - DIRETO COMO APROVADA
        console.log("=== CRIANDO INSCRIÇÃO ===");
        console.log("Dados:", registrationData);
        
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

        if (error) {
          console.error("❌ ERRO:", error);
          throw error;
        }
        
        console.log("✅ Inscrição salva! ID:", registration?.id);
        toast.success("Inscrição criada com sucesso!");
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
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
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
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
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
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
              <form 
                onSubmit={handleSubmit} 
                className="space-y-4 mt-4" 
                noValidate
                onInvalid={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
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

                {selectedCategory.format === 'individual' && (
                  <div>
                    <Label htmlFor="teamName">Nome do Atleta *</Label>
                    <Input
                      id="teamName"
                      value={formData.teamName}
                      onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      placeholder="Nome do atleta"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="boxName">Nome do Box *</Label>
                  <Input
                    id="boxName"
                    value={formData.boxName}
                    onChange={(e) => setFormData({ ...formData, boxName: e.target.value })}
                    placeholder="Ex: CrossFit SP"
                    required
                  />
                </div>

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
                          <Label>Nome Completo</Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            placeholder="Nome completo (opcional)"
                            required={false}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="text"
                              value={member.email}
                              onChange={(e) => updateMember(index, 'email', e.target.value)}
                              placeholder="email@exemplo.com (opcional)"
                              required={false}
                            />
                          </div>
                          <div>
                            <Label>WhatsApp</Label>
                            <Input
                              value={member.whatsapp}
                              onChange={(e) => updateMember(index, 'whatsapp', e.target.value)}
                              placeholder="(11) 99999-9999 (opcional)"
                              required={false}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>CPF</Label>
                            <Input
                              value={member.cpf}
                              onChange={(e) => updateMember(index, 'cpf', e.target.value)}
                              placeholder="000.000.000-00 (opcional)"
                              required={false}
                            />
                          </div>
                          <div>
                            <Label>Data de Nascimento</Label>
                            <Input
                              type="date"
                              value={member.birthDate}
                              onChange={(e) => updateMember(index, 'birthDate', e.target.value)}
                              required={false}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Tamanho da Camisa</Label>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredRegistrations.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {filteredRegistrations.map((reg) => (
                  <SortableRegistrationItem
                    key={reg.id}
                    reg={reg}
                    onEdit={() => handleEdit(reg)}
                    onDelete={() => handleDelete(reg.id)}
                    onPreviewEmail={() => handlePreviewEmail(reg)}
                    onSendEmail={() => handleSendEmail(reg)}
                    isExpanded={expandedMembers.has(reg.id)}
                    onToggleExpand={() => toggleMembersExpanded(reg.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
