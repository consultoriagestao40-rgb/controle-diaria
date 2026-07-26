"use client"

import { useState, useEffect } from "react"
import {
    Receipt, FileSpreadsheet, Printer, Search, Filter, Loader2, ArrowLeft,
    TrendingUp, DollarSign, Zap, Building2, MapPin, Calendar, Percent, CheckCircle2, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"

interface FaturamentoItem {
    id: string
    data: string
    postoNome: string
    empresaNome: string
    diaristaNome: string
    reservaNome: string
    motivo: string
    valorDiaria: number
    taxaServicoPercentual: number
    valorTaxaServico: number
    valorFaturaCliente: number
    antecipada: boolean
    taxaAntecipacaoRetida: number
    valorPagoDiarista: number
    lucroPlantao: number
    status: string
}

interface TotaisFaturamento {
    qtdPlantoes: number
    totalDiariasBruto: number
    totalTaxaServicoCliente: number
    totalFaturaCliente: number
    totalCustoDiarista: number
    totalGanhoAntecipacao: number
    totalLucroPrestadora: number
}

export default function FaturamentoClientesPage() {
    const [items, setItems] = useState<FaturamentoItem[]>([])
    const [totais, setTotais] = useState<TotaisFaturamento | null>(null)
    const [loading, setLoading] = useState(true)

    // Filtros
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [empresaId, setEmpresaId] = useState("ALL")
    const [postoId, setPostoId] = useState("ALL")
    const [search, setSearch] = useState("")

    // Catalogs
    const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
    const [postos, setPostos] = useState<{ id: string; nome: string }[]>([])

    // Taxa do cliente
    const [taxaServicoInput, setTaxaServicoInput] = useState<number>(10.0)
    const [savingTaxa, setSavingTaxa] = useState(false)

    const fetchFaturamento = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (startDate) params.append("start", startDate)
            if (endDate) params.append("end", endDate)
            if (empresaId !== "ALL") params.append("empresaId", empresaId)
            if (postoId !== "ALL") params.append("postoId", postoId)

            const res = await fetch(`/api/admin/faturamento?${params.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()

            setItems(data.items || [])
            setTotais(data.totais || null)
            if (data.config?.taxaServicoClientePercentual !== undefined) {
                setTaxaServicoInput(data.config.taxaServicoClientePercentual)
            }
        } catch {
            toast.error("Erro ao carregar dados de faturamento.")
        } finally {
            setLoading(false)
        }
    }

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) {
                const data = await res.json()
                setEmpresas(data.empresas || [])
                setPostos(data.postos || [])
            }
        } catch { }
    }

    useEffect(() => {
        fetchOptions()
        fetchFaturamento()
    }, [])

    const handleSalvarTaxaServico = async () => {
        setSavingTaxa(true)
        try {
            const res = await fetch("/api/admin/faturamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taxaServicoClientePercentual: taxaServicoInput })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao salvar taxa.")

            toast.success("Taxa de Serviço do Cliente atualizada com sucesso!")
            fetchFaturamento()
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar taxa.")
        } finally {
            setSavingTaxa(false)
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    const filteredItems = items.filter(item => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            item.empresaNome.toLowerCase().includes(s) ||
            item.postoNome.toLowerCase().includes(s) ||
            item.diaristaNome.toLowerCase().includes(s) ||
            item.reservaNome.toLowerCase().includes(s)
        )
    })

    const handlePrintInvoice = () => {
        window.print()
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-primary" />
                            Fechamento & Faturamento de Clientes
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Demonstrativo financeiro para emissão de fatura aos clientes contratantes e apuração de resultados da prestadora.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrintInvoice} className="rounded-xl border-slate-200 font-bold text-slate-700">
                        <Printer className="h-4 w-4 mr-2" /> Espelho da Fatura (PDF)
                    </Button>
                    <Button
                        onClick={() => {
                            const params = new URLSearchParams()
                            if (startDate) params.append("start", startDate)
                            if (endDate) params.append("end", endDate)
                            window.open(`/api/finance/export?${params.toString()}`, '_blank')
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Painel de Configuração Rápida de Taxa do Cliente */}
            <Card className="bg-slate-900 text-white rounded-3xl border-slate-800 shadow-xl overflow-hidden print:hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Taxa de Gestão / Serviço</Badge>
                            <span className="text-xs text-slate-400 font-medium">Acréscimo de Margem da Prestadora</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight">Configurar Taxa de Serviço do Cliente (%)</h3>
                        <p className="text-xs text-slate-400 max-w-xl">
                            Esta taxa de acréscimo é aplicada sobre o valor bruto das diárias para compor a fatura final cobrada do cliente. O desconto de antecipação do diarista continua retido como receita interna da sua plataforma.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                        <div className="relative w-28">
                            <Input
                                type="number"
                                step="0.5"
                                value={taxaServicoInput}
                                onChange={(e) => setTaxaServicoInput(Number(e.target.value))}
                                className="bg-slate-900 border-slate-700 text-white font-black text-right pr-7 rounded-xl"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                        </div>
                        <Button
                            onClick={handleSalvarTaxaServico}
                            disabled={savingTaxa}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl"
                        >
                            {savingTaxa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Taxa"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Filtros de Busca */}
            <Card className="rounded-3xl border-slate-200 shadow-sm print:hidden">
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Início</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Fim</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cliente / Empresa</label>
                            <Select value={empresaId} onValueChange={setEmpresaId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Clientes</SelectItem>
                                    {empresas.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Posto de Trabalho</label>
                            <Select value={postoId} onValueChange={setPostoId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Postos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Postos</SelectItem>
                                    {postos.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <div className="relative flex-1">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                                placeholder="Buscar por cliente, posto ou diarista..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 rounded-xl border-slate-200"
                            />
                        </div>
                        <Button onClick={fetchFaturamento} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white">
                            <Filter className="h-4 w-4 mr-2" /> Filtrar Fechamento
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Gerenciais (Visão da Prestadora de Serviços) */}
            {totais && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                    {/* 1. Total Fatura Cliente */}
                    <Card className="bg-gradient-to-br from-cyan-950/90 to-slate-900 text-white rounded-3xl border-cyan-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">Fatura do Cliente</span>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {formatCurrency(totais.totalFaturaCliente)}
                                </div>
                                <p className="text-[10px] text-cyan-300/80 font-medium">{totais.qtdPlantoes} plantões prestados</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                                <Receipt className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Receita Taxa de Serviço (Cliente) */}
                    <Card className="bg-gradient-to-br from-emerald-950/90 to-slate-900 text-white rounded-3xl border-emerald-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Taxa de Serviço ({taxaServicoInput}%)</span>
                                <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                    {formatCurrency(totais.totalTaxaServicoCliente)}
                                </div>
                                <p className="text-[10px] text-slate-400">Margem faturada ao cliente</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <Percent className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Receita de Antecipações (Ganho Diaristas) */}
                    <Card className="bg-gradient-to-br from-amber-950/90 to-slate-900 text-white rounded-3xl border-amber-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Ganho c/ Antecipação</span>
                                <div className="text-2xl font-black text-amber-400 tracking-tight">
                                    {formatCurrency(totais.totalGanhoAntecipacao)}
                                </div>
                                <p className="text-[10px] text-slate-400">Retenção interna da plataforma</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Zap className="h-6 w-6 fill-amber-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Lucro Total da Prestadora */}
                    <Card className="bg-gradient-to-br from-indigo-950/90 to-slate-900 text-white rounded-3xl border-indigo-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">Lucro Bruto Prestadora</span>
                                <div className="text-2xl font-black text-indigo-300 tracking-tight">
                                    {formatCurrency(totais.totalLucroPrestadora)}
                                </div>
                                <p className="text-[10px] text-slate-400">Taxa Serviço + Antecipações</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TABELA DO FECHAMENTO & ESPELHO DA FATURA DO CLIENTE */}
            <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 tracking-tight">Espelho de Fechamento de Plantões</h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Demonstrativo discriminado por data, cliente, posto e valor final da fatura.
                        </p>
                    </div>
                    {totais && (
                        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-right">
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Valor Total da Fatura</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(totais.totalFaturaCliente)}</span>
                        </div>
                    )}
                </div>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center p-12 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Processando faturamento...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm font-medium">
                            Nenhum plantão aprovado encontrado para este período ou cliente.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-6">Data</th>
                                        <th className="py-3.5 px-6">Cliente / Empresa</th>
                                        <th className="py-3.5 px-6">Posto de Trabalho</th>
                                        <th className="py-3.5 px-6">Prestador / Diarista</th>
                                        <th className="py-3.5 px-6 text-right">Valor Diária</th>
                                        <th className="py-3.5 px-6 text-right">Taxa Serviço ({taxaServicoInput}%)</th>
                                        <th className="py-3.5 px-6 text-right">Valor Fatura</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-4 px-6 font-medium text-slate-700">
                                                {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">
                                                {item.empresaNome}
                                            </td>
                                            <td className="py-4 px-6 font-semibold text-slate-700">
                                                {item.postoNome}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-700">
                                                {item.diaristaNome}
                                            </td>
                                            <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                {formatCurrency(item.valorDiaria)}
                                            </td>
                                            <td className="py-4 px-6 text-right font-semibold text-emerald-600">
                                                +{formatCurrency(item.valorTaxaServico)}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                                                {formatCurrency(item.valorFaturaCliente)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rodapé do Relatório */}
            <div className="text-center text-xs text-slate-400 font-medium py-4 print:block">
                Relatório de Fechamento de Fatura gerado pelo Sistema de Gestão de Diárias em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}.
            </div>
        </div>
    )
}
