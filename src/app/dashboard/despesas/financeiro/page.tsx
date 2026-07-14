"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2, AlertCircle, Calendar, Receipt, FileText, CheckCircle, Wallet, ArrowRightLeft, X, XCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { AttachmentViewer } from "@/components/dashboard/attachment-viewer"
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"

interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    createdAt: string
    solicitante: { nome: string, email: string; role?: string }
    anexos: any[]
    alertaAuditoria: string | null
    itens?: any[]
    aprovador?: { nome: string; email: string } | null
    dataAprovacao?: string | null
    justificativaAprovacao?: string | null
}

export default function FinanceiroDespesasPage() {
    const [despesasAprovadas, setDespesasAprovadas] = useState<Despesa[]>([])
    const [despesasPendentesPrestacao, setDespesasPendentesPrestacao] = useState<Despesa[]>([])
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState<"PAGAMENTOS" | "CONCILIACOES">("PAGAMENTOS")

    // Estados para o Modal de Ação Financeira
    const [actionModalOpen, setActionModalOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [observacao, setObservacao] = useState("")
    const [isRejection, setIsRejection] = useState(false)
    const [motivosDisponiveis, setMotivosDisponiveis] = useState<string[]>([])
    const [motivoSelecionado, setMotivoSelecionado] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Filtros de Pesquisa e Agrupador
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedColaborador, setSelectedColaborador] = useState("")

    // Colaboradores únicos dinamicamente com base nas duas listas
    const colaboradoresUnicos = Array.from(
        new Set([
            ...despesasAprovadas.map(d => d.solicitante.nome),
            ...despesasPendentesPrestacao.map(d => d.solicitante.nome)
        ])
    ).sort()

    // Filtragem dinâmica de pagamentos
    const filteredPagamentos = despesasAprovadas.filter(d => {
        const matchesSearch = 
            d.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.solicitante.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.id.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesColaborador = selectedColaborador ? d.solicitante.nome === selectedColaborador : true
        
        return matchesSearch && matchesColaborador
    })

    // Filtragem dinâmica de conciliações
    const filteredConciliacoes = despesasPendentesPrestacao.filter(d => {
        const matchesSearch = 
            d.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.solicitante.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.id.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesColaborador = selectedColaborador ? d.solicitante.nome === selectedColaborador : true
        
        return matchesSearch && matchesColaborador
    })

    // Totais de Pagamentos (A Pagar)
    const totalPagamentosValor = filteredPagamentos.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)
    const pagamentosReembolsos = filteredPagamentos.filter(d => d.tipo === 'REEMBOLSO')
    const totalReembolsosPagar = pagamentosReembolsos.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)
    const pagamentosAdiantamentos = filteredPagamentos.filter(d => d.tipo === 'ADIANTAMENTO')
    const totalAdiantamentosPagar = pagamentosAdiantamentos.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)

    // Totais de Conciliações
    const totalConciliacoesValorAcertar = filteredConciliacoes.reduce((acc, curr) => acc + Number(curr.saldoFinal || 0), 0)
    const aReceberColaborador = filteredConciliacoes.filter(d => (d.saldoFinal ? Number(d.saldoFinal) : 0) > 0)
    const totalAReceber = aReceberColaborador.reduce((acc, curr) => acc + Number(curr.saldoFinal), 0)
    const aPagarColaborador = filteredConciliacoes.filter(d => (d.saldoFinal ? Number(d.saldoFinal) : 0) < 0)
    const totalAPagarComplementar = aPagarColaborador.reduce((acc, curr) => acc + Math.abs(Number(curr.saldoFinal)), 0)

    useEffect(() => {
        fetchFinanceData()
        fetch("/api/politicas")
            .then(res => res.json())
            .then(data => {
                if (data.auditoria?.motivosRejeicao) {
                    const list = data.auditoria.motivosRejeicao
                        .split(",")
                        .map((m: string) => m.trim())
                        .filter((m: string) => m.length > 0)
                    setMotivosDisponiveis(list)
                } else {
                    setMotivosDisponiveis(["Fora da política", "Despesas não autorizada", "Comprovante ilegível", "Outros"])
                }
            })
            .catch(() => {
                setMotivosDisponiveis(["Fora da política", "Despesas não autorizada", "Comprovante ilegível", "Outros"])
            })
    }, [])

    const fetchFinanceData = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/despesas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            
            // Pagamentos iniciais
            const aprovadas = data.filter((d: Despesa) => d.status === 'APROVADO')
            setDespesasAprovadas(aprovadas)

            // Conciliações pendentes
            const conciliacoes = data.filter(
                (d: Despesa) => d.status === 'AGUARDANDO_CONCILIACAO' || 
                                (d.status === 'AGUARDANDO_PRESTACAO' && d.valorComprovado !== null && d.saldoFinal !== null && d.saldoFinal !== 0)
            )
            setDespesasPendentesPrestacao(conciliacoes)
        } catch {
            toast.error("Erro ao sincronizar informações com o servidor")
        } finally {
            setLoading(false)
        }
    }

    const openActionModal = (despesa: Despesa) => {
        setSelectedDespesa(despesa)
        setObservacao("")
        setIsRejection(false)
        setMotivoSelecionado("")
        setActionModalOpen(true)
    }

    const handleActionSubmit = async () => {
        if (!selectedDespesa) return

        setSubmitting(true)
        const isReconciliation = selectedDespesa.status === 'AGUARDANDO_PRESTACAO' || selectedDespesa.status === 'AGUARDANDO_CONCILIACAO'
        const endpoint = isReconciliation 
            ? `/api/despesas/${selectedDespesa.id}/conciliar`
            : `/api/despesas/${selectedDespesa.id}/pagar`

        const finalJustificativa = motivoSelecionado === "Outro" || !motivoSelecionado 
            ? observacao 
            : motivoSelecionado + (observacao ? `: ${observacao}` : "")

        const bodyPayload = isReconciliation
            ? { 
                action: isRejection ? 'REJEITAR' : 'CONCILIAR', 
                observacao: isRejection ? null : observacao,
                justificativa: isRejection ? finalJustificativa : null
              }
            : { observacao }

        try {
            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao processar baixa financeira")
            }

            toast.success(
                isReconciliation
                    ? isRejection
                        ? "Prestação de contas rejeitada e devolvida ao colaborador."
                        : "Prestação de contas aprovada e fluxo concluído!"
                    : "Pagamento registrado com sucesso!"
            )
            setActionModalOpen(false)
            fetchFinanceData()
        } catch (error: any) {
            toast.error(error.message || "Erro ao registrar transação")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto pt-4 relative">
            {/* Header / Top Banner */}
            <div className="relative -mt-8 -mx-4 md:mt-0 md:mx-0 p-6 md:p-0 bg-slate-950 md:bg-transparent text-white md:text-slate-900 border-b md:border-none border-emerald-500/20 overflow-hidden shadow-lg md:shadow-none md:space-y-1 md:block flex flex-col justify-center w-[calc(100%+2rem)] md:w-auto">
                {/* Glows for App View */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 md:hidden" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 md:hidden" />
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight text-white md:text-slate-900">
                    Painel <span className="text-emerald-400 md:text-primary italic">Financeiro de Despesas</span>
                </h1>
                <p className="text-emerald-500/60 md:text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1 md:mt-0">
                    Gerencie os pagamentos e conciliações de saldos de despesas
                </p>
            </div>

            {/* Cards de Resumo no Topo */}
            {!loading && (
                activeSection === "PAGAMENTOS" ? (
                    despesasAprovadas.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total a Pagar</span>
                                <h3 className="text-2xl font-black text-slate-900">R$ {totalPagamentosValor.toFixed(2)}</h3>
                                <p className="text-xs font-semibold text-slate-400">{filteredPagamentos.length} pagamentos pendentes</p>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest block">Reembolsos Aprovados</span>
                                <h3 className="text-2xl font-black text-rose-600">R$ {totalReembolsosPagar.toFixed(2)}</h3>
                                <p className="text-xs font-semibold text-slate-400">{pagamentosReembolsos.length} itens a pagar</p>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest block">Adiantamentos Aprovados</span>
                                <h3 className="text-2xl font-black text-emerald-600">R$ {totalAdiantamentosPagar.toFixed(2)}</h3>
                                <p className="text-xs font-semibold text-slate-400">{pagamentosAdiantamentos.length} adiantamentos a liberar</p>
                            </div>
                        </div>
                    )
                ) : (
                    despesasPendentesPrestacao.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Saldo Líquido de Acerto</span>
                                <h3 className={`text-2xl font-black ${totalConciliacoesValorAcertar === 0 ? "text-green-600" : totalConciliacoesValorAcertar > 0 ? "text-amber-600" : "text-rose-600"}`}>
                                    {totalConciliacoesValorAcertar === 0 ? "Zerado" : `${totalConciliacoesValorAcertar > 0 ? 'A Receber' : 'A Pagar'} R$ ${Math.abs(totalConciliacoesValorAcertar).toFixed(2)}`}
                                </h3>
                                <p className="text-xs font-semibold text-slate-400">{filteredConciliacoes.length} conciliações pendentes</p>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest block">A Receber (Colaborador Devolve)</span>
                                <h3 className="text-2xl font-black text-amber-600">R$ {totalAReceber.toFixed(2)}</h3>
                                <p className="text-xs font-semibold text-slate-400">{aReceberColaborador.length} devoluções de saldo</p>
                            </div>
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                                <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest block">A Pagar (Reembolso Complementar)</span>
                                <h3 className="text-2xl font-black text-rose-600">R$ {totalAPagarComplementar.toFixed(2)}</h3>
                                <p className="text-xs font-semibold text-slate-400">{aPagarColaborador.length} reembolsos complementares</p>
                            </div>
                        </div>
                    )
                )
            )}

            {/* Abas minimalistas com rolagem horizontal no mobile */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:max-w-md overflow-x-auto scrollbar-none flex-nowrap">
                {(["PAGAMENTOS", "CONCILIACOES"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest whitespace-nowrap transition-all duration-300 ${
                            activeSection === tab
                                ? "bg-white text-slate-900 shadow-sm font-black"
                                : "text-slate-500 hover:text-slate-900 hover:bg-white/30"
                        }`}
                    >
                        {tab === "PAGAMENTOS" ? `Pagamentos Iniciais (${filteredPagamentos.length})` : `Conciliações (${filteredConciliacoes.length})`}
                    </button>
                ))}
            </div>

            {/* Listagem */}
            <div className="space-y-6">
                {/* Filtros de Pesquisa e Agrupador */}
                {!loading && (despesasAprovadas.length > 0 || despesasPendentesPrestacao.length > 0) && (
                    <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por colaborador, descrição ou ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 border border-slate-100 rounded-2xl bg-slate-50/50 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-hidden text-slate-700"
                            />
                        </div>
                        <div className="w-full sm:w-60">
                            <select
                                value={selectedColaborador}
                                onChange={(e) => setSelectedColaborador(e.target.value)}
                                className="w-full h-11 border border-slate-100 rounded-2xl px-3 bg-slate-50/50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-hidden cursor-pointer"
                            >
                                <option value="">Todos os Colaboradores</option>
                                {colaboradoresUnicos.map((nome) => (
                                    <option key={nome} value={nome}>{nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-6">
                        <div className="relative h-16 w-16">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Carregando painel financeiro...</p>
                    </div>
                ) : (
                    <>
                        {activeSection === "PAGAMENTOS" ? (
                            filteredPagamentos.length === 0 ? (
                                <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-85">
                                    <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <DollarSign className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                        Nenhum pagamento correspondente aos filtros.
                                    </div>
                                </Card>
                            ) : (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <th className="py-4.5 px-6">Data</th>
                                                    <th className="py-4.5 px-6">Tipo</th>
                                                    <th className="py-4.5 px-6">Colaborador</th>
                                                    <th className="py-4.5 px-6">Descrição</th>
                                                    <th className="py-4.5 px-6 text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100/60">
                                                {filteredPagamentos.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        onClick={() => openActionModal(item)}
                                                        className="hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700"
                                                    >
                                                        <td className="py-4.5 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                                <span className="font-semibold text-slate-700">
                                                                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4.5 px-6">
                                                            <Badge className={`border-0 font-bold px-2.5 py-0.5 rounded-lg text-xs ${
                                                                item.tipo === "REEMBOLSO"
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : "bg-emerald-100 text-emerald-800"
                                                            }`}>
                                                                {item.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-4.5 px-6 font-bold text-slate-900">
                                                            {item.solicitante.nome}
                                                        </td>
                                                        <td className="py-4.5 px-6 max-w-xs truncate text-slate-600 font-medium">
                                                            {item.descricao}
                                                        </td>
                                                        <td className="py-4.5 px-6 text-right font-black text-slate-900 tracking-tight text-base">
                                                            {formatCurrency(item.valorSolicitado)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Extrato List View */}
                                    <div className="block md:hidden bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mx-1">
                                        {filteredPagamentos.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                onClick={() => openActionModal(item)}
                                                className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer ${idx !== filteredPagamentos.length - 1 ? 'border-b border-slate-100/80' : ''}`}
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                                                        item.tipo === "REEMBOLSO" 
                                                            ? "bg-rose-50 text-rose-500 border border-rose-100" 
                                                            : "bg-emerald-50 text-emerald-500 border border-emerald-100"
                                                    }`}>
                                                        {item.tipo === "REEMBOLSO" ? <Receipt className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                                                    </div>
                                                    
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{item.descricao}</p>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider truncate">
                                                            {item.solicitante.nome} &bull; {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                                                    <p className="text-xs font-black text-slate-900 tracking-tight">
                                                        {formatCurrency(item.valorSolicitado)}
                                                    </p>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider border ${
                                                        item.tipo === 'REEMBOLSO' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                    }`}>
                                                        {item.tipo === 'REEMBOLSO' ? 'Reembolso' : 'Adiantamento'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )
                        ) : (
                            filteredConciliacoes.length === 0 ? (
                                <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-85">
                                    <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <DollarSign className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                        Nenhuma conciliação correspondente aos filtros.
                                    </div>
                                </Card>
                            ) : (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <th className="py-4.5 px-6">Data</th>
                                                    <th className="py-4.5 px-6">Tipo</th>
                                                    <th className="py-4.5 px-6">Colaborador</th>
                                                    <th className="py-4.5 px-6">Descrição</th>
                                                    <th className="py-4.5 px-6 text-right">Comprovado</th>
                                                    <th className="py-4.5 px-6 text-right">Diferença</th>
                                                    <th className="py-4.5 px-6 text-right">Valor Inicial</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100/60">
                                                {filteredConciliacoes.map(item => {
                                                    const saldo = item.saldoFinal ? Number(item.saldoFinal) : 0
                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            onClick={() => openActionModal(item)}
                                                            className="hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700"
                                                        >
                                                            <td className="py-4.5 px-6">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                                    <span className="font-semibold text-slate-700">
                                                                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4.5 px-6">
                                                                <Badge className="border-0 font-bold px-2.5 py-0.5 rounded-lg text-xs bg-orange-100 text-orange-800">
                                                                    Prestação
                                                                </Badge>
                                                            </td>
                                                            <td className="py-4.5 px-6 font-bold text-slate-900">
                                                                {item.solicitante.nome}
                                                            </td>
                                                            <td className="py-4.5 px-6 max-w-xs truncate text-slate-600 font-medium">
                                                                {item.descricao}
                                                            </td>
                                                            <td className="py-4.5 px-6 text-right text-slate-700 font-semibold">
                                                                {formatCurrency(item.valorComprovado || 0)}
                                                            </td>
                                                            <td className={`py-4.5 px-6 text-right font-bold text-xs ${
                                                                saldo > 0 ? "text-amber-600" : "text-rose-600"
                                                            }`}>
                                                                {saldo > 0 ? `Devolver ${formatCurrency(saldo)}` : `Pagar ${formatCurrency(Math.abs(saldo))}`}
                                                            </td>
                                                            <td className="py-4.5 px-6 text-right font-black text-slate-900 tracking-tight text-base">
                                                                {formatCurrency(item.valorSolicitado)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Extrato List View */}
                                    <div className="block md:hidden bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mx-1">
                                        {filteredConciliacoes.map((item, idx) => {
                                            const saldo = item.saldoFinal ? Number(item.saldoFinal) : 0
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => openActionModal(item)}
                                                    className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer ${
                                                        idx !== filteredConciliacoes.length - 1 ? 'border-b border-slate-100/80' : ''
                                                    }`}
                                                >
                                                    <div className="min-w-0 space-y-1">
                                                        <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{item.descricao}</p>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider truncate">
                                                            Prestação &bull; {item.solicitante.nome} &bull; {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">
                                                            {formatCurrency(item.valorSolicitado)}
                                                        </p>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                                            saldo > 0 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50"
                                                        }`}>
                                                            {saldo > 0 ? `Devolver: ${formatCurrency(saldo)}` : `Pagar: ${formatCurrency(Math.abs(saldo))}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Modal Unificado de Detalhes e Baixa Financeira */}
            <Dialog open={actionModalOpen && !!selectedDespesa} onOpenChange={(open) => !open && setActionModalOpen(false)}>
                <DialogContent showCloseButton={false} className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-slate-50">
                    {selectedDespesa && (
                        <div className="flex flex-col max-h-[90vh] bg-slate-50 w-full h-full">
                            {/* Header */}
                            <div className="bg-white p-6 border-b border-slate-100 flex flex-col gap-2 shrink-0 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className={`border-0 font-bold px-3 py-1 rounded-lg ${
                                            selectedDespesa.tipo === "REEMBOLSO"
                                                ? "bg-rose-100 text-rose-800"
                                                : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            {selectedDespesa.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            ID: {selectedDespesa.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <DialogClose className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-all cursor-pointer shrink-0">
                                        <X className="h-5 w-5" />
                                    </DialogClose>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {formatCurrency(selectedDespesa.valorSolicitado)}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold pt-0.5">
                                        Colaborador beneficiário: <span className="text-slate-700">{selectedDespesa.solicitante.nome}</span> ({selectedDespesa.solicitante.email})
                                    </p>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-slate-700 bg-slate-50">
                                {/* Alertas de Auditoria */}
                                {selectedDespesa.alertaAuditoria && (
                                    <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs font-bold flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                        <span>{selectedDespesa.alertaAuditoria}</span>
                                    </div>
                                )}

                                {/* Descrição / Finalidade */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finalidade / Descrição</Label>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 text-sm text-slate-600 font-semibold italic">
                                        "{selectedDespesa.descricao}"
                                    </div>
                                </div>

                                {/* Validação e Aprovação */}
                                {selectedDespesa.aprovador && (
                                    <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                            <CheckCircle className="h-3.5 w-3.5 text-slate-400" />
                                            Validação e Aprovação
                                        </h4>
                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Aprovador</span>
                                            <span className="font-bold text-slate-700 text-xs block">{selectedDespesa.aprovador.nome}</span>
                                            {selectedDespesa.dataAprovacao && (
                                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                                    Aprovado em: {new Date(selectedDespesa.dataAprovacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {selectedDespesa.justificativaAprovacao && (
                                                <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">"{selectedDespesa.justificativaAprovacao}"</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Resumo de Saldos para Prestação de Contas */}
                                {(selectedDespesa.status === 'AGUARDANDO_PRESTACAO' || selectedDespesa.status === 'AGUARDANDO_CONCILIACAO') && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo de Saldos</Label>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                                                <p className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Valor Solicitado</p>
                                                <p className="text-sm font-black text-slate-900 mt-0.5">{formatCurrency(selectedDespesa.valorSolicitado)}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                                                <p className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Valor Comprovado</p>
                                                <p className="text-sm font-black text-slate-900 mt-0.5">{formatCurrency(selectedDespesa.valorComprovado || 0)}</p>
                                            </div>
                                        </div>

                                        {selectedDespesa.saldoFinal !== null && selectedDespesa.saldoFinal !== 0 && (
                                            <div className={`p-4 rounded-xl border font-bold text-xs space-y-1 ${
                                                selectedDespesa.saldoFinal > 0
                                                    ? "bg-amber-50 text-amber-800 border-amber-100"
                                                    : "bg-rose-50 text-rose-800 border-rose-100"
                                            }`}>
                                                {selectedDespesa.saldoFinal > 0 ? (
                                                    <p>💰 **O colaborador deve DEVOLVER R$ {Number(selectedDespesa.saldoFinal).toFixed(2)}** à empresa (gastou menos do que recebeu).</p>
                                                ) : (
                                                    <p>💸 **A empresa deve REEMBOLSAR complementar de R$ {Math.abs(Number(selectedDespesa.saldoFinal)).toFixed(2)}** ao colaborador (gastou mais do que recebeu).</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Itens da Despesa (se houver) */}
                                {selectedDespesa.itens && selectedDespesa.itens.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Lançados ({selectedDespesa.itens.length})</Label>
                                        <div className="border rounded-xl overflow-hidden bg-white shadow-xs divide-y">
                                            {selectedDespesa.itens.map((item: any) => (
                                                <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-slate-900">{item.descricao}</div>
                                                        <div className="text-slate-400 font-medium">
                                                            {item.categoria} &bull; {item.quantidade}x {formatCurrency(item.valorUnitario)}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-slate-900 shrink-0">
                                                        {formatCurrency(item.valorTotal)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Documentos / Comprovantes */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprovantes ({selectedDespesa.anexos?.length || 0})</Label>
                                    {selectedDespesa.anexos && selectedDespesa.anexos.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedDespesa.anexos.map((anexo: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setPreviewAnexo(anexo)}
                                                    className="flex items-center gap-1.5 bg-white border px-3 py-2.5 rounded-xl text-xs font-semibold text-primary hover:bg-slate-50 transition-all shadow-xs w-full text-left cursor-pointer"
                                                >
                                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="truncate flex-1">{anexo.nomeOriginal}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic text-xs">Nenhum comprovante anexado.</p>
                                    )}
                                </div>

                                <div className="border-t border-slate-200/60 pt-4 space-y-4">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ação Financeira (Baixa)</h4>

                                    {/* Seletor de Ação para Conciliação */}
                                    {(selectedDespesa.status === 'AGUARDANDO_PRESTACAO' || selectedDespesa.status === 'AGUARDANDO_CONCILIACAO') && (
                                        <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setIsRejection(false)}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                                                    !isRejection 
                                                        ? "bg-white text-slate-900 shadow-sm" 
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/30"
                                                }`}
                                            >
                                                Baixar Conciliação
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsRejection(true)}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                                                    isRejection 
                                                        ? "bg-red-600 text-white shadow-sm" 
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/30"
                                                }`}
                                            >
                                                Devolver p/ Correção
                                            </button>
                                        </div>
                                    )}

                                    {/* Campo de observações ou motivo de rejeição */}
                                    {isRejection ? (
                                        <div className="space-y-3 pt-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Selecione o Motivo da Devolução *</Label>
                                                <select
                                                    value={motivoSelecionado}
                                                    onChange={(e) => setMotivoSelecionado(e.target.value)}
                                                    className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-white font-semibold text-xs focus:ring-primary focus:border-primary"
                                                >
                                                    <option value="">Selecione o motivo...</option>
                                                    {motivosDisponiveis.map((m) => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                    <option value="Outro">Outro (especificar abaixo)</option>
                                                </select>
                                            </div>
                                            {(motivoSelecionado === "Outro" || !motivoSelecionado) && (
                                                <div className="space-y-1">
                                                    <Label htmlFor="justificativa" className="font-bold text-slate-700 text-xs">Detalhes do Parecer *</Label>
                                                    <Textarea
                                                        id="justificativa"
                                                        placeholder="Descreva em detalhes o que o colaborador precisa ajustar na prestação..."
                                                        rows={3}
                                                        value={observacao}
                                                        onChange={(e) => setObservacao(e.target.value)}
                                                        className="rounded-xl border-slate-200 bg-white"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pt-2">
                                            <Label htmlFor="observacao" className="font-bold text-slate-700 text-xs">Observações Internas (Opcional)</Label>
                                            <Textarea
                                                id="observacao"
                                                placeholder={selectedDespesa.status === 'APROVADO' 
                                                    ? "Ex: Pago via PIX corporativo, Transação ID: 827419..." 
                                                    : "Ex: Devolução recebida em conta corrente..."}
                                                rows={3}
                                                value={observacao}
                                                onChange={(e) => setObservacao(e.target.value)}
                                                className="rounded-xl border-slate-200 bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-white p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => setActionModalOpen(false)}
                                    className="w-full sm:w-auto order-last sm:order-first h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-100 border-slate-200"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    disabled={submitting || (isRejection && motivoSelecionado === "Outro" && !observacao)}
                                    onClick={handleActionSubmit}
                                    className={`h-10 px-6 rounded-xl text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 shadow-md w-full sm:w-auto cursor-pointer ${
                                        isRejection ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-primary"
                                    }`}
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            <span>
                                                {selectedDespesa.status === 'APROVADO' 
                                                    ? "Confirmar Pagamento" 
                                                    : isRejection 
                                                        ? "Confirmar Devolução" 
                                                        : "Confirmar Baixa"}
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AttachmentViewer anexo={previewAnexo} onClose={() => setPreviewAnexo(null)} />
        </div>
    )
}
