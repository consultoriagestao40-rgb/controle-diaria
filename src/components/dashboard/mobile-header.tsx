"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"

interface MobileHeaderProps {
    user: { name?: string | null, role?: string, avatarUrl?: string | null, cargo?: string | null }
    logoUrl: string
    acessoDespesas?: boolean
    acessoCoberturas?: boolean
}

export function MobileHeader({ user, logoUrl, acessoDespesas = true, acessoCoberturas = true }: MobileHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    
    // We show a back button if the user is on a subpage (not /dashboard and not exactly /login or empty)
    const canGoBack = pathname !== "/dashboard" && pathname !== "/"

    return (
        <header className="flex h-20 items-center justify-between border-b border-white/5 bg-sidebar px-4 sm:px-6 md:hidden flex-none z-30">
            <div className="flex items-center gap-2">
                {canGoBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-10 w-10 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all shrink-0 cursor-pointer border border-white/5"
                    >
                        <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
                    </Button>
                )}
                <img
                    src={logoUrl}
                    alt="ReembolsaFácil"
                    className="h-10 w-auto object-contain rounded-lg"
                />
            </div>
            <MobileNav 
                user={user} 
                logoUrl={logoUrl} 
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
        </header>
    )
}
