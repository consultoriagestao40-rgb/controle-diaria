import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    BarChart,
    FileText,
    CheckSquare,
    DollarSign,
    Settings,
    LogOut,
    User as UserIcon,
    Menu,
    Users,
    Calendar,
    Building2
} from "lucide-react"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { prisma } from "@/lib/prisma"
 
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)
 
    if (!session) {
        redirect("/login")
    }
 
    const role = (session.user as any).role

    // Buscar logo personalizado da empresa no banco
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"
 
    return (
        <div className="flex h-screen flex-col md:flex-row bg-[#F8FAFC] overflow-hidden">
            {/* Sidebar for Desktop (Client Component) */}
            <SidebarNav user={{ name: session.user?.name, role: role }} logoUrl={logoUrl} />
 
            {/* Main Content */}
            <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden relative">
                <header className="flex h-20 items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 md:hidden flex-none z-30">
                    <img
                        src={logoUrl}
                        alt="ReembolsaFácil"
                        className="h-10 w-auto object-contain rounded-lg"
                    />
 
                    {/* Mobile Navigation (Client Component) */}
                    <MobileNav user={{ name: session.user?.name, role: role }} logoUrl={logoUrl} />
                </header>
 
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 min-h-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
