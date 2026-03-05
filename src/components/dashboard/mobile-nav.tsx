"use client"

import Link from "next/link"
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
    BarChart
} from "lucide-react"

interface MobileNavProps {
    user: { name?: string | null, role?: string }
}

export function MobileNav({ user }: MobileNavProps) {
    const role = user.role

    const getNavItems = () => {
        switch (role) {
            case "ADMIN":
                return [
                    { label: "Cadastros", href: "/dashboard/admin", icon: Settings },
                    { label: "Usuários", href: "/dashboard/admin/usuarios", icon: UserIcon },
                    { label: "Coberturas", href: "/dashboard/admin/coberturas", icon: FileText },
                    { label: "Relatórios", href: "/dashboard/admin/relatorios", icon: BarChart },
                    { label: "Nova Diária", href: "/dashboard/supervisor/nova", icon: FileText },
                    { label: "Minhas Diárias", href: "/dashboard/supervisor", icon: FileText },
                    { label: "Aprovação", href: "/dashboard/aprovador", icon: CheckSquare },
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
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0 bg-sidebar border-none shadow-3xl text-white">
                <div className="flex flex-col h-full">
                    <div className="flex h-24 items-center border-b border-white/5 px-8">
                        <div className="flex flex-col gap-1">
                            <img
                                src="https://grupojvsserv.com.br/wp-content/uploads/2023/11/logo-horizontal-300px.png"
                                alt="Grupo JVS"
                                className="h-10 w-auto object-contain brightness-0 invert"
                            />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Diárias</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-8 px-6">
                        <ul className="space-y-2">
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <SheetClose asChild>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-4 rounded-xl px-4 py-4 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300"
                                        >
                                            <item.icon className="h-5 w-5 text-slate-500" />
                                            {item.label}
                                        </Link>
                                    </SheetClose>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="border-t p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                                <UserIcon className="h-6 w-6" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                            </div>
                        </div>
                        <Link href="/api/auth/signout">
                            <Button variant="ghost" className="mt-4 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                            </Button>
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
