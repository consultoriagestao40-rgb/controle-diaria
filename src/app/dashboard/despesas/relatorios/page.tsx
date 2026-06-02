"use client"

import { useState, useEffect } from "react"
import { BarChart, Wallet, DollarSign, ArrowRightLeft, FileText, AlertCircle, Filter, RotateCcw, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    createdAt: string
    solicitante: { id: string, nome: string, email: string }
    anexos: any[]
}

interface Solicitor {
    id: string
    nome: string
    email: string
}

interface Stats {
    totalAdiantado: number
    totalReembolsado: number
    totalPendenteDevolucao: number
    totalPendenteReembolsoComp: number
    totalDespesasContadas: number
}

export default function RelatoriosDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [solicitantes, setSolicitantes] = useState<Solicitor[]>([])
    const [stats, setStats] = useState<Stats>({
        totalAdiantado: 0,
        totalReembolsado: 0,
        totalPendenteDevolucao: 0,
        totalPendenteReembolsoComp: 0,
        totalDespesasContadas: 0
    })
    const [loading, setLoading] = useState(true)

    // Filtros
    const [selectedSolicitanteId, setSelectedSolicitanteId] = useState("")
    const [selectedTipo, setSelectedTipo] = useState("")
    const [selectedStatus, setSelectedStatus] = useState("")

    useEffect(() => {
        fetchRelatorios()
    }, [selectedSolicitanteId, selectedTipo, selectedStatus])

    const fetchRelatorios = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedSolicitanteId) params.append("solicitanteId", selectedSolicitanteId)
            if (selectedTipo) params.append("tipo", selectedTipo)
            if (selectedStatus) params.append("status", selectedStatus)

            const res = await fetch(`/api/despesas/relatorios?${params.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()

            setDespesas(data.despesas || [])
            setSolicitantes(data.solicitantes || [])
            setStats(data.stats || {
                totalAdiantado: 0,
                totalReembolsado: 0,
                totalPendenteDevolucao: 0,
                totalPendenteReembolsoComp: 0,
                totalDespesasContadas: 0
            })
        } catch {
            toast.error("Erro ao gerar relatórios financeiros")
        } finally {
            setLoading(false)
        }
    }

    const resetFilters = () => {
        setSelectedSolicitanteId("")
        setSelectedTipo("")
        setSelectedStatus("")
    }

    const getStatusBadge = (status: string) => {
        const map: any = {
            'RASCUNHO': 'bg-slate-100 text-slate-700',
            'AGUARDANDO_APROVACAO': 'bg-yellow-100 text-yellow-800',
            'APROVADO': 'bg-green-100 text-green-800',
            'REPROVADO': 'bg-red-100 text-red-800',
            'PAGO': 'bg-teal-100 text-teal-800',
            'AGUARDANDO_PRESTACAO': 'bg-orange-100 text-orange-800',
            'AGUARDANDO_CONCILIACAO': 'bg-purple-100 text-purple-800',
            'CONCLUIDO': 'bg-blue-100 text-blue-800',
        }

        const labels: any = {
            'RASCUNHO': 'Rascunho',
            'AGUARDANDO_APROVACAO': 'Aguardando Aprovação',
            'APROVADO': 'Aprovado',
            'REPROVADO': 'Reprovado',
            'PAGO': 'Pago',
            'AGUARDANDO_PRESTACAO': 'Aguardando Prestação',
            'AGUARDANDO_CONCILIACAO': 'Aguardando Conciliação',
            'CONCLUIDO': 'Concluído',
        }

        return <Badge variant="outline" className={`${map[status] || 'bg-gray-100'} border-0 px-2 py-0.5 text-[10px] font-bold rounded-md`}>{labels[status] || status}</Badge>
    }

    return (
        <div className="space-y-10 pb-32 max-w-6xl mx-auto pt-4 relative">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                    Relatórios e <span className="text-primary italic">Consultas de Despesas</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Visão geral dos custos corporativos, reembolsos e adiantamentos
                </p>
            </div>

            {/* Filtros */}
            <Card className="glass-card border-none shadow-md bg-white rounded-2xl">
                <CardContent className="p-6 flex flex-col md:flex-row items-end gap-4 justify-between">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                        {/* Colaborador */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <User className="h-3 w-3 text-primary" /> Colaborador
                            </label>
                            <select
                                value={selectedSolicitanteId}
                                onChange={(e) => setSelectedSolicitanteId(e.target.value)}
                                className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-slate-50 font-semibold text-xs focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos os Colaboradores</option>
                                {solicitantes.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nome} ({s.email})</option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo de Despesa */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Wallet className="h-3 w-3 text-rose-400" /> Tipo
                            </label>
                            <select
                                value={selectedTipo}
                                onChange={(e) => setSelectedTipo(e.target.value)}
                                className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-slate-50 font-semibold text-xs focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos os Tipos</option>
                                <option value="REEMBOLSO">Reembolsos</option>
                                <option value="ADIANTAMENTO">Adiantamentos</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Filter className="h-3 w-3 text-emerald-400" /> Status
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-slate-50 font-semibold text-xs focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos os Status</option>
                                <option value="RASCUNHO">Rascunhos</option>
                                <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
                                <option value="APROVADO">Aprovados pelo Gestor</option>
                                <option value="PAGO">Pago pelo Financeiro</option>
                                <option value="AGUARDANDO_PRESTACAO">Aguardando Prestação</option>
                                <option value="AGUARDANDO_CONCILIACAO">Aguardando Conciliação</option>
                                <option value="CONCLUIDO">Concluídos</option>
                            </select>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="h-11 px-5 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-[9px] gap-1 hover:bg-slate-50 transition-all border-slate-200 shrink-0 w-full md:w-auto"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Limpar
                    </Button>
                </CardContent>
            </Card>

            {/* Cards de Estatísticas */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Adiantado */}
                <Card className="border-none shadow-lg rounded-2xl bg-white hover:scale-[1.01] transition-transform">
                    <CardContent className="p-6 space-y-2 flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Adiantamentos Pagos</p>
                            <h3 className="text-2xl font-black text-slate-900">R$ {stats.totalAdiantado.toFixed(2)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Total Reembolsado */}
                <Card className="border-none shadow-lg rounded-2xl bg-white hover:scale-[1.01] transition-transform">
                    <CardContent className="p-6 space-y-2 flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Reembolsado</p>
                            <h3 className="text-2xl font-black text-slate-900">R$ {stats.totalReembolsado.toFixed(2)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Saldo de Devolução (Sobrou) */}
                <Card className="border-none shadow-lg rounded-2xl bg-white hover:scale-[1.01] transition-transform">
                    <CardContent className="p-6 space-y-2 flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A Receber (Colaborador deve)</p>
                            <h3 className="text-2xl font-black text-amber-600">R$ {stats.totalPendenteDevolucao.toFixed(2)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0 border border-amber-100">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Saldo Complementar (Faltou) */}
                <Card className="border-none shadow-lg rounded-2xl bg-white hover:scale-[1.01] transition-transform">
                    <CardContent className="p-6 space-y-2 flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A Pagar (Empresa deve)</p>
                            <h3 className="text-2xl font-black text-rose-600">R$ {stats.totalPendenteReembolsoComp.toFixed(2)}</h3>
                        </div>
                        <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 shrink-0 border border-rose-100">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Listagem de Despesas */}
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-lg font-black text-slate-900">Relatório Consolidado</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Lista detalhada filtrada das movimentações ocorridas no sistema ({despesas.length} registros)</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-32 gap-6">
                            <div className="relative h-16 w-16">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Gerando planilha...</p>
                        </div>
                    ) : despesas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-60">
                            <AlertCircle className="h-10 w-10 text-slate-200" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum registro localizado para os filtros informados.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-6">Solicitante</th>
                                    <th className="py-4 px-6">Tipo</th>
                                    <th className="py-4 px-6">Finalidade</th>
                                    <th className="py-4 px-6 text-right">Solicitado (R$)</th>
                                    <th className="py-4 px-6 text-right">Gasto Real (R$)</th>
                                    <th className="py-4 px-6 text-right">Saldo (R$)</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.map((item) => {
                                    const saldo = item.saldoFinal ? Number(item.saldoFinal) : 0
                                    return (
                                        <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/30 transition-colors font-semibold text-slate-600 text-xs">
                                            <td className="py-4 px-6 font-bold text-slate-900">{item.solicitante.nome}</td>
                                            <td className="py-4 px-6">{item.tipo === 'REEMBOLSO' ? 'Reembolso' : 'Adiantamento'}</td>
                                            <td className="py-4 px-6 max-w-xs truncate">{item.descricao}</td>
                                            <td className="py-4 px-6 text-right font-bold text-slate-800">R$ {Number(item.valorSolicitado).toFixed(2)}</td>
                                            <td className="py-4 px-6 text-right font-medium text-indigo-600">{item.valorComprovado !== null ? `R$ ${Number(item.valorComprovado).toFixed(2)}` : "-"}</td>
                                            <td className={`py-4 px-6 text-right font-bold ${saldo === 0 ? "text-slate-400" : saldo > 0 ? "text-amber-600" : "text-rose-600"}`}>
                                                {saldo === 0 ? "-" : saldo > 0 ? `Devolver R$ ${saldo.toFixed(2)}` : `Reembolsar R$ ${Math.abs(saldo).toFixed(2)}`}
                                            </td>
                                            <td className="py-4 px-6 text-center">{getStatusBadge(item.status)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
