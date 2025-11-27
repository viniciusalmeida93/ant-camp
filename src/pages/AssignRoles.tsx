import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function AssignRoles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userEmail: "",
    role: "admin" as "admin" | "super_admin",
  });

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userEmail.trim()) {
      toast.error("Digite o email do usuário");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-user-roles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            userEmail: formData.userEmail.trim(),
            role: formData.role,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          // Se não for JSON, usar o texto como está
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.success(data.message || "Role atribuído com sucesso!");
      setFormData({ userEmail: "", role: "admin" });
    } catch (error: any) {
      console.error("Erro ao atribuir role:", error);
      toast.error("Erro ao atribuir role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Atribuir Roles de Usuário</h1>
              <p className="text-sm text-muted-foreground">
                Atribua roles de admin ou super_admin para usuários
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Atribuir Role
            </CardTitle>
            <CardDescription>
              Configure os roles dos usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssignRole} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email do Usuário *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                  placeholder="usuario@exemplo.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Digite o email do usuário que receberá o role
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as "admin" | "super_admin" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <strong>Super Admin:</strong> Acesso total ao sistema (vinicius@antsports.com.br)<br />
                  <strong>Admin:</strong> Acesso administrativo (vinicius.almeidaa93@gmail.com)
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atribuindo...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Atribuir Role
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Usuários Padrão:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><strong>Super Admin:</strong> vinicius@antsports.com.br</li>
                <li><strong>Admin:</strong> vinicius.almeidaa93@gmail.com</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

