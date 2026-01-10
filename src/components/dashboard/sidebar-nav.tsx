"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
    label: string
    href: string
    icon: any
}

interface SidebarNavProps {
    navItems: NavItem[]
    user: { name?: string | null, role?: string }
}

export function SidebarNav({ navItems, user }: SidebarNavProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                "relative hidden flex-col bg-white border-r shadow-sm md:flex transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Toggle Button - Centered Vertically */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-md hover:bg-slate-100"
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* Header */}
            <div className={cn(
                "flex h-16 items-center border-b px-6 transition-all",
                isCollapsed ? "justify-center px-2" : "justify-start"
            )}>
                {isCollapsed ? (
                    <span className="text-xl font-bold text-primary">D</span>
                ) : (
                    <span className="text-xl font-bold text-primary">Diárias</span>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!isCollapsed && <span>{item.label}</span>}
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
