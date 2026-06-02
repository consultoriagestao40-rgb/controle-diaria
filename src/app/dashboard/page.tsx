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

    const user = session.user as any
    const role = user.role
    const acessoDespesas = user.acessoDespesas !== false
    const acessoCoberturas = user.acessoCoberturas !== false

    if (!acessoDespesas && !acessoCoberturas) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
                <ShieldAlert className="h-16 w-16 text-rose-500 mb-6 animate-bounce" />
                <h1 className="text-2xl font-black tracking-tight mb-2">Sem Acesso Liberado</h1>
                <p className="text-slate-400 max-w-md text-sm font-medium">
                    Olá, <span className="text-white font-bold">{session.user?.name}</span>. Você não possui acesso ativo a nenhuma das áreas do sistema. Entre em contato com o administrador para liberar seu acesso.
                </p>
                <Link 
                    href="/api/auth/signout" 
                    className="mt-8 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 active:scale-95"
                >
                    <LogOut className="h-4 w-4" />
                    Sair do Sistema
                </Link>
            </div>
        )
    }

    // Buscar logo personalizado
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"

    return (
        <Suspense fallback={null}>
            <DashboardPortal 
                user={{ name: session.user?.name, role }}
                logoUrl={logoUrl}
                acessoDespesas={acessoDespesas}
                acessoCoberturas={acessoCoberturas}
            />
        </Suspense>
    )
}

