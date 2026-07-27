"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProfileDialog } from "./profile-dialog"
import {
    LogOut,
    User as UserIcon,
    Settings,
    FileText,
    CheckSquare,
    DollarSign,
    BarChart,
    Receipt,
    Wallet,
    Grid,
    Landmark,
    Zap,
    ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TopNavProps {
    user: { name?: string | null, role?: string, avatarUrl?: string | null, cargo?: string | null }
    logoUrl?: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

interface NavItem {
    label: string
    href: string
    icon: any
    description?: string
}

interface NavGroup {
    title: string
    color: "cyan" | "indigo" | "emerald"
    items: NavItem[]
}

export function TopNav({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: TopNavProps) {
    const pathname = usePathname()
    const role = user.role || ""
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null)
    const [openGroup, setOpenGroup] = useState<string | null>(null)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const navRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setOpenGroup(null)
                setIsUserMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Fechar dropdown ao mudar de rota
    useEffect(() => {
        setOpenGroup(null)
        setIsUserMenuOpen(false)
    }, [pathname])

    // Montar grupos de navegação segmentados
    const getNavGroups = (): NavGroup[] => {
        const groups: NavGroup[] = []

        // 1. Diárias & Escalas
        if (acessoCoberturas) {
            const diáriasItems: NavItem[] = []

            if (role === "ADMIN") {
                diáriasItems.push(
                    { label: "Cadastros Gerais", href: "/dashboard/admin", icon: Settings, description: "Postos, diaristas e motivos" },
                    { label: "Usuários do Sistema", href: "/dashboard/admin/usuarios", icon: UserIcon, description: "Gestão de acessos e cargos" },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText, description: "Lançar nova substituição" },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText, description: "Lançamentos e coberturas" },
                    { label: "Todas Coberturas", href: "/dashboard/admin/coberturas", icon: FileText, description: "Visão consolidada de escalas" },
                    { label: "Aprovação de Diárias", href: "/dashboard/aprovador", icon: CheckSquare, description: "Fila de aprovações N1/N2" },
                    { label: "Relatórios de Diárias", href: "/dashboard/admin/relatorios", icon: BarChart, description: "Métricas e histórico" }
                )
            } else if (role === "SUPERVISOR") {
                diáriasItems.push(
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText, description: "Lançar cobertura de posto" },
                    { label: "Meus Lançamentos", href: "/dashboard/supervisor", icon: FileText, description: "Suas diárias cadastradas" },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText, description: "Lista geral de substituições" },
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings, description: "Locais e prestadores" }
                )
            } else if (role === "APROVADOR") {
                diáriasItems.push(
                    { label: "Aprovações", href: "/dashboard/aprovador", icon: CheckSquare, description: "Validar escalas pendentes" }
                )
            } else if (role === "APROVADOR_N1" || role === "APROVADOR_N2") {
                diáriasItems.push(
                    { label: "Aprovação de Diárias", href: "/dashboard/aprovador", icon: CheckSquare, description: "Validar solicitações" },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText, description: "Lançamentos realizados" },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText, description: "Lançamento rápido" },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText, description: "Visão consolidada" },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart, description: "Relatórios gerenciais" }
                )
            } else if (role === "FINANCEIRO") {
                diáriasItems.push(
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText, description: "Lançar cobertura" },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText, description: "Diárias sob sua gestão" },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText, description: "Lista de coberturas" },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart, description: "Relatórios operacionais" }
                )
            } else if (role === "ENCARREGADO") {
                diáriasItems.push(
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText, description: "Registrar cobertura" }
                )
            } else if (role === "RH") {
                diáriasItems.push(
                    { label: "Relatórios de Diárias", href: "/dashboard/admin/relatorios", icon: BarChart, description: "Resumo de frequência" },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText, description: "Escalas de postos" }
                )
            }

            if (diáriasItems.length > 0) {
                groups.push({
                    title: "Diárias & Escalas",
                    color: "cyan",
                    items: diáriasItems
                })
            }
        }

        // 2. Reembolsos & Despesas
        if (acessoDespesas) {
            const despesasItems: NavItem[] = []

            if (["ADMIN", "SUPERVISOR", "ENCARREGADO"].includes(role)) {
                despesasItems.push(
                    { label: "Novo Reembolso", href: "/dashboard?action=reembolso", icon: Receipt, description: "Solicitar reembolso de notas" },
                    { label: "Novo Adiantamento", href: "/dashboard?action=adiantamento", icon: DollarSign, description: "Solicitar adiantamento antecipado" }
                )
            }

            despesasItems.push({ label: "Minhas Despesas", href: "/dashboard/despesas", icon: Wallet, description: "Histórico das suas solicitações" })

            if (["ADMIN", "APROVADOR", "APROVADOR_N1", "APROVADOR_N2"].includes(role)) {
                despesasItems.push(
                    { label: "Aprovar Despesas", href: "/dashboard/despesas/aprovacoes", icon: CheckSquare, description: "Solicitações pendentes" },
                    { label: "Aprovar Prestações", href: "/dashboard/despesas/aprovacoes-prestacao", icon: FileText, description: "Comprovação de notas" }
                )
            }

            if (["ADMIN", "FINANCEIRO", "APROVADOR_N2"].includes(role)) {
                despesasItems.push({ label: "Financeiro Despesas", href: "/dashboard/despesas/financeiro", icon: DollarSign, description: "Baixa e liquidação de contas" })
            }

            despesasItems.push({ label: "Políticas Despesas", href: "/dashboard/despesas/politicas", icon: Settings, description: "Limites e regras por categoria" })

            if (["ADMIN", "FINANCEIRO", "RH", "APROVADOR_N2"].includes(role)) {
                despesasItems.push({ label: "Relatório Despesas", href: "/dashboard/despesas/relatorios", icon: BarChart, description: "Análise financeira por centro" })
            }

            if (role === "ADMIN") {
                despesasItems.push({ label: "Centros de Custo", href: "/dashboard/despesas/admin/centros-custo", icon: Landmark, description: "Gestão de áreas e orçamentos" })
            }

            if (despesasItems.length > 0) {
                groups.push({
                    title: "Despesas & Reembolsos",
                    color: "indigo",
                    items: despesasItems
                })
            }
        }

        // 3. Financeiro & Faturamento
        const financeiroItems: NavItem[] = []
        if (["ADMIN", "FINANCEIRO", "APROVADOR_N2"].includes(role)) {
            financeiroItems.push(
                { label: "Pagamentos de Diárias", href: "/dashboard/financeiro", icon: DollarSign, description: "Pagamento Pix Asaas automático" },
                { label: "Antecipações de Diárias", href: "/dashboard/antecipacoes", icon: Zap, description: "Adiantamentos de saque dos prestadores" }
            )
        }
        if (role === "ADMIN") {
            financeiroItems.push(
                { label: "Faturamento Cliente", href: "/dashboard/admin/faturamento", icon: Receipt, description: "Gestão de faturas e cobranças" }
            )
        }

        if (financeiroItems.length > 0) {
            groups.push({
                title: "Financeiro & Faturamento",
                color: "emerald",
                items: financeiroItems
            })
        }

        return groups
    }

    const groups = getNavGroups()

    // Helper de checagem de rota ativa
    const isPathActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard"
        return pathname.startsWith(href)
    }

    const isGroupActive = (group: NavGroup) => {
        return group.items.some(item => isPathActive(item.href))
    }

    return (
        <header className="sticky top-0 z-50 hidden md:flex h-20 w-full items-center justify-between border-b border-white/10 bg-sidebar/95 backdrop-blur-md px-8 shadow-2xl transition-all text-white font-sans">
            {/* Esquerda: Logo + Título */}
            <div className="flex items-center gap-6">
                <Link href="/dashboard" className="flex items-center gap-3 active:scale-95 transition-transform">
                    <img
                        src={logoUrl || "/logo.png"}
                        alt="ReembolsaFácil"
                        className="h-11 w-auto object-contain rounded-lg"
                    />
                    <span className="hidden lg:block text-[10px] font-black text-white/40 uppercase tracking-[0.25em] border-l border-white/10 pl-3 py-1">
                        Painel Integrado
                    </span>
                </Link>
            </div>

            {/* Centro: Menus de Navegação Superior (Estrutura Inter em Cores Escuras do Sistema) */}
            <div ref={navRef} className="flex items-center gap-4">
                {/* Grupos Dropdown com texto limpo e seta */}
                {groups.map((group) => {
                    const isOpen = openGroup === group.title
                    const activeGroup = isGroupActive(group)

                    return (
                        <div
                            key={group.title}
                            className="relative py-4"
                            onMouseEnter={() => setOpenGroup(group.title)}
                        >
                            <button
                                onClick={() => setOpenGroup(isOpen ? null : group.title)}
                                className={cn(
                                    "flex items-center gap-1.5 text-[15px] font-semibold transition-all cursor-pointer py-1.5 px-3 rounded-xl border",
                                    activeGroup || isOpen
                                        ? group.color === "cyan"
                                            ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                                            : group.color === "indigo"
                                            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                        : "text-slate-300 hover:text-white hover:bg-white/5 border-transparent"
                                )}
                            >
                                <span>{group.title}</span>
                                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
                            </button>

                            {/* Dropdown Card Flutuante (Escuro com Glassmorphism) */}
                            {isOpen && (
                                <div
                                    className="absolute left-0 top-full mt-0 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200 z-50"
                                    onMouseLeave={() => setOpenGroup(null)}
                                >
                                    <div className="px-3 py-1.5 border-b border-white/5 mb-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            {group.title}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const active = isPathActive(item.href)

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        "group flex items-start gap-3 rounded-xl p-2.5 text-xs transition-all duration-150 active:scale-[0.98]",
                                                        active
                                                            ? "bg-white/10 text-white font-bold border border-white/10"
                                                            : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "p-2 rounded-lg shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                                                        active ? "bg-white/10 text-white" : "bg-slate-800 text-slate-400 group-hover:text-white"
                                                    )}>
                                                        <item.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm leading-tight text-white group-hover:text-cyan-300 transition-colors">
                                                            {item.label}
                                                        </p>
                                                        {item.description && (
                                                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Link Direto Painel Principal */}
                <Link
                    href="/dashboard"
                    className={cn(
                        "text-[15px] font-semibold transition-all py-1.5 px-3 rounded-xl border",
                        pathname === "/dashboard"
                            ? "bg-white/10 text-white border-white/20 shadow-inner font-bold"
                            : "text-slate-300 hover:text-white hover:bg-white/5 border-transparent"
                    )}
                >
                    Painel Principal
                </Link>
            </div>

            {/* Direita: Perfil do Usuário / Logout */}
            <div className="relative">
                <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-3 text-[15px] font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 active:scale-95"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-xs border border-white/10 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={user.name || "Perfil"} className="h-full w-full object-cover" />
                        ) : (
                            <UserIcon className="h-4 w-4" />
                        )}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name || "Sua Conta"}</span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
                </button>

                {/* Dropdown Perfil / Sair */}
                {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200 z-50 text-white">
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                            <p className="text-sm font-bold text-white truncate">{user.name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                {user.cargo || (user.role === 'ADMIN' ? 'Administrador' : user.role === 'APROVADOR_N1' ? 'Aprovador N1' : user.role === 'APROVADOR_N2' ? 'Aprovador N2' : user.role === 'SUPERVISOR' ? 'Supervisor' : user.role === 'FINANCEIRO' ? 'Financeiro' : user.role === 'RH' ? 'RH' : user.role)}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setIsUserMenuOpen(false)
                                setIsProfileOpen(true)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <UserIcon className="h-4 w-4 text-slate-400" />
                            <span>Editar Meu Perfil</span>
                        </button>

                        <div className="my-1 border-t border-white/5" />

                        <Link
                            href="/api/auth/signout"
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="h-4 w-4 text-red-400" />
                            <span>Sair da Conta</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* Modal de Perfil */}
            <ProfileDialog
                isOpen={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                user={user}
                onSuccess={(newUrl) => setAvatarUrl(newUrl)}
            />
        </header>
    )
}
