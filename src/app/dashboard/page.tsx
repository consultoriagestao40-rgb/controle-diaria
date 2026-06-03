import { Suspense } from "react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardPortal } from "@/components/dashboard/dashboard-portal"
import { ShieldAlert, LogOut } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
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

    // Buscar logo personalizado
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"

    return (
        <Suspense fallback={null}>
            <DashboardPortal 
                user={{ name: dbUser.nome, role, avatarUrl: dbUser.avatarUrl, cargo: dbUser.cargo }}
                logoUrl={logoUrl}
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
        </Suspense>
    )
}

