"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, UserCheck, Lock, ArrowRight, Loader2, Sparkles, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export default function DiaristaLoginPage() {
    const router = useRouter()
    const [cpf, setCpf] = useState("")
    const [senha, setSenha] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Verifica se já está logado no localStorage
        const savedDiarista = localStorage.getItem("reembolsa_diarista")
        if (savedDiarista) {
            router.push("/diarista")
        }
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!cpf) {
            toast.error("Por favor, digite seu CPF.")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/diarista/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cpf, senha })
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || "Erro ao fazer login.")
                return
            }

            // Salva sessão do diarista no localStorage
            localStorage.setItem("reembolsa_diarista", JSON.stringify(data.diarista))
            toast.success(`Bem-vindo(a), ${data.diarista.nome}!`)
            router.push("/diarista")

        } catch (error) {
            toast.error("Erro de conexão ao tentar fazer login.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
            {/* Background Glow Elements */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[128px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between w-full max-w-md mx-auto pt-4 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <UserCheck className="h-5 w-5 text-slate-950 font-bold" />
                    </div>
                    <div>
                        <span className="text-lg font-black tracking-tight text-white block leading-none">Portal do Prestador</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90 mt-1 block">ReembolsaFácil</span>
                    </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span>Acesso Direto</span>
                </div>
            </div>

            {/* Card Form */}
            <div className="w-full max-w-md mx-auto my-auto py-8 relative z-10">
                <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                    <CardContent className="p-6 sm:p-8 space-y-6">
                        <div className="space-y-2 text-center sm:text-left">
                            <h1 className="text-2xl font-black tracking-tight text-white">Área do Diarista</h1>
                            <p className="text-sm text-slate-400">
                                Digite seu CPF para acessar seus plantões, fazer check-in e solicitar saques.
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Seu CPF</label>
                                <div className="relative">
                                    <UserCheck className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                                    <Input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, "").slice(0, 11)
                                            let formatted = raw
                                            if (raw.length > 9) formatted = `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6,9)}-${raw.slice(9)}`
                                            else if (raw.length > 6) formatted = `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6)}`
                                            else if (raw.length > 3) formatted = `${raw.slice(0,3)}.${raw.slice(3)}`
                                            setCpf(formatted)
                                        }}
                                        className="pl-11 bg-slate-950/60 border-slate-800 focus:border-emerald-500 text-white placeholder:text-slate-600 h-12 rounded-xl text-base font-mono tracking-wider"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Sua Senha (Opcional no 1º Acesso)</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={senha}
                                        onChange={e => setSenha(e.target.value)}
                                        className="pl-11 bg-slate-950/60 border-slate-800 focus:border-emerald-500 text-white placeholder:text-slate-600 h-12 rounded-xl text-base"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 transition-all mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Entrar no Portal</span>
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 py-4 relative z-10">
                <p>ReembolsaFácil &copy; {new Date().getFullYear()} — Plataforma de Gestão de Diárias</p>
            </div>
        </div>
    )
}
