# 🎨 AntCamp — Design System & Guia de Estilo

> Referência visual do AntCamp. Ao desenvolver novas telas, seguir este guia para garantir consistência em todo o sistema.

---

## Base de Componentes
- Todos os componentes de UI devem usar **shadcn/ui** como base
- Não criar componentes visuais do zero — sempre usar ou adaptar os componentes do shadcn
- As cores padrão do shadcn são substituídas pelas variáveis CSS customizadas do AntCamp definidas abaixo
- O sistema usa **exclusivamente dark mode**
- **Fonte padrão:** `Inter` — herdada do shadcn/ui. Aplicar em todos os componentes, incluindo templates de e-mail

---

## Cores — Variáveis CSS (Design Tokens)

### Background & Surface
| Token Tailwind | Variável CSS | Hex |
|---|---|---|
| `bg-background` | `--background` | `#001D2E` |
| `bg-card` | `--card` | `#002438` |
| `bg-popover` | `--popover` | `#002438` |
| `bg-sidebar` | `--sidebar-background` | `#00273D` |

### Texto
| Token Tailwind | Variável CSS | Hex |
|---|---|---|
| `text-foreground` | `--foreground` | `#FAFAFA` |
| `text-muted-foreground` | `--muted-foreground` | `#B3B3B3` |

### Primary (Vermelho da marca)
| Token Tailwind            | Variável CSS           | Hex       |
| ------------------------- | ---------------------- | --------- |
| `bg-primary`              | `--primary`            | `#D41C1D` |
| `text-primary-foreground` | `--primary-foreground` | `#FDEAEA` |

### Secondary & Accent
| Token Tailwind | Variável CSS | Hex |
|---|---|---|
| `bg-secondary` | `--secondary` | `#004D73` |
| `bg-accent` | `--accent` | `#004D73` |
| `bg-muted` | `--muted` | `#005580` |

### Bordas & Input
| Token Tailwind | Variável CSS | Hex |
|---|---|---|
| `border-border` | `--border` | `#006699` |

---

## Gradientes & Sombras
| Variável CSS | Valor |
|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #EA1C1C, #992E00)` |
| `--gradient-card` | `linear-gradient(135deg, #002438, #001D2E)` |
| `--shadow-premium` | Glow vermelho: `0 10px 40px -12px hsl(359 76% 47% / 0.4)` |

---

## Cores do Leaderboard (Hardcoded — Top 3)
| Posição | Cor | Hex |
|---|---|---|
| 1º lugar | Verde neon | `#00FF1E` |
| 2º lugar | Ciano neon | `#00F2FF` |
| 3º lugar | Amarelo neon | `#EEFF00` |

---

## Badges de Status

### Status Gerais do Sistema
| Status | Cor | Uso |
|---|---|---|
| Publicado / Aprovado / Ativo | Verde | Geral |
| Rascunho / Inativo | Cinza | Geral |
| Cortesia | Amarelo | Inscrições |
| Nome de bateria | Vermelho | Baterias |

### Status de Inscrição (Página de Inscrições)
| Status | Cor |
|---|---|
| Aprovado | Verde |
| Processando | Laranja |
| Pendente | Amarelo |
| Cancelar | Vermelho |

---

## Dívida Técnica de Estilo ⚠️
- A maioria dos botões, FABs e itens de sidebar usa cores **hardcoded** (`bg-[#D71C1D]` e variantes) ao invés de `bg-primary`
- Backgrounds de sidebar/header usam valores fixos (`#051C2C`, `#0f172a`) ao invés das variáveis CSS
- Há divergência entre `:root` e `.dark` nos tokens `--secondary`, `--muted`, `--accent`, `--border`, `--input`
- **Ação recomendada:** unificar todas as cores hardcoded para usar os tokens do design system — ver roadmap item 21
