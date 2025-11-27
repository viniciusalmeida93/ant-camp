import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { bulkImportData } from '@/utils/bulkImport';

export default function BulkImport() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [importing, setImporting] = useState(false);
  const [rawData, setRawData] = useState('');

  const parseData = (text: string) => {
    const teams: any[] = [];
    const individuals: any[] = [];
    const wods: any[] = [];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentCategory: any = null;
    let currentTeam: any = null;
    let currentWOD: any = null;
    let inWODSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detectar categoria (com ou sem emoji)
      if (line.includes('Categoria')) {
        inWODSection = false;
        // Finalizar time anterior se houver
        if (currentTeam && currentTeam.members.length > 0) {
          teams.push(currentTeam);
          currentTeam = null;
        }
        
        // Remove emojis e processa
        const cleanLine = line.replace(/[🧍‍♀️🧍‍♂️]/g, '').trim();
        const match = cleanLine.match(/Categoria (.+?)\s*\((.+?)\)/);
        if (match) {
          const [, categoryName, categoryInfo] = match;
          const formatMatch = categoryInfo.match(/(Trio|Dupla|Individual|Time)/i);
          const genderMatch = categoryInfo.match(/(Feminino|Masculino|Misto)/i);
          
          let format = 'individual';
          if (formatMatch) {
            const fmt = formatMatch[1].toLowerCase();
            if (fmt === 'trio') format = 'trio';
            else if (fmt === 'dupla') format = 'dupla';
            else if (fmt === 'time') format = 'time';
            else format = 'individual';
          }
          
          currentCategory = {
            name: categoryName.trim(),
            format: format,
            gender: genderMatch ? genderMatch[1].toLowerCase() : 'masculino',
          };
          currentTeam = null;
        }
        continue;
      }

      // Detectar WODs
      if (line.includes('WODs') || line.includes('🧩') || (line.includes('WOD') && line.includes('Oficiais'))) {
        inWODSection = true;
        currentWOD = null;
        continue;
      }

      if (inWODSection) {
        // Detectar nome do WOD
        if (line.match(/WOD \d+ –/)) {
          const match = line.match(/WOD \d+ – "(.+?)"/);
          if (match) {
            // Finalizar WOD anterior se houver
            if (currentWOD && currentWOD.description) {
              wods.push(currentWOD);
            }
            currentWOD = {
              name: match[1],
              description: '',
              time_cap: null,
              notes: null,
            };
          }
        } else if (currentWOD && line && !line.match(/WOD \d+ –/)) {
          // Adicionar à descrição do WOD
          if (currentWOD.description) {
            currentWOD.description += '\n' + line;
          } else {
            currentWOD.description = line;
          }
          
          // Detectar time cap
          if (line.includes('cap') || line.includes('Cap')) {
            const capMatch = line.match(/(\d+)\s*(min|minutos?)/i);
            if (capMatch) {
              currentWOD.time_cap = `${capMatch[1]} minutos`;
            }
          }
        }
        continue;
      }

      // Detectar time
      if (line.match(/^(Trio|Dupla|Time) \d+ –/)) {
        // Finalizar time anterior se houver
        if (currentTeam && currentTeam.members.length > 0) {
          teams.push(currentTeam);
        }
        
        const match = line.match(/(Trio|Dupla|Time) \d+ – (.+)/);
        if (match && currentCategory) {
          currentTeam = {
            name: match[2].trim(),
            members: [],
            categoryName: currentCategory.name,
            categoryFormat: currentCategory.format,
            categoryGender: currentCategory.gender,
          };
        }
        continue;
      }

      // Detectar membro do time ou atleta individual
      if (line.includes('|')) {
        // Processar linha que pode ter múltiplas linhas (quebras)
        const fullLine = line;
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        
        // Se a próxima linha também tem |, pode ser continuação
        let completeLine = fullLine;
        if (nextLine && nextLine.includes('|') && !nextLine.match(/^(Trio|Dupla|Time) \d+ –/)) {
          completeLine = fullLine + ' ' + nextLine;
          i++; // Pular próxima linha
        }
        
        const parts = completeLine.split('|').map(p => p.trim()).filter(p => p);
        const name = parts[0] || '';
        
        // Extrair informações de forma mais robusta
        let cpf = '';
        let email = '';
        let whatsapp = '';
        let box = '';
        
        const fullText = completeLine;
        
        // Extrair CPF
        const cpfMatch = fullText.match(/CPF:\s*([\d\.\-]+)/i);
        if (cpfMatch) cpf = cpfMatch[1].trim();
        
        // Extrair Email
        const emailMatch = fullText.match(/Email:\s*([^\s|]+@[^\s|]+)/i);
        if (emailMatch) email = emailMatch[1].trim();
        
        // Extrair WhatsApp
        const whatsappMatch = fullText.match(/WhatsApp:\s*(\(?\d{2}\)?\s*\d{4,5}[\s\-]?\d{4})/i);
        if (whatsappMatch) whatsapp = whatsappMatch[1].trim();
        
        // Extrair Box
        const boxMatch = fullText.match(/Box:\s*([^|]+)/i);
        if (boxMatch) box = boxMatch[1].trim();

        if (name && email && whatsapp) {
          if (currentTeam) {
            currentTeam.members.push({
              name,
              email,
              whatsapp,
              cpf,
              box,
            });
          } else if (currentCategory && currentCategory.format === 'individual') {
            individuals.push({
              name,
              email,
              whatsapp,
              cpf,
              box,
              categoryName: currentCategory.name,
              categoryFormat: currentCategory.format,
              categoryGender: currentCategory.gender,
            });
          }
        }
      }

      // Finalizar time quando encontrar próxima categoria ou time
      if (currentTeam && currentTeam.members.length > 0) {
        if (i === lines.length - 1 || 
            lines[i + 1]?.match(/^(Trio|Dupla|Time) \d+ –/) ||
            (lines[i + 1]?.includes('Categoria') && !lines[i + 1]?.includes('WOD'))) {
          teams.push(currentTeam);
          currentTeam = null;
        }
      }
    }

    // Adicionar último time se houver
    if (currentTeam && currentTeam.members.length > 0) {
      teams.push(currentTeam);
    }

    // Adicionar último WOD se houver
    if (currentWOD && currentWOD.description) {
      wods.push(currentWOD);
    }

    return { teams, individuals, wods };
  };

  const handleImport = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato primeiro");
      navigate("/app");
      return;
    }

    if (!rawData.trim()) {
      toast.error("Cole os dados para importar");
      return;
    }

    setImporting(true);
    try {
      const { teams, individuals, wods } = parseData(rawData);
      
      console.log('Parsed data:', { teams, individuals, wods });
      
      if (teams.length === 0 && individuals.length === 0 && wods.length === 0) {
        toast.error("Nenhum dado válido encontrado. Verifique o formato dos dados.");
        setImporting(false);
        return;
      }
      
      await bulkImportData(selectedChampionship.id, teams, individuals, wods);
      
      toast.success(`Importação concluída! ${teams.length} times, ${individuals.length} atletas individuais e ${wods.length} WODs criados.`);
      setRawData('');
      
      // Recarregar dados do contexto
      setTimeout(() => {
        navigate("/app");
      }, 1000);
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error("Erro ao importar dados");
    } finally {
      setImporting(false);
    }
  };

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Importação em Massa</h1>
        <p className="text-muted-foreground">
          Cole os dados dos atletas, times e WODs para importar tudo de uma vez
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados para Importar</CardTitle>
          <CardDescription>
            Cole o texto completo com categorias, atletas, times e WODs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="data">Dados (formato do texto fornecido)</Label>
            <Textarea
              id="data"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="Cole aqui os dados..."
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          <Button 
            onClick={handleImport} 
            className="w-full" 
            disabled={importing || !rawData.trim()}
            size="lg"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Importar Dados
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

