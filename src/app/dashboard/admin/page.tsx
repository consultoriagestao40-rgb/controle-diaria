"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Building2, Users, Calendar, UserCog, FileText } from "lucide-react"
import { toast } from "sonner"

export default function AdminPage() {
    const cards = [
        {
            title: "Postos de Trabalho",
            description: "Gerenciar unidades e postos",
            href: "/dashboard/admin/postos",
            icon: Building2,
            color: "text-blue-500",
        },
        {
            title: "Diaristas",
            description: "Gerenciar profissionais",
            href: "/dashboard/admin/diaristas",
            icon: Users,
            color: "text-green-500",
        },
        {
            title: "Colaboradores",
            description: "Profissionais substituídos",
            href: "/dashboard/admin/colaboradores",
            icon: Calendar,
            color: "text-purple-500",
        },

        {
            title: "Motivos & Configs",
            description: "Tabelas auxiliares e ajustes",
            href: "/dashboard/admin/configs",
            icon: FileText,
            color: "text-slate-500",
        },
    ]

    return (
        <div className="space-y-10 pb-32">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3 uppercase">
                        Central de <span className="text-primary italic">Controle</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Administração de módulos e diretrizes</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="h-12 bg-white/50 border-white hover:bg-white text-slate-500 font-black uppercase tracking-widest text-[9px] rounded-xl px-6 transition-all"
                        onClick={async () => {
                            const toastId = toast.loading("Sincronizando banco de dados...");
                            try {
                                const res = await fetch("/api/admin/fix-names", { method: "POST" });
                                if (!res.ok) throw new Error();
                                toast.success("Sincronização concluída!", { id: toastId });
                            } catch {
                                toast.error("Falha na sincronização operacional", { id: toastId });
                            }
                        }}
                    >
                        <UserCog className="mr-2 h-4 w-4 opacity-50" />
                        Reparar Operadores (Sync)
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href} className="group">
                        <Card className="glass-card h-full border-none group-hover:scale-[1.03] transition-all duration-500 premium-shadow cursor-pointer overflow-hidden p-0">
                            <CardContent className="p-8 space-y-6">
                                <div className={`h-16 w-16 rounded-2xl bg-white/50 flex items-center justify-center ${card.color} border border-white shadow-inner group-hover:cyber-glow transition-all duration-500`}>
                                    <card.icon className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 group-hover:text-primary transition-colors uppercase leading-none">{card.title}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                                <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                    Acessar Módulo
                                    <div className="h-1 w-4 bg-primary rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="mt-12 p-8 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Terminal de Segurança</h2>
                        <p className="text-slate-400 text-sm font-medium">Todos os registros de auditoria são criptografados de ponta a ponta.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest">
                            Server Status: <span className="text-green-400">Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
