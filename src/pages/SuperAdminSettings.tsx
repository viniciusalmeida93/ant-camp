import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SuperAdminSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
                <p className="text-sm text-muted-foreground">
                    Ajustes gerais da plataforma AntCamp.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Identidade Visual</CardTitle>
                    <CardDescription>
                        Personalize a aparência do painel administrativo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="systemName">Nome do Sistema</Label>
                        <Input type="text" id="systemName" placeholder="AntCamp" disabled />
                        <p className="text-xs text-muted-foreground">Alteração desabilitada no momento.</p>
                    </div>

                    <Button disabled variant="secondary">Salvar Alterações</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Versão</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Versão Atual: 1.0.0 (Beta)</p>
                </CardContent>
            </Card>
        </div>
    );
}
