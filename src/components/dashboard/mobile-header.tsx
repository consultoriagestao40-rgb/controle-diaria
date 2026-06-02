"use client"

import { usePathname } from "next/navigation"
import { MobileNav } from "./mobile-nav"

interface MobileHeaderProps {
    user: { name?: string | null, role?: string }
    logoUrl: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

export function MobileHeader({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: MobileHeaderProps) {
    const pathname = usePathname()
    const isHub = pathname === "/dashboard"

    if (isHub) return null

    return (
        <header className="flex h-20 items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 md:hidden flex-none z-30">
            <img
                src={logoUrl}
                alt="ReembolsaFácil"
                className="h-10 w-auto object-contain rounded-lg"
            />
            <MobileNav 
                user={user} 
                logoUrl={logoUrl} 
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
        </header>
    )
}
