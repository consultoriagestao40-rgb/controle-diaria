"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProfileDialog } from "./profile-dialog"
import {
    LogOut,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
    Settings,
    FileText,
    CheckSquare,
    DollarSign,
    BarChart,
    Receipt,
    Wallet,
    Grid,
    Landmark
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarNavProps {
    user: { name?: string | null, role?: string, avatarUrl?: string | null }
    logoUrl?: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

interface NavItem {
    label: string
    href: string
    icon: any
}

interface NavSection {
    title: string
    items: NavItem[]
}

export function SidebarNav({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: SidebarNavProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()
    const role = user.role || ""
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null)

    // Sync avatarUrl when props change
    useEffect(() => {
        setAvatarUrl(user.avatarUrl || null)
    }, [user.avatarUrl])

    const getNavSections = (): NavSection[] => {
        const sections: NavSection[] = []

        // 1. Geral Section
        sections.push({
            title: "Geral",
            items: [
                { label: "Painel Principal", href: "/dashboard", icon: Grid }
            ]
        })

        // 2. Reembolsos & Adiantamentos (Despesas)
        if (acessoDespesas) {
            const despesasItems: NavItem[] = []
            
            if (["ADMIN", "SUPERVISOR", "ENCARREGADO"].includes(role)) {
                despesasItems.push({ label: "Novo Reembolso", href: "/dashboard?action=reembolso", icon: Receipt })
                despesasItems.push({ label: "Novo Adiantamento", href: "/dashboard?action=adiantamento", icon: DollarSign })
            }
            
            despesasItems.push({ label: "Minhas Despesas", href: "/dashboard/despesas", icon: Wallet })
            
            if (["ADMIN", "APROVADOR", "APROVADOR_N1", "APROVADOR_N2"].includes(role)) {
                despesasItems.push({ label: "Aprovar Despesas", href: "/dashboard/despesas/aprovacoes", icon: CheckSquare })
            }
            
            if (["ADMIN", "FINANCEIRO"].includes(role)) {
                despesasItems.push({ label: "Financeiro Despesas", href: "/dashboard/despesas/financeiro", icon: DollarSign })
            }
            
            despesasItems.push({ label: "Políticas Despesas", href: "/dashboard/despesas/politicas", icon: Settings })
            
            if (["ADMIN", "FINANCEIRO", "RH"].includes(role)) {
                despesasItems.push({ label: "Relatório Despesas", href: "/dashboard/despesas/relatorios", icon: BarChart })
            }
            
            if (role === "ADMIN") {
                despesasItems.push({ label: "Centros de Custo", href: "/dashboard/despesas/admin/centros-custo", icon: Landmark })
            }

            if (despesasItems.length > 0) {
                sections.push({
                    title: "Reembolsos",
                    items: despesasItems
                })
            }
        }

        // 3. Diárias & Escalas (Coberturas)
        if (acessoCoberturas) {
            const coberturasItems: NavItem[] = []
            
            if (role === "ADMIN") {
                coberturasItems.push(
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings },
                    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: UserIcon },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Aprovação", href: "/dashboard/aprovador", icon: CheckSquare },
                    { label: "Pagamentos", href: "/dashboard/financeiro", icon: DollarSign }
                )
            } else if (role === "SUPERVISOR") {
                coberturasItems.push(
                    { label: "Meus Lançamentos", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings }
                )
            } else if (role === "APROVADOR") {
                coberturasItems.push(
                    { label: "Aprovações", href: "/dashboard/aprovador", icon: CheckSquare }
                )
            } else if (["APROVADOR_N1", "APROVADOR_N2"].includes(role)) {
                coberturasItems.push(
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Aprovação", href: "/dashboard/aprovador", icon: CheckSquare }
                )
            } else if (role === "FINANCEIRO") {
                coberturasItems.push(
                    { label: "Pagamentos", href: "/dashboard/financeiro", icon: DollarSign },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart }
                )
            } else if (role === "ENCARREGADO") {
                coberturasItems.push(
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText }
                )
            } else if (role === "RH") {
                coberturasItems.push(
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText }
                )
            }

            if (coberturasItems.length > 0) {
                sections.push({
                    title: "Diárias & Escalas",
                    items: coberturasItems
                })
            }
        }

        return sections
    }

    const sections = getNavSections()

    return (
        <aside
            className={cn(
                "relative z-40 hidden flex-col bg-sidebar border-r shadow-2xl md:flex transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-24 z-50 flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:scale-110 transition-all duration-300 group"
            >
                {isCollapsed ?
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-primary transition-colors" /> :
                    <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-primary transition-colors" />
                }
            </button>

            {/* Header with Logo */}
            <div className={cn(
                "flex h-28 items-center border-b border-white/5 px-6 transition-all duration-500",
                isCollapsed ? "justify-center px-2" : "justify-start"
            )}>
                {isCollapsed ? (
                    <div className="p-1 rounded-xl bg-white/5 border border-white/10">
                        <img
                            src={logoUrl || "/logo.png"}
                            alt="Logo"
                            className="h-10 w-10 object-contain rounded-lg"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 active:scale-95 transition-transform duration-200">
                        <img
                            src={logoUrl || "/logo.png"}
                            alt="ReembolsaFácil"
                            className="h-14 w-auto object-contain rounded-xl"
                        />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.25em] ml-1">
                            Painel Integrado
                        </span>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-6 scrollbar-hide space-y-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="px-4 space-y-1.5">
                        {!isCollapsed && (
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-4 mb-2">
                                {section.title}
                            </h4>
                        )}
                        <ul className="space-y-1">
                            {section.items.map((item) => {
                                const isDespesasItem = item.href.startsWith("/dashboard/despesas")
                                const isActive = (() => {
                                    if (item.href === "/dashboard") {
                                        return pathname === "/dashboard"
                                    }
                                    if (!pathname.startsWith(item.href)) {
                                        return false
                                    }
                                    const allItems = sections.flatMap(s => s.items)
                                    const hasMoreSpecific = allItems.some(otherItem => {
                                        return otherItem.href !== item.href &&
                                               otherItem.href !== "/dashboard" &&
                                               pathname.startsWith(otherItem.href) &&
                                               otherItem.href.length > item.href.length
                                    })
                                    return !hasMoreSpecific
                                })()

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
                                                isActive
                                                    ? isDespesasItem || item.href === "/dashboard"
                                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
                                                isCollapsed && "justify-center px-2"
                                            )}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <item.icon className={cn(
                                                "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                                                isActive
                                                    ? isDespesasItem || item.href === "/dashboard"
                                                        ? "text-indigo-400"
                                                        : "text-cyan-400"
                                                    : "text-slate-500 group-hover:text-white"
                                            )} />
                                            {!isCollapsed && (
                                                <span className="tracking-tight">{item.label}</span>
                                            )}
                                            {!isCollapsed && isActive && (
                                                <div className={cn(
                                                    "ml-auto w-1 h-1 rounded-full",
                                                    isDespesasItem || item.href === "/dashboard" ? "bg-indigo-400" : "bg-cyan-400"
                                                )} />
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer / User Info */}
            <div className="border-t border-white/5 p-4">
                <button 
                    onClick={() => setIsProfileOpen(true)}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer",
                        isCollapsed && "justify-center"
                    )}
                    title="Editar Perfil"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 overflow-hidden border border-white/5 relative group/avatar">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={user.name || "Perfil"} className="h-full w-full object-cover" />
                        ) : (
                            <UserIcon className="h-6 w-6" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden transition-all duration-300 text-white flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate uppercase tracking-wider font-bold">{user.role}</p>
                        </div>
                    )}
                </button>

                <Button
                    variant="ghost"
                    className={cn(
                        "mt-4 w-full text-red-400 hover:text-red-300 hover:bg-red-500/10",
                        isCollapsed ? "justify-center px-0" : "justify-start"
                    )}
                    asChild
                >
                    <Link href="/api/auth/signout" title="Sair">
                        <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && "Sair"}
                    </Link>
                </Button>
            </div>

            {/* Profile Dialog */}
            <ProfileDialog 
                isOpen={isProfileOpen} 
                onOpenChange={setIsProfileOpen} 
                user={user}
                onSuccess={(newUrl) => setAvatarUrl(newUrl)}
            />
        </aside>
    )
}
