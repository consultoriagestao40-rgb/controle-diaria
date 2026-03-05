"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    LogOut,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
    Settings,
    FileText,
    CheckSquare,
    DollarSign,
    BarChart
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarNavProps {
    user: { name?: string | null, role?: string }
}

export function SidebarNav({ user }: SidebarNavProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const role = user.role

    const getNavItems = () => {
        switch (role) {
            case "ADMIN":
                return [
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings },
                    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: UserIcon },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    // Supervisor Access
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText },
                    // Approver Access
                    { label: "Aprovação", href: "/dashboard/aprovador", icon: CheckSquare },
                    // Finance Access
                    { label: "Pagamentos", href: "/dashboard/financeiro", icon: DollarSign },
                ]
            case "SUPERVISOR":
                return [
                    { label: "Meus Lançamentos", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings },
                ]
            case "APROVADOR":
                return [
                    { label: "Aprovações", href: "/dashboard/aprovador", icon: CheckSquare },
                ]
            case "APROVADOR_N1":
            case "APROVADOR_N2":
                return [
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Aprovação", href: "/dashboard/aprovador", icon: CheckSquare },
                ]
            case "FINANCEIRO":
                return [
                    { label: "Pagamentos", href: "/dashboard/financeiro", icon: DollarSign },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                ]
            case "ENCARREGADO":
                return [
                    { label: "Novo Lançamento", href: "/dashboard/supervisor/nova", icon: FileText },
                ]
            case "RH":
                return [
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                ]
            default:
                return []
        }
    }

    const navItems = getNavItems()

    return (
        <aside
            className={cn(
                "relative z-40 hidden flex-col bg-sidebar border-r shadow-2xl md:flex transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Toggle Button - Sophisticated Design */}
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
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                        <span className="text-xl font-black text-white tracking-tighter">JVS</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 active:scale-95 transition-transform duration-200">
                        <img
                            src="https://grupojvsserv.com.br/wp-content/uploads/2023/11/logo-horizontal-300px.png"
                            alt="Grupo JVS"
                            className="h-12 w-auto object-contain brightness-0 invert"
                        />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Controle de Diárias</span>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-8 scrollbar-hide">
                <ul className="space-y-2 px-4">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300",
                                    "text-slate-400 hover:text-white hover:bg-white/5 active:scale-[0.98]",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                                    "text-slate-500 group-hover:text-primary"
                                )} />
                                {!isCollapsed && (
                                    <span className="tracking-tight">{item.label}</span>
                                )}
                                {!isCollapsed && (
                                    <div className="ml-auto w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer / User Info */}
            <div className="border-t p-4">
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <UserIcon className="h-6 w-6" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden transition-all duration-300">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                        </div>
                    )}
                </div>

                <Button
                    variant="ghost"
                    className={cn(
                        "mt-4 w-full text-red-600 hover:text-red-700 hover:bg-red-50",
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
        </aside>
    )
}
