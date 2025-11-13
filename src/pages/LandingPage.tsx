import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Users, Trophy, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <span className="text-sm sm:text-base font-semibold">CrossFit Competition</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" asChild className="sm:hidden">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/setup">Checklist</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-24 md:pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4 px-3 sm:px-4 py-1 text-xs sm:text-sm">
            <Zap className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Plataforma Profissional de Gestão de Campeonatos</span>
            <span className="sm:hidden">Gestão de Campeonatos</span>
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent px-2">
            Gerencie Campeonatos de CrossFit com Excelência
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Lance resultados, gere baterias automáticas e compartilhe leaderboards em tempo real. 
            Tudo em uma plataforma profissional e fácil de usar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button size="lg" asChild className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <Link to="/setup">Ver Checklist de Produção</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground mt-4 px-4">
            Sem necessidade de cartão de crédito • Teste grátis por 14 dias
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Como Funciona</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Simples, rápido e profissional</p>
        </div>
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <Card className="border-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>1. Crie o Campeonato</CardTitle>
              <CardDescription>
                Configure categorias, WODs, sistema de pontuação e valores de inscrição em minutos.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>2. Lance Resultados</CardTitle>
              <CardDescription>
                Adicione resultados facilmente e veja as baterias se reorganizarem automaticamente.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>3. Publique o Link</CardTitle>
              <CardDescription>
                Compartilhe o leaderboard público com atletas e espectadores em tempo real.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Recursos Premium</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Tudo que você precisa em uma única plataforma</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {[
            "Baterias automáticas por ranking",
            "Leaderboard em tempo real",
            "Múltiplos sistemas de pontuação",
            "Links públicos sem login",
            "Modo TV para telões",
            "Gestão de inscrições e pagamentos",
            "Exportação CSV/PDF",
            "Controle de capacidade",
            "Fila de espera automática",
            "Histórico de alterações",
            "Suporte a categorias customizadas",
            "Dashboard analítico",
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Planos Flexíveis</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">Escolha o melhor plano para você</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <CardDescription>Perfeito para começar</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 49</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["1 campeonato ativo", "Até 100 atletas", "Baterias automáticas", "Leaderboard público"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" variant="outline" asChild>
                <Link to="/auth">Começar</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-primary border-2 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>
            <CardHeader>
              <CardTitle>Professional</CardTitle>
              <CardDescription>Para boxes e organizadores</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 149</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["Campeonatos ilimitados", "Atletas ilimitados", "Todos os recursos", "Suporte prioritário"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" asChild>
                <Link to="/auth">Começar</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pay Per Event</CardTitle>
              <CardDescription>Pague apenas quando usar</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 99</span>
                <span className="text-muted-foreground">/evento</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["Sem mensalidade", "Até 200 atletas", "Todos os recursos", "30 dias de acesso"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6" variant="outline" asChild>
                <Link to="/auth">Começar</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Pagamento Seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Dados Criptografados</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Suporte em Português</span>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-2 border-primary/20">
          <CardContent className="p-6 sm:p-8 md:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Pronto para Revolucionar seus Campeonatos?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
              Junte-se a centenas de organizadores que confiam na nossa plataforma
            </p>
            <Button size="lg" asChild className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              <Link to="/auth">Criar Conta Grátis</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="font-bold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/pricing">Preços</Link></li>
                <li><Link to="/features">Recursos</Link></li>
                <li><Link to="/docs">Documentação</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about">Sobre</Link></li>
                <li><Link to="/contact">Contato</Link></li>
                <li><Link to="/careers">Carreiras</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms">Termos de Uso</Link></li>
                <li><Link to="/privacy">Privacidade</Link></li>
                <li><Link to="/cookies">Cookies</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help">Central de Ajuda</Link></li>
                <li><Link to="/faq">FAQ</Link></li>
                <li><Link to="/contact">Fale Conosco</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 CrossFit Championship Manager. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}