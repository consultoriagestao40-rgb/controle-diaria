"use client"

import { useState, useEffect } from "react"
import {
    Zap, CheckCircle2, XCircle, Clock, Search, ArrowUpRight,
    UserCheck, DollarSign, Calendar, MapPin, Loader2, AlertCircle, Percent, Settings, Save, Check, Filter, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Antecipacao {
    id: string
    coberturaId: string
    valorOriginal: number
    valorSolicitado: number
    taxaServico: number
    status: "PENDENTE" | "APROVADO" | "REPROVADO" | "PAGO"
    justificativa: string | null
    solicitadoEm: string
    diarista: {
        id: string
        nome: string
        cpf: string
        chavePix: string
    }
    cobertura: {
        id: string
        data: string
        posto: {
            nome: string
        }
        ponto: {
            status: string
            checkInAt: string
            checkOutAt: string | null
        } | null
    }
}

export default function GestaoAntecipacoesPage() {
    const [antecipacoes, setAntecipacoes] = useState<Antecipacao[]>([])
    const [taxaPercentual, setTaxaPercentual] = useState<number>(5.0)
    const [politicaVencimentoTipo, setPoliticaVencimentoTipo] = useState<string>("TODA_SEXTA")
    const [politicaVencimentoDias, setPoliticaVencimentoDias] = useState<number>(7)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [savingTaxa, setSavingTaxa] = useState(false)
    const [selectedItem, setSelectedItem] = useState<Antecipacao | null>(null)

    const fetchAntecipacoes = async () => {
        try {
            const res = await fetch("/api/admin/antecipacoes")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setAntecipacoes(data.antecipacoes || [])
            if (data.taxaPercentual !== undefined) setTaxaPercentual(data.taxaPercentual)
            if (data.politicaVencimentoTipo) setPoliticaVencimentoTipo(data.politicaVencimentoTipo)
            if (data.politicaVencimentoDias !== undefined) setPoliticaVencimentoDias(data.politicaVencimentoDias)
        } catch {
            toast.error("Erro ao carregar solicitações de antecipação.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAntecipacoes()
    }, [])

    const handleSalvarPoliticas = async () => {
        setSavingTaxa(true)
        try {
            const res = await fetch("/api/admin/antecipacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    novaTaxaPercentual: taxaPercentual,
                    politicaVencimentoTipo,
                    politicaVencimentoDias
                })
            })

            if (!res.ok) throw new Error()
            toast.success(`Políticas de antecipação e vencimento salvas com sucesso!`)
        } catch {
            toast.error("Erro ao salvar políticas.")
        } finally {
            setSavingTaxa(false)
        }
    }

    const handleAcao = async (antecipacaoId: string, acao: "APROVAR" | "REPROVAR") => {
        setActionLoading(true)
        try {
            const res = await fetch("/api/admin/antecipacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ antecipacaoId, acao })
            })

            if (!res.ok) throw new Error()

            toast.success(`Solicitação ${acao === "APROVAR" ? "aprovada" : "reprovada"} com sucesso!`)
            setSelectedItem(null)
            fetchAntecipacoes()
        } catch {
            toast.error("Erro ao processar solicitação.")
        } finally {
            setActionLoading(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const filteredItems = antecipacoes.filter(a => {
        const matchesSearch =
            a.diarista.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.cobertura.posto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.diarista.cpf && a.diarista.cpf.includes(searchTerm))

        const matchesStatus = statusFilter === "ALL" || a.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const totalPendente = antecipacoes.filter(a => a.status === "PENDENTE").reduce((acc, i) => acc + Number(i.valorSolicitado), 0)
    const totalTaxas = antecipacoes.filter(a => a.status === "PENDENTE").reduce((acc, i) => acc + Number(i.taxaServico), 0)

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header com os totais no mesmo padrao das outras telas */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-1">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Antecipações de Diárias
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                        Gestão de Adiantamentos de Saque dos Prestadores
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white border border-slate-100 shadow-sm px-4 py-2.5 rounded-2xl flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">Líquido Pendente</span>
                            <div className="text-xl font-black text-emerald-600 tracking-tighter mt-0.5">
                                {formatCurrency(totalPendente)}
                            </div>
                        </div>
                        <div className="h-8 w-0.5 bg-slate-100 rounded-full" />
                        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none block">Taxa Atual</span>
                            <div className="text-lg font-black text-white tracking-tighter mt-0.5 flex items-center gap-1">
                                <span>{taxaPercentual}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="50"
                                value={taxaPercentual}
                                onChange={e => setTaxaPercentual(Number(e.target.value))}
                                className="w-14 h-7 text-xs bg-slate-950 border-slate-700 text-white text-center font-bold rounded-lg p-0"
                            />
                            <Button
                                size="sm"
                                onClick={handleSalvarPoliticas}
                                disabled={savingTaxa}
                                className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg"
                            >
                                {savingTaxa ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros no padrao do sistema */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Pesquisar por prestador, CPF ou posto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 border-none bg-slate-50 rounded-xl text-sm font-medium focus:bg-white transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={statusFilter === "ALL" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("ALL")}
                        className="h-9 text-xs rounded-xl font-bold"
                    >
                        Todos ({antecipacoes.length})
                    </Button>
                    <Button
                        variant={statusFilter === "PENDENTE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("PENDENTE")}
                        className="h-9 text-xs rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white border-none"
                    >
                        Pendentes ({antecipacoes.filter(a => a.status === "PENDENTE").length})
                    </Button>
                    <Button
                        variant={statusFilter === "APROVADO" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("APROVADO")}
                        className="h-9 text-xs rounded-xl font-bold"
                    >
                        Aprovados ({antecipacoes.filter(a => a.status === "APROVADO").length})
                    </Button>
                </div>
            </div>

            {/* Tabela em Lista (Formato padrao das demais telas) */}
            {loading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">Carregando lista de antecipações...</span>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Nenhuma antecipação encontrada.</p>
                    <p className="text-xs text-slate-400">Nenhuma solicitação corresponde aos filtros selecionados.</p>
                </div>
            ) : (
                <>
                    {/* Tabela Desktop */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="py-4 px-6">Data Solicitada</th>
                                    <th className="py-4 px-6">Prestador / Diarista</th>
                                    <th className="py-4 px-6">Posto de Trabalho</th>
                                    <th className="py-4 px-6 text-right">Valor Bruto</th>
                                    <th className="py-4 px-6 text-right">Taxa ({taxaPercentual}%)</th>
                                    <th className="py-4 px-6 text-right">Valor Líquido (Pix)</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                    <th className="py-4 px-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600">
                                            {formatDate(item.solicitadoEm)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-900 text-sm">{item.diarista.nome}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">CPF: {item.diarista.cpf || "N/I"} • Pix: {item.diarista.chavePix || "N/I"}</div>
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-slate-700 text-xs">
                                            {item.cobertura.posto.nome}
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium text-slate-500 text-xs">
                                            {formatCurrency(Number(item.valorOriginal))}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-amber-600 text-xs">
                                            - {formatCurrency(Number(item.taxaServico))}
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-emerald-600 text-sm">
                                            {formatCurrency(Number(item.valorSolicitado))}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {item.status === "PENDENTE" && (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Aguardando</Badge>
                                            )}
                                            {item.status === "APROVADO" && (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Aprovado</Badge>
                                            )}
                                            {item.status === "REPROVADO" && (
                                                <Badge className="bg-rose-100 text-rose-800 border-rose-200">Reprovado</Badge>
                                            )}
                                            {item.status === "PAGO" && (
                                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pago</Badge>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {item.status === "PENDENTE" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAcao(item.id, "APROVAR")}
                                                        disabled={actionLoading}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 rounded-lg"
                                                    >
                                                        <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleAcao(item.id, "REPROVAR")}
                                                        disabled={actionLoading}
                                                        className="text-rose-600 hover:bg-rose-50 font-bold text-xs h-8 rounded-lg"
                                                    >
                                                        <X className="h-3.5 w-3.5 mr-1" /> Recusar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400">Processado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Lista Mobile */}
                    <div className="block md:hidden space-y-3 mx-1">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {formatDate(item.solicitadoEm)}
                                        </span>
                                        <h4 className="font-bold text-slate-900 text-sm">{item.diarista.nome}</h4>
                                        <p className="text-xs text-slate-500">{item.cobertura.posto.nome}</p>
                                    </div>
                                    <Badge className={item.status === "PENDENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                                        {item.status}
                                    </Badge>
                                </div>

                                <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Valor Bruto:</span>
                                        <span>{formatCurrency(Number(item.valorOriginal))}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-600 font-medium">
                                        <span>Taxa ({taxaPercentual}%):</span>
                                        <span>- {formatCurrency(Number(item.taxaServico))}</span>
                                    </div>
                                    <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                                        <span>Líquido no Pix:</span>
                                        <span className="text-emerald-600">{formatCurrency(Number(item.valorSolicitado))}</span>
                                    </div>
                                </div>

                                {item.status === "PENDENTE" && (
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            onClick={() => handleAcao(item.id, "APROVAR")}
                                            disabled={actionLoading}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl"
                                        >
                                            Aprovar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleAcao(item.id, "REPROVAR")}
                                            disabled={actionLoading}
                                            className="flex-1 text-rose-600 border-slate-200 hover:bg-rose-50 text-xs font-bold h-9 rounded-xl"
                                        >
                                            Reprovar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
