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
import { Loader2, Users, Trophy, Calendar, MapPin } from "lucide-react";

export default function PublicRegistration() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [championship, setChampionship] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  const [athleteName, setAthleteName] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [teamName, setTeamName] = useState("");

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
        .eq("championship_id", champ.id);

      if (catsError) throw catsError;
      setCategories(cats);
    } catch (error: any) {
      toast.error("Erro ao carregar campeonato");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      toast.error("Selecione uma categoria");
      return;
    }

    // Validações
    if (!athleteName.trim()) {
      toast.error("Digite o nome completo");
      return;
    }

    if (!athleteEmail.trim()) {
      toast.error("Digite o email");
      return;
    }

    if (selectedCategory.format !== "individual" && !teamName.trim()) {
      toast.error("Digite o nome do time");
      return;
    }

    setSubmitting(true);

    try {
      const platformFeeCents = Math.round(selectedCategory.price_cents * 0.05);
      const totalCents = selectedCategory.price_cents + platformFeeCents;

      const registrationData: any = {
        championship_id: championship.id,
        category_id: selectedCategory.id,
        athlete_name: selectedCategory.format === "individual" ? athleteName : null,
        athlete_email: athleteEmail,
        athlete_phone: athletePhone || null,
        team_name: selectedCategory.format !== "individual" ? teamName : null,
        subtotal_cents: selectedCategory.price_cents,
        platform_fee_cents: platformFeeCents,
        total_cents: totalCents,
        status: "pending",
        payment_status: "pending",
      };

      const { data: registration, error } = await supabase
        .from("registrations")
        .insert(registrationData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Inscrição criada! Redirecionando para pagamento...");
      navigate(`/checkout/${registration.id}`);
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
                  <Select
                    value={selectedCategory?.id}
                    onValueChange={(value) => {
                      const cat = categories.find((c) => c.id === value);
                      setSelectedCategory(cat);
                    }}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={athleteEmail}
                    onChange={(e) => setAthleteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={athletePhone}
                    onChange={(e) => setAthletePhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
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
                  <p>Pagamento via PIX, cartão ou boleto</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}