import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users, Trophy, Calendar, MapPin, QrCode } from "lucide-react";

type PublicRegistrationMember = {
  name: string;
  email: string;
  whatsapp: string;
  shirtSize: string;
};

export default function PublicRegistration() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [championship, setChampionship] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [members, setMembers] = useState<PublicRegistrationMember[]>([
    { name: "", email: "", whatsapp: "", shirtSize: "M" },
  ]);
  const [teamName, setTeamName] = useState("");
  const [athletePhone, setAthletePhone] = useState("");

  useEffect(() => {
    loadChampionship();
  }, [slug]);

  const loadChampionship = async () => {
    try {
      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (champError) {
        console.error("Erro ao buscar campeonato:", champError);
        toast.error("Erro ao carregar campeonato");
        return;
      }

      if (!champ) {
        toast.error("Campeonato não encontrado");
        return;
      }

      setChampionship(champ);

      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", champ.id)
        .order("order_index", { ascending: true, nullsFirst: true });

      if (catsError) throw catsError;
      setCategories(cats);
    } catch (error: any) {
      toast.error("Erro ao carregar campeonato");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const computeTeamSize = (category: any) => {
    if (!category) return 1;
    if (category.team_size && category.team_size > 0) return category.team_size;
    switch (category.format) {
      case "dupla":
      case "duo":
        return 2;
      case "trio":
        return 3;
      case "time":
      case "team":
        return 4;
      default:
        return 1;
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    setSelectedCategory(category);
    const teamSize = computeTeamSize(category);
    const defaultMember: PublicRegistrationMember = {
      name: "",
      email: "",
      whatsapp: "",
      shirtSize: "M",
    };

    setMembers((prev) => {
      const next = Array(teamSize)
        .fill(null)
        .map((_, index) => prev[index] ?? { ...defaultMember });
      return next;
    });
    setTeamName("");
    setAthletePhone("");
  };

  const updateMember = (index: number, field: keyof PublicRegistrationMember, value: string) => {
    setMembers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, [field]: value } : member))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      toast.error("Selecione uma categoria");
      return;
    }

    if (selectedCategory.format !== "individual" && !teamName.trim()) {
      toast.error("Digite o nome do time");
      return;
    }

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!member.name.trim()) {
        toast.error(`Digite o nome completo do ${selectedCategory.format === "individual" ? "atleta" : `integrante ${i + 1}`}`);
        return;
      }
      if (!member.email.trim()) {
        toast.error(`Digite o email do ${selectedCategory.format === "individual" ? "atleta" : `integrante ${i + 1}`}`);
        return;
      }
      if (!member.whatsapp.trim()) {
        toast.error(`Digite o WhatsApp do ${selectedCategory.format === "individual" ? "atleta" : `integrante ${i + 1}`}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const platformFeeCents = Math.round(selectedCategory.price_cents * 0.05);
      const totalCents = selectedCategory.price_cents + platformFeeCents;

      const registrationData: any = {
        championship_id: championship.id,
        category_id: selectedCategory.id,
        athlete_name:
          selectedCategory.format === "individual" ? members[0]?.name ?? "" : teamName,
        athlete_email: members[0]?.email ?? "",
        athlete_phone: members[0]?.whatsapp || athletePhone || null,
        team_name: selectedCategory.format !== "individual" ? teamName : null,
        subtotal_cents: selectedCategory.price_cents,
        platform_fee_cents: platformFeeCents,
        total_cents: totalCents,
        status: "pending",
        payment_status: "pending",
        team_members:
          selectedCategory.format !== "individual"
            ? members.map((member) => ({
                name: member.name,
                email: member.email,
                whatsapp: member.whatsapp,
                shirtSize: member.shirtSize || "M",
              }))
            : null,
        shirt_size:
          selectedCategory.format === "individual" ? members[0]?.shirtSize || "M" : null,
      };

      const { data: registration, error } = await supabase
        .from("registrations")
        .insert(registrationData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Inscrição criada! Redirecionando para pagamento...");
      navigate(`/checkout/${registration.id}?method=pix`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar inscrição");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Campeonato não encontrado</CardTitle>
            <CardDescription>O campeonato que você está procurando não existe.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const calculateTotal = () => {
    if (!selectedCategory) return { subtotal: 0, fee: 0, total: 0 };
    const fee = Math.round(selectedCategory.price_cents * 0.05);
    return {
      subtotal: selectedCategory.price_cents,
      fee,
      total: selectedCategory.price_cents + fee,
    };
  };

  const totals = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Championship Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{championship.name}</CardTitle>
                <CardDescription className="text-base">
                  {championship.description}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Inscrições Abertas
              </Badge>
            </div>
            <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(championship.date).toLocaleDateString("pt-BR")}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {championship.location}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Inscrição</CardTitle>
              <CardDescription>Preencha seus dados para se inscrever</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={selectedCategory?.id} onValueChange={handleSelectCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => {
                        const formatLabel = cat.format === 'individual' ? 'Individual' : 
                                          cat.format === 'duo' ? 'Dupla' :
                                          cat.format === 'trio' ? 'Trio' :
                                          cat.format === 'team' ? 'Time' : cat.format || 'Individual';
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} - {formatLabel} ({cat.gender || 'Misto'}) - {formatPrice(cat.price_cents || 0)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && selectedCategory.format !== "individual" && (
                  <div className="space-y-2">
                    <Label htmlFor="team">Nome do Time *</Label>
                    <Input
                      id="team"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Digite o nome do seu time"
                      required={selectedCategory.format !== "individual"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Para categorias em equipe, o nome do time é obrigatório
                    </p>
                  </div>
                )}

                {selectedCategory && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>Integrantes</Label>
                      <p className="text-xs text-muted-foreground">
                        Informe os dados de cada integrante. Esses dados aparecerão nas planilhas
                        internas e ajudam na organização do evento.
                      </p>
                    </div>
                    {members.map((member, index) => (
                      <Card key={`member-${index}`} className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Integrante {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Nome Completo *</Label>
                            <Input
                              value={member.name}
                              onChange={(e) => updateMember(index, "name", e.target.value)}
                              placeholder="Nome completo"
                              required
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Email *</Label>
                              <Input
                                type="email"
                                value={member.email}
                                onChange={(e) => updateMember(index, "email", e.target.value)}
                                placeholder="email@exemplo.com"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>WhatsApp *</Label>
                              <Input
                                value={member.whatsapp}
                                onChange={(e) => updateMember(index, "whatsapp", e.target.value)}
                                placeholder="(11) 99999-9999"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Tamanho da Camisa *</Label>
                            <Select
                              value={member.shirtSize || "M"}
                              onValueChange={(value) => updateMember(index, "shirtSize", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tamanho" />
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone de Contato</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={athletePhone}
                    onChange={(e) => setAthletePhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting || !selectedCategory}
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Continuar para Pagamento"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCategory ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Categoria:</span>
                        <span className="font-medium">{selectedCategory.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Formato:</span>
                        <span className="font-medium">{selectedCategory.format}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gênero:</span>
                        <span className="font-medium">{selectedCategory.gender}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatPrice(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa de serviço (5%)</span>
                        <span className="text-muted-foreground">{formatPrice(totals.fee)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total</span>
                        <span>{formatPrice(totals.total)}</span>
                      </div>
                    </div>

                    {championship?.pix_payload ? (
                      <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <QrCode className="w-4 h-4 text-primary" />
                          Pagamento via PIX do Organizador
                        </div>
                        <p>
                          Após finalizar o formulário, exibiremos o QR Code e o código “copia e cola” do
                          organizador para você pagar na hora. Guarde o comprovante para enviar em caso de
                          solicitação.
                        </p>
                      </div>
                    ) : (
                      <div className="border-t pt-4 text-sm text-muted-foreground">
                        O organizador ainda não informou a chave PIX. Você receberá instruções após concluir
                        a inscrição.
                      </div>
                    )}

                    {selectedCategory.format !== "individual" && (
                      <div className="border-t pt-4 space-y-2 text-sm">
                        <span className="font-semibold text-muted-foreground">Integrantes:</span>
                        <ul className="space-y-1">
                          {members.map((member, index) => (
                            <li key={`member-summary-${index}`} className="flex justify-between">
                              <span>{member.name || `Integrante ${index + 1}`}</span>
                              <span className="text-muted-foreground">
                                {member.shirtSize || "M"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selecione uma categoria para ver o resumo
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <Trophy className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Sua vaga será garantida após confirmação do pagamento</p>
                </div>
                <div className="flex gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Vagas limitadas por categoria</p>
                </div>
                <div className="flex gap-2">
                  <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {championship?.pix_payload
                      ? "Pagamento exclusivo via PIX (chave do organizador)"
                      : "Pagamento por PIX — instruções serão enviadas após a inscrição"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}