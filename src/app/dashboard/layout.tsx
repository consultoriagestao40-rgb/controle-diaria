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
 
    const dbUser = await prisma.user.findUnique({
        where: { id: (session.user as any).id }
    })

    if (!dbUser) {
        redirect("/login")
    }

    const role = dbUser.role
    const acessoDespesas = dbUser.acessoDespesas !== false
    const acessoCoberturas = dbUser.acessoCoberturas !== false

    // Buscar logo personalizado da empresa no banco
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"
 
    return (
        <div className="flex h-screen flex-col md:flex-row bg-[#F8FAFC] overflow-hidden">
            {/* Sidebar for Desktop (Client Component) */}
            <SidebarNav 
                user={{ name: dbUser.nome, role: role, avatarUrl: dbUser.avatarUrl }} 
                logoUrl={logoUrl} 
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
 
            {/* Main Content */}
            <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden relative">
                {/* Mobile Navigation Header (Client Component wrapper) */}
                <MobileHeader 
                    user={{ name: dbUser.nome, role: role, avatarUrl: dbUser.avatarUrl }} 
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
