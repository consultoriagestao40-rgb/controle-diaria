"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Calendar, Download, ExternalLink, Search, Filter, RefreshCw, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"
import { cn, formatCurrency } from "@/lib/utils"

interface Item {
    id: string
    data: string
    dataPagamento: string
    posto: { nome: string }
    diarista: { nome: string; cpf?: string }
    valor: string
    meioPagamentoEfetivado?: { descricao: string }
    justificativaPagamento?: string
    financeiro: { nome: string }
    anexos: { id: string; url: string; nomeOriginal: string }[]
}

export default function FinanceHistoryPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams()
            if (search) query.append("search", search)
            if (startDate) query.append("start", startDate)
            if (endDate) query.append("end", endDate)

            const res = await fetch(`/api/finance/history?${query.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar histórico")
        } finally {
            setLoading(false)
        }
    }

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        fetchHistory()
    }

    const handleClearFilters = () => {
        setSearch("")
        setStartDate("")
        setEndDate("")
        fetchHistory()
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/financeiro">
                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 shadow-xs">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Histórico de Pagamentos</h1>
                        <p className="text-xs text-slate-500 font-medium">Registros completos de todas as baixas e comprovantes emitidos (Asaas e Conta Azul).</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 font-semibold"
                        onClick={async () => {
                            toast.info("Sincronizando com o Conta Azul...")
                            try {
                                const res = await fetch("/api/contaazul/sync", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({})
                                })
                                const data = await res.json()
                                if (data.success) {
                                    toast.success(data.message || "Sincronização concluída!")
                                    fetchHistory()
                                }
                            } catch {
                                toast.error("Erro ao sincronizar.")
                            }
                        }}
                    >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-sky-600" /> Sincronizar Conta Azul
                    </Button>
                    <Badge variant="secondary" className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {items.length} {items.length === 1 ? 'registro encontrado' : 'registros no histórico'}
                    </Badge>
                </div>
            </div>

            {/* Painel de Filtros e Busca */}
            <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar por Diarista, CPF ou Posto</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Digite o nome, CPF ou local de trabalho..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 rounded-xl border-slate-200 text-sm focus-visible:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-44 space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Inicial</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>

                        <div className="w-full md:w-44 space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Final</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border-slate-200 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Button type="submit" className="flex-1 md:flex-initial rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs gap-2">
                                <Filter className="h-3.5 w-3.5" />
                                Filtrar
                            </Button>
                            {(search || startDate || endDate) && (
                                <Button type="button" variant="outline" onClick={handleClearFilters} className="rounded-xl border-slate-200 text-xs gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Tabela de Histórico */}
            <Card className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregando histórico...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                            <FileText className="h-10 w-10 mx-auto text-slate-300" />
                            <p className="text-sm font-bold text-slate-600">Nenhum registro encontrado no histórico.</p>
                            <p className="text-xs text-slate-400">Tente ajustar os filtros de busca ou período.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-200">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Data Pagto</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Diarista / Posto</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Meio</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Valor</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Comprovante Pix</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Responsável</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const temComprovante = item.anexos && item.anexos.length > 0

                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-800">
                                                        {new Date(item.dataPagamento).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        Ref: {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-900">{item.diarista.nome}</span>
                                                    <span className="text-xs text-slate-500">{item.posto.nome}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-lg text-xs border-slate-200 bg-white font-medium text-slate-700">
                                                    {item.meioPagamentoEfetivado?.descricao || 'Pix Asaas'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-extrabold text-sm text-emerald-600">
                                                {formatCurrency(item.valor)}
                                            </TableCell>
                                            <TableCell>
                                                {temComprovante ? (() => {
                                                    const rawUrl = item.anexos[0].url
                                                    const isContaAzul = rawUrl.includes("contaazul") || item.anexos[0].nomeOriginal.toLowerCase().includes("contaazul")
                                                    const receiptHref = rawUrl.includes("asaas.com/comprovantes/")
                                                        ? `/api/asaas/comprovante/${rawUrl.split("asaas.com/comprovantes/")[1]}`
                                                        : rawUrl

                                                    return (
                                                        <a
                                                            href={receiptHref}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
                                                                isContaAzul
                                                                    ? "text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80"
                                                                    : "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80"
                                                            }`}
                                                            title={isContaAzul ? "Baixar Comprovante Oficial Conta Azul (PDF)" : "Baixar Comprovante Pix Oficial Asaas (PDF)"}
                                                        >
                                                            <Download className={`h-3.5 w-3.5 ${isContaAzul ? "text-sky-600" : "text-indigo-600"}`} />
                                                            <span>{isContaAzul ? "Comprovante ERP" : "Baixar Comprovante"}</span>
                                                        </a>
                                                    )
                                                })() : (
                                                    <span className="text-slate-400 text-xs italic font-medium">Processado</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-500">
                                                {item.financeiro?.nome || 'Sistema (Asaas)'}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
