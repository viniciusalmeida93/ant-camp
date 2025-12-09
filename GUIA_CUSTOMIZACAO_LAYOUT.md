# 🛠️ Guia de Customização do Layout

## Como Customizar o Layout do Sistema

Este guia mostra como você pode customizar e estender o novo layout baseado no shadcn/ui.

## 📝 Índice
1. [Adicionar Novos Itens de Navegação](#adicionar-novos-itens)
2. [Criar Submenus](#criar-submenus)
3. [Customizar Cores e Temas](#customizar-cores)
4. [Adicionar Badges e Notificações](#badges-notificacoes)
5. [Implementar Dark Mode](#dark-mode)
6. [Customizar Breadcrumbs](#breadcrumbs)
7. [Adicionar Ações Rápidas](#acoes-rapidas)

---

## 1. Adicionar Novos Itens de Navegação {#adicionar-novos-itens}

### Passo 1: Adicione o item no array `navItems`

Arquivo: `src/components/layout/AppLayout.tsx`

```tsx
const navItems = [
  // ... itens existentes
  { 
    path: '/nova-funcionalidade', 
    label: 'Nova Funcionalidade', 
    icon: Sparkles, // Importe de lucide-react
    category: 'configuração' // ou 'principal' ou 'execução'
  },
];
```

### Passo 2: Crie a rota no App.tsx

```tsx
<Route 
  path="/nova-funcionalidade" 
  element={<AppLayout><NovaFuncionalidade /></AppLayout>} 
/>
```

### Exemplo Completo:

```tsx
// 1. Importe o ícone
import { Sparkles } from 'lucide-react';

// 2. Adicione no navItems
const navItems = [
  // ... outros itens
  { 
    path: '/analytics', 
    label: 'Analytics', 
    icon: Sparkles,
    category: 'execução'
  },
];

// 3. Em App.tsx
<Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
```

---

## 2. Criar Submenus {#criar-submenus}

Para criar submenus (navegação hierárquica), modifique a estrutura:

```tsx
// Estrutura de dados atualizada
const navItems = [
  { 
    path: '/configuracoes', 
    label: 'Configurações', 
    icon: Settings,
    category: 'configuração',
    children: [
      { path: '/configuracoes/geral', label: 'Geral', icon: Sliders },
      { path: '/configuracoes/usuarios', label: 'Usuários', icon: Users },
      { path: '/configuracoes/integracao', label: 'Integrações', icon: Plug },
    ]
  },
];

// Renderização com submenu
{navItems.map((item) => {
  const Icon = item.icon;
  const isActive = location.pathname === item.path;
  
  return (
    <SidebarMenuItem key={item.path}>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link to={item.path}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      
      {item.children && (
        <SidebarMenuSub>
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <SidebarMenuSubItem key={child.path}>
                <SidebarMenuSubButton asChild>
                  <Link to={child.path}>
                    <ChildIcon />
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
})}
```

---

## 3. Customizar Cores e Temas {#customizar-cores}

### Mudar Cor Primária

Arquivo: `src/index.css`

```css
:root {
  --primary: 220 90% 56%; /* Azul */
  --primary-foreground: 0 0% 100%;
  
  --sidebar-primary: 220 90% 56%;
  --sidebar-primary-foreground: 0 0% 100%;
}
```

### Cores Sugeridas:

```css
/* Azul Moderno */
--primary: 217 91% 60%;

/* Verde Sucesso */
--primary: 142 76% 36%;

/* Roxo Premium */
--primary: 262 83% 58%;

/* Laranja Energético */
--primary: 25 95% 53%;

/* Rosa Vibrante */
--primary: 330 81% 60%;
```

---

## 4. Adicionar Badges e Notificações {#badges-notificacoes}

### Badge de Contador

```tsx
import { SidebarMenuBadge } from '@/components/ui/sidebar';

<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={isActive}>
    <Link to="/inscricoes">
      <ClipboardList />
      <span>Inscrições</span>
    </Link>
  </SidebarMenuButton>
  <SidebarMenuBadge>12</SidebarMenuBadge> {/* ← Novo! */}
</SidebarMenuItem>
```

### Badge de Status

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link to="/heats">
      <Grid />
      <span>Baterias</span>
      <Badge variant="destructive" className="ml-auto">Ao Vivo</Badge>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### Indicador de Notificação (Dot)

```tsx
<SidebarMenuItem className="relative">
  <SidebarMenuButton asChild>
    <Link to="/resultados">
      <Award />
      <span>Resultados</span>
    </Link>
  </SidebarMenuButton>
  {hasNewResults && (
    <span className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full" />
  )}
</SidebarMenuItem>
```

---

## 5. Implementar Dark Mode {#dark-mode}

### Passo 1: Adicionar Provider de Tema

```tsx
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'system',
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Passo 2: Adicionar Toggle no Menu

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
      {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
    </DropdownMenuItem>
  );
}
```

---

## 6. Customizar Breadcrumbs {#breadcrumbs}

### Breadcrumbs Dinâmicos com Parâmetros

```tsx
function AppHeader() {
  const location = useLocation();
  const params = useParams();
  
  const getBreadcrumbs = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', path: '/app' }];
    
    // Exemplo: /categories/123/edit
    if (segments[0] === 'categories') {
      breadcrumbs.push({ label: 'Categorias', path: '/categories' });
      
      if (segments[1]) {
        const categoryName = getCategoryName(segments[1]); // função auxiliar
        breadcrumbs.push({ 
          label: categoryName, 
          path: `/categories/${segments[1]}` 
        });
      }
      
      if (segments[2] === 'edit') {
        breadcrumbs.push({ label: 'Editar', path: location.pathname });
      }
    }
    
    return breadcrumbs;
  };
  
  // ... resto do componente
}
```

### Breadcrumbs com Ícones

```tsx
<BreadcrumbItem>
  <BreadcrumbLink asChild>
    <Link to="/categories" className="flex items-center gap-2">
      <Users className="w-4 h-4" />
      Categorias
    </Link>
  </BreadcrumbLink>
</BreadcrumbItem>
```

---

## 7. Adicionar Ações Rápidas {#acoes-rapidas}

### Quick Actions no Header

```tsx
function AppHeader() {
  const { selectedChampionship } = useChampionship();
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Breadcrumbs */}
      <Breadcrumb className="flex-1">
        {/* ... */}
      </Breadcrumb>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/bulk-import">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Link>
        </Button>
        
        <Button variant="default" size="sm" asChild>
          <Link to="/registrations">
            <Plus className="w-4 h-4 mr-2" />
            Nova Inscrição
          </Link>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <p className="font-medium">Nova inscrição</p>
                <p className="text-xs text-muted-foreground">João Silva se inscreveu na categoria RX</p>
              </div>
            </DropdownMenuItem>
            {/* ... mais notificações */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### Command Palette (Busca Global)

```tsx
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

function CommandPalette() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => navigate('/categories')}>
            <Users className="mr-2 h-4 w-4" />
            Categorias
          </CommandItem>
          <CommandItem onSelect={() => navigate('/wods')}>
            <Dumbbell className="mr-2 h-4 w-4" />
            WODs
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Ações">
          <CommandItem onSelect={() => navigate('/bulk-import')}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Dados
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

## 🎨 Customizações Avançadas

### Sidebar com Gradiente

```css
/* src/index.css */
.sidebar-gradient {
  background: linear-gradient(180deg, 
    hsl(var(--sidebar-background)) 0%, 
    hsl(var(--sidebar-background) / 0.8) 100%
  );
  backdrop-filter: blur(10px);
}
```

### Animações Personalizadas

```tsx
<SidebarMenuItem 
  className="transition-all duration-300 hover:scale-105 hover:translate-x-1"
>
  {/* ... */}
</SidebarMenuItem>
```

### Sidebar com Imagem de Fundo

```tsx
<Sidebar className="bg-cover bg-center" style={{
  backgroundImage: 'url(/sidebar-bg.jpg)',
  backgroundBlendMode: 'overlay',
}}>
  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
  <div className="relative z-10">
    {/* Conteúdo da sidebar */}
  </div>
</Sidebar>
```

---

## 📦 Componentes Reutilizáveis

### NavGroup Component

```tsx
interface NavGroupProps {
  label: string;
  items: NavItem[];
}

function NavGroup({ label, items }: NavGroupProps) {
  const location = useLocation();
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <Link to={item.path}>
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
```

---

## 🚀 Próximos Passos Sugeridos

1. **Analytics Integration**: Adicionar tracking de navegação
2. **Keyboard Shortcuts**: Implementar atalhos para ações comuns
3. **Customizable Layout**: Permitir usuário escolher layout
4. **Multi-idioma**: Suporte a português e inglês
5. **Accessibility**: Melhorar ARIA labels e keyboard navigation

---

**Documentação completa**: Este guia cobre 90% dos casos de uso. Para casos avançados, consulte a [documentação oficial do shadcn/ui](https://ui.shadcn.com/).
