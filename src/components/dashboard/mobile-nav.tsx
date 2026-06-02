"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import {
    Menu,
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
    Landmark
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    user: { name?: string | null, role?: string }
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

export function MobileNav({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: MobileNavProps) {
    const pathname = usePathname()
    const role = user.role || ""

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
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0 bg-sidebar border-none shadow-3xl text-white">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex h-24 items-center border-b border-white/5 px-8">
                        <div className="flex flex-col gap-1">
                            <img
                                src={logoUrl || "/logo.png"}
                                alt="ReembolsaFácil"
                                className="h-10 w-auto object-contain rounded-lg"
                            />
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                Painel Integrado
                            </span>
                        </div>
                    </div>
                    
                    {/* Sections and Items */}
                    <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-hide">
                        {sections.map((section, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-4 mb-2">
                                    {section.title}
                                </h4>
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
                                                <SheetClose asChild>
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
                                                            isActive
                                                                ? isDespesasItem || item.href === "/dashboard"
                                                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                                        )}
                                                    >
                                                        <item.icon className={cn(
                                                            "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                                                            isActive
                                                                ? isDespesasItem || item.href === "/dashboard"
                                                                    ? "text-indigo-400"
                                                                    : "text-cyan-400"
                                                                : "text-slate-500 group-hover:text-white"
                                                        )} />
                                                        <span className="tracking-tight">{item.label}</span>
                                                        {isActive && (
                                                            <div className={cn(
                                                                "ml-auto w-1 h-1 rounded-full",
                                                                isDespesasItem || item.href === "/dashboard" ? "bg-indigo-400" : "bg-cyan-400"
                                                            )} />
                                                        )}
                                                    </Link>
                                                </SheetClose>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                    
                    {/* User Profile / Logout */}
                    <div className="border-t border-white/5 p-4 bg-slate-950/20">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                                <UserIcon className="h-6 w-6" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                                <p className="text-xs text-slate-400 truncate uppercase tracking-wider font-bold">{user.role}</p>
                            </div>
                        </div>
                        <SheetClose asChild>
                            <Link href="/api/auth/signout">
                                <Button variant="ghost" className="mt-4 w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </Button>
                            </Link>
                        </SheetClose>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
