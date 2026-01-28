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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { formatCurrency } from '@/lib/utils';
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
  onSendCartRecovery,
  onUpdatePaymentStatus,
  isExpanded,
  onToggleExpand,
  onSendPasswordRecovery
}: {
  reg: any;
  onEdit: () => void;
  onDelete: () => void;
  onPreviewEmail: () => void;
  onSendEmail: () => void;
  onSendCartRecovery: () => void;
  onSendPasswordRecovery: () => void;
  onUpdatePaymentStatus: (status: string) => void;
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

          {/* Info Line & Dropdown */}
          <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-bold uppercase tracking-wide text-foreground/80">{reg.category?.name}</span>

              <div className="flex items-center gap-1">
                <span>Inscrito em {new Date(reg.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}</span>
              </div>

              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors ml-1 font-medium select-none"
                  title={isExpanded ? "Ocultar integrantes" : "Ver integrantes"}
                >
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Ver integrantes{hasMembers ? ` (${reg.team_members.length})` : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>

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
                      {member.shirtSize && <div>Tamanho: {member.shirtSize}</div>}
                      {member.box && <div>Box: {member.box}</div>}
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
        <div className="flex gap-1 shrink-0 justify-end sm:justify-start flex-wrap">
          {/* Payment Status Dropdown */}
          <div className="flex items-center gap-2 mr-2">
            <Select value={reg.payment_status} onValueChange={onUpdatePaymentStatus}>
              <SelectTrigger className={`h-8 w-[130px] text-xs ${reg.payment_status === 'approved' ? 'bg-green-500/10 text-green-700 border-green-200' :
                reg.payment_status === 'processing' ? 'bg-orange-500/10 text-orange-700 border-orange-200' :
                  reg.payment_status === 'cancelled' ? 'bg-red-500/10 text-red-700 border-red-200' :
                    'bg-yellow-500/10 text-yellow-700 border-yellow-200'
                }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" className="text-yellow-700">Pendente</SelectItem>
                <SelectItem value="processing" className="text-orange-700">Processando</SelectItem>
                <SelectItem value="approved" className="text-green-700">Aprovado</SelectItem>
                <SelectItem value="cancelled" className="text-red-700">Cancelar</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                title="✉️ Enviar email"
                className="h-8 w-8"
              >
                <Mail className="w-4 h-4 text-blue-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Enviar Email</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSendEmail} className="cursor-pointer">
                Confirmação de Inscrição
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendCartRecovery} className="cursor-pointer">
                Recuperação de Carrinho
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendPasswordRecovery} className="cursor-pointer">
                Recuperação de Senha
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    </div >
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
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const downloadCSV = () => {
    if (registrations.length === 0) {
      toast.error("Não há inscrições para exportar");
      return;
    }

    const headers = [
      "ID", "Categoria", "Nome Time/Atleta", "Box Chamada", "Status Pagamento", "Valor Total",
      "Atleta 1 Nome", "Atleta 1 Email", "Atleta 1 CPF", "Atleta 1 Box", "Atleta 1 Tam. Camisa",
      "Atleta 2 Nome", "Atleta 2 Email", "Atleta 2 CPF", "Atleta 2 Box", "Atleta 2 Tam. Camisa",
      "Atleta 3 Nome", "Atleta 3 Email", "Atleta 3 CPF", "Atleta 3 Box", "Atleta 3 Tam. Camisa",
      "Atleta 4 Nome", "Atleta 4 Email", "Atleta 4 CPF", "Atleta 4 Box", "Atleta 4 Tam. Camisa"
    ];

    const csvContent = [
      headers.join(","),
      ...registrations.map(reg => {
        const members = reg.team_members || [];
        const memberCols = [];
        // Support up to 4 members for CSV export
        for (let i = 0; i < 4; i++) {
          const m = members[i] || {};
          memberCols.push(
            `"${m.name || ''}"`,
            `"${m.email || ''}"`,
            `"${m.cpf || ''}"`,
            `"${m.box || ''}"`,
            `"${m.shirtSize || ''}"`
          );
        }

        return [
          reg.id,
          `"${reg.category?.name || ''}"`,
          `"${reg.team_name || reg.athlete_name || ''}"`,
          `"${reg.box_name || ''}"`,
          reg.payment_status,
          (reg.total_cents / 100).toFixed(2).replace('.', ','),
          ...memberCols
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inscricoes_${selectedChampionship?.slug || 'campeonato'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const headers = [
      "Nome Categoria (EXATO)", "Nome Time/Atleta", "Box Chamada",
      "Atleta 1 Nome", "Atleta 1 Email", "Atleta 1 CPF", "Atleta 1 Box", "Atleta 1 Tam. Camisa",
      "Atleta 2 Nome", "Atleta 2 Email", "Atleta 2 CPF", "Atleta 2 Box", "Atleta 2 Tam. Camisa",
      "Atleta 3 Nome", "Atleta 3 Email", "Atleta 3 CPF", "Atleta 3 Box", "Atleta 3 Tam. Camisa",
      "Atleta 4 Nome", "Atleta 4 Email", "Atleta 4 CPF", "Atleta 4 Box", "Atleta 4 Tam. Camisa"
    ];

    // Example row
    const example = [
      "Iniciante Masculino", "Os Fortões", "CrossFit Box",
      "João Silva", "joao@email.com", "12345678900", "CrossFit A", "M",
      "Pedro Souza", "pedro@email.com", "98765432100", "CrossFit B", "G",
      "", "", "", "", "",
      "", "", "", "", ""
    ];

    const csvContent = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_inscricoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        // Remove header and empty lines
        const dataLines = lines.slice(1).filter(line => line.trim() !== '');

        if (dataLines.length === 0) {
          toast.error("Arquivo vazio ou sem dados");
          return;
        }

        toast.info(`Processando ${dataLines.length} linhas...`);
        let successCount = 0;
        let errorCount = 0;

        // Pre-load categories for matching
        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .eq("championship_id", selectedChampionship.id);

        if (!cats || cats.length === 0) {
          toast.error("Nenhuma categoria encontrada no campeonato. Crie categorias antes de importar.");
          return;
        }

        for (const line of dataLines) {
          // Basic CSV parser logic (handling quotes simply)
          // Note: This is specific to our simple template. 
          // Complex CSVs with commas inside quotes might need a library like PapaParse, 
          // but for this MVP feature without adding deps, split is risky but workable if user follows template.
          // Replacing generic split with a regex that handles quotes is safer.
          const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          const cols = line.split(",").map(c => c.replace(/^"|"$/g, '').trim()); // Simple split fallback

          if (cols.length < 3) continue;

          const catName = cols[0];
          const teamName = cols[1];
          const boxName = cols[2];

          const category = cats.find(c => c.name.toLowerCase() === catName.toLowerCase());

          if (!category) {
            console.error(`Categoria não encontrada: ${catName}`);
            errorCount++;
            continue;
          }

          const members = [];
          // Process up to 4 members (groups of 5 columns starting at index 3)
          for (let i = 0; i < 4; i++) {
            const baseIdx = 3 + (i * 5);
            if (baseIdx >= cols.length) break;

            const name = cols[baseIdx];
            if (name && name.trim()) {
              members.push({
                name: name,
                email: cols[baseIdx + 1] || '',
                cpf: cols[baseIdx + 2] || '',
                box: cols[baseIdx + 3] || '',
                shirtSize: cols[baseIdx + 4] || 'M'
              });
            }
          }

          if (members.length === 0 && !teamName) {
            errorCount++;
            continue;
          }

          // Prepare DB object
          const athleteName = category.format === 'individual'
            ? (members[0]?.name || teamName)
            : teamName;

          const regData = {
            championship_id: selectedChampionship.id,
            category_id: category.id,
            athlete_name: athleteName,
            team_name: category.format !== 'individual' ? teamName : null,
            box_name: boxName,
            status: 'approved',
            payment_status: 'approved',
            paid_at: new Date().toISOString(),
            total_cents: category.price_cents,
            subtotal_cents: category.price_cents,
            platform_fee_cents: 0,
            team_members: members,
            athlete_email: members[0]?.email || null,
            athlete_cpf: members[0]?.cpf?.replace(/\D/g, '') || null,
            athlete_birth_date: null,
            athlete_phone: null,
            shirt_size: members[0]?.shirtSize || 'M'
          };

          const { error } = await supabase.from("registrations").insert(regData);
          if (error) {
            console.error("Erro ao inserir:", error);
            errorCount++;
          } else {
            successCount++;
          }
        }

        toast.success(`Importação finalizada! Sucessos: ${successCount}, Erros: ${errorCount}`);
        loadData();

      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
        toast.error("Erro ao ler arquivo CSV");
      }

      // Reset input
      if (event.target) event.target.value = '';
    };
    reader.readAsText(file);
  };

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
    members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
    boxName: '',
  });

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();

      // Configurar Realtime para atualizações automáticas
      const channel = supabase
        .channel(`public:registrations:championship_id=eq.${selectedChampionship.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'registrations',
            filter: `championship_id=eq.${selectedChampionship.id}`
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            // Ao detectar uma mudança, recarregamos os dados para garantir consistência
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      // Mostrar TODAS as inscrições (não apenas aprovadas) para permitir gerenciamento de pagamentos
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("championship_id", selectedChampionship.id)
        .order("order_index", { ascending: true, nullsFirst: false }) // Ordenar por order_index primeiro
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
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
        boxName: '',
      });
    } else {
      setFormData({
        teamName: '',
        members: Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' })),
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
          box: m.box || '',
        }));
      }
    }

    // Se não encontrou membros válidos, inicializar vazio baseado no formato
    if (members.length === 0) {
      const teamSize = category.team_size || (category.format === 'dupla' ? 2 : category.format === 'trio' ? 3 : category.format === 'time' ? 4 : 1);
      members = Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }));
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
    if (!confirm(`Confirmar pagamento de ${formatCurrency(reg.total_cents)} para ${reg.team_name || reg.athlete_name}?`)) {
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

  const handleSendCartRecovery = async (reg: any) => {
    if (!confirm(`Enviar email de recuperação de carrinho para ${reg.team_name || reg.athlete_name}?\n\nEmail: ${reg.athlete_email}`)) {
      return;
    }

    const toastId = toast.loading("Enviando email de recuperação...");

    try {
      const { data, error } = await supabase.functions.invoke('send-cart-recovery', {
        body: { registrationId: reg.id }
      });

      if (error) throw error;

      toast.success(`Email de recuperação enviado com sucesso!`, { id: toastId });
    } catch (error: any) {
      console.error("Error sending cart recovery email:", error);
      toast.error("Erro ao enviar email: " + error.message, { id: toastId });
    }
  };

  const handleSendPasswordRecovery = async (reg: any) => {
    if (!confirm(`Enviar email de recuperação de senha para ${reg.team_name || reg.athlete_name}?`)) {
      return;
    }

    const toastId = toast.loading("Gerando link e enviando email...");

    try {
      const { data, error } = await supabase.functions.invoke('send-password-recovery', {
        body: { registrationId: reg.id }
      });

      if (error) {
        // Handle specific error case where user is not found in auth
        if (error.message?.includes("User not found")) {
          throw new Error("Usuário não encontrado no sistema de autenticação.");
        }
        throw error;
      }

      toast.success(`Email de recuperação de senha enviado!`, { id: toastId });
    } catch (error: any) {
      console.error("Error sending password recovery email:", error);
      toast.error("Erro ao enviar: " + (error.message || "Erro desconhecido"), { id: toastId });
    }
  };

  const handleUpdatePaymentStatus = async (reg: any, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: newStatus,
          paid_at: newStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq("id", reg.id);

      if (error) throw error;

      toast.success(`Status atualizado para: ${newStatus}`);
      await loadData();
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status de pagamento");
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
          if (m.box?.trim()) member.box = m.box.trim();
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
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div className="min-w-0 w-full sm:w-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 truncate">Inscrições</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie as inscrições do campeonato</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="csvImportInput"
            onChange={handleImportCSV}
          />
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-1 sm:flex-initial text-[10px] sm:text-xs">
            📥 Modelo CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('csvImportInput')?.click()} className="flex-1 sm:flex-initial text-[10px] sm:text-xs">
            📤 Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV} className="flex-1 sm:flex-initial text-[10px] sm:text-xs">
            📄 Backup
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setEditingRegistration(null);
            setFormData({
              teamName: '',
              members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
              boxName: '',
            });
          }
        }}>
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
                  <Label htmlFor="boxName">Box para Chamada *</Label>
                  <Input
                    id="boxName"
                    value={formData.boxName}
                    onChange={(e) => setFormData({ ...formData, boxName: e.target.value })}
                    placeholder="Ex: CrossFit SP (Nome do Box Principal)"
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
                          <Label>Box do Atleta</Label>
                          <Input
                            value={member.box}
                            onChange={(e) => updateMember(index, 'box', e.target.value)}
                            placeholder="Box onde treina (opcional)"
                            required={false}
                          />
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
                ? "Clique no botão flutuante no canto inferior direito para criar uma nova inscrição."
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
                    onSendCartRecovery={() => handleSendCartRecovery(reg)}
                    onSendPasswordRecovery={() => handleSendPasswordRecovery(reg)}
                    onUpdatePaymentStatus={(status) => handleUpdatePaymentStatus(reg, status)}
                    isExpanded={expandedMembers.has(reg.id)}
                    onToggleExpand={() => toggleMembersExpanded(reg.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setSelectedCategory(null);
          setEditingRegistration(null);
          setFormData({
            teamName: '',
            members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
            boxName: '',
          });
          setIsDialogOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
        aria-label="Nova inscrição"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
