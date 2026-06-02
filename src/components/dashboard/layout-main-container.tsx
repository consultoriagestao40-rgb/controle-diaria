"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function LayoutMainContainer({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isHub = pathname === "/dashboard"

    return (
        <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden min-h-0 transition-all duration-300",
            isHub ? "p-0 bg-slate-950" : "p-4 md:p-8 bg-[#F8FAFC]"
        )}>
            {children}
        </main>
    )
}
