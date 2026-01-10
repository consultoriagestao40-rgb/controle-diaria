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
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 bg-white">
                <div className="flex flex-col h-full">
                    <div className="flex h-16 items-center border-b px-6">
                        <span className="text-xl font-bold text-primary">Diárias</span>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4 px-4">
                        <ul className="space-y-1">
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <SheetClose asChild>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors"
                                        >
                                            <item.icon className="h-5 w-5" />
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
