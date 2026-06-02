import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wallet, Calendar, ArrowRight, LogOut, ShieldAlert } from "lucide-react"
import { prisma } from "@/lib/prisma"

function getDefaultCoverageRoute(role: string): string {
    switch (role) {
        case 'ADMIN':
            return '/dashboard/admin'
        case 'SUPERVISOR':
            return '/dashboard/supervisor'
        case 'APROVADOR':
        case 'APROVADOR_N1':
        case 'APROVADOR_N2':
            return '/dashboard/aprovador'
        case 'FINANCEIRO':
            return '/dashboard/financeiro'
        default:
            return '/dashboard'
    }
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const user = session.user as any
    const role = user.role
    const acessoDespesas = user.acessoDespesas !== false
    const acessoCoberturas = user.acessoCoberturas !== false

    // Redirecionamento automático se tiver apenas um módulo habilitado
    if (acessoDespesas && !acessoCoberturas) {
        redirect("/dashboard/despesas")
    }
    if (!acessoDespesas && acessoCoberturas) {
        redirect(getDefaultCoverageRoute(role))
    }
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

    // Buscar logo personalizado para exibir no Hub
    const config = await prisma.configuracaoAuditoria.findFirst({
        where: { ativo: true }
    })
    const logoUrl = config?.logoPersonalizado || "/logo.png"

    const coverageRoute = getDefaultCoverageRoute(role)

    return (
        <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

            {/* Header */}
            <header className="w-full flex items-center justify-between max-w-6xl mx-auto border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <img 
                        src={logoUrl} 
                        alt="ReembolsaFácil" 
                        className="h-12 w-auto object-contain rounded-xl"
                    />
                </div>
                
                <Link 
                    href="/api/auth/signout"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </Link>
            </header>

            {/* Main Selection Area */}
            <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full my-12">
                <div className="space-y-3 text-center mb-16">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Hub Central</h2>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
                        Olá, <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{session.user?.name}</span>.
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base font-semibold max-w-xl mx-auto">
                        Selecione qual módulo você deseja gerenciar hoje. Suas permissões e configurações serão mantidas em cada área.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 w-full">
                    {/* Card 1: Despesas Corporativas */}
                    <Link 
                        href="/dashboard/despesas"
                        className="group flex flex-col justify-between p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] relative overflow-hidden active:scale-[0.99]"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
                        
                        <div className="space-y-6">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                                <Wallet className="h-7 w-7" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Reembolsos & Adiantamentos</span>
                                <h3 className="text-2xl font-black">Despesas Corporativas</h3>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    Criação e aprovação de relatórios de reembolso de despesas, adiantamentos corporativos para viagens e auditoria inteligente de recibos por IA.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider mt-8 group-hover:translate-x-2 transition-transform">
                            Acessar Despesas
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </Link>

                    {/* Card 2: Diárias e Coberturas */}
                    <Link 
                        href={coverageRoute}
                        className="group flex flex-col justify-between p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/50 hover:bg-white/[0.05] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(6,182,212,0.15)] relative overflow-hidden active:scale-[0.99]"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                        
                        <div className="space-y-6">
                            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-500">
                                <Calendar className="h-7 w-7" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Escalas & Lançamentos</span>
                                <h3 className="text-2xl font-black">Diárias e Coberturas</h3>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    Lançamento de diárias de coberturas para postos, gestão de diaristas e reservas, emissão de relatórios operacionais e pagamentos integrados.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider mt-8 group-hover:translate-x-2 transition-transform">
                            Acessar Diárias
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full text-center max-w-6xl mx-auto border-t border-white/5 pt-6 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                © {new Date().getFullYear()} ReembolsaFácil. Todos os direitos reservados.
            </footer>
        </div>
    )
}
