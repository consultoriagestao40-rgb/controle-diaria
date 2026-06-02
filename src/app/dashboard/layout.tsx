import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { MobileHeader } from "@/components/dashboard/mobile-header"
import { LayoutMainContainer } from "@/components/dashboard/layout-main-container"
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
    const acessoDespesas = (session.user as any).acessoDespesas !== false
    const acessoCoberturas = (session.user as any).acessoCoberturas !== false

    // Buscar logo personalizado da empresa no banco
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"
 
    return (
        <div className="flex h-screen flex-col md:flex-row bg-[#F8FAFC] overflow-hidden">
            {/* Sidebar for Desktop (Client Component) */}
            <SidebarNav 
                user={{ name: session.user?.name, role: role }} 
                logoUrl={logoUrl} 
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
 
            {/* Main Content */}
            <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden relative">
                {/* Mobile Navigation Header (Client Component wrapper) */}
                <MobileHeader 
                    user={{ name: session.user?.name, role: role }} 
                    logoUrl={logoUrl} 
                    acessoDespesas={acessoDespesas}
                    acessoCoberturas={acessoCoberturas}
                />
 
                {/* Main scrollable body area (Client Component wrapper) */}
                <LayoutMainContainer>
                    {children}
                </LayoutMainContainer>
            </div>
        </div>
    )
}
// Trigger build webhook manually
