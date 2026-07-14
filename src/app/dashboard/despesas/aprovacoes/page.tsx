"use client"

import { useState, useEffect } from "react"
import { CheckSquare, Loader2, AlertCircle, Calendar, Receipt, DollarSign, FileText, CheckCircle, XCircle, Clock, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { AttachmentViewer } from "@/components/dashboard/attachment-viewer"

interface Despesa {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    valorSolicitado: number
    valorComprovado: number | null
    saldoFinal: number | null
    createdAt: string
    solicitante: { nome: string, email: string, role: string }
    anexos: any[]
    alertaAuditoria: string | null
    itens?: any[]
    centroCusto?: { id: string, nome: string } | null
}

export default function AprovacoesDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)
    const [detailItem, setDetailItem] = useState<Despesa | null>(null)
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)

    // Estados para o Modal de Decisão (Aprovar/Reprovar)
    const [decisionModalOpen, setDecisionModalOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [actionType, setActionType] = useState<"APROVAR" | "REPROVAR">("APROVAR")
    const [justificativa, setJustificativa] = useState("")
    const [motivosDisponiveis, setMotivosDisponiveis] = useState<string[]>([])
    const [motivoSelecionado, setMotivoSelecionado] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Filtros de Pesquisa e Agrupador
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedSolicitante, setSelectedSolicitante] = useState("")

    // Solicitantes únicos com base na listagem atual
    const solicitantesUnicos = Array.from(
        new Set(despesas.map(d => d.solicitante.nome))
    ).sort()

    // Filtragem dinâmica
    const filteredDespesas = despesas.filter(d => {
        const matchesSearch = 
            d.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.solicitante.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.id.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesSolicitante = selectedSolicitante ? d.solicitante.nome === selectedSolicitante : true
        
        return matchesSearch && matchesSolicitante
    })

    // Totais calculados dinamicamente com base nas despesas filtradas
    const totalPendente = filteredDespesas.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)
    const reembolsos = filteredDespesas.filter(d => d.tipo === 'REEMBOLSO')
    const totalReembolsos = reembolsos.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)
    const adiantamentos = filteredDespesas.filter(d => d.tipo === 'ADIANTAMENTO')
    const totalAdiantamentos = adiantamentos.reduce((acc, curr) => acc + Number(curr.valorSolicitado), 0)

    useEffect(() => {
        fetchAprovacoes()
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

    const fetchAprovacoes = async () => {
        try {
            const res = await fetch("/api/despesas?status=AGUARDANDO_APROVACAO")
            if (!res.ok) throw new Error()
            const data = await res.json()
            // Filtrar apenas despesas comuns (Reembolsos e Adiantamentos iniciais que não têm valor comprovado)
            const solicitacoesNormais = data.filter((d: any) => !(d.tipo === 'ADIANTAMENTO' && d.valorComprovado !== null))
            setDespesas(solicitacoesNormais)
        } catch {
            toast.error("Erro ao carregar solicitações pendentes")
        } finally {
            setLoading(false)
        }
    }

    const openDecisionModal = (despesa: Despesa, action: "APROVAR" | "REPROVAR") => {
        setSelectedDespesa(despesa)
        setActionType(action)
        setJustificativa("")
        setMotivoSelecionado("")
        setDecisionModalOpen(true)
    }

    const handleDecisionSubmit = async () => {
        if (!selectedDespesa) return

        const finalJustificativa = motivoSelecionado === "Outro" || !motivoSelecionado 
            ? justificativa 
            : motivoSelecionado + (justificativa ? `: ${justificativa}` : "")

        if (actionType === "REPROVAR" && !finalJustificativa) {
            toast.error("O motivo ou justificativa é obrigatória para devoluções/reprovações.")
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch(`/api/despesas/${selectedDespesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: actionType,
                    justificativa: finalJustificativa
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao processar decisão")
            }

            toast.success(
                actionType === "APROVAR"
                    ? "Solicitação aprovada com sucesso!"
                    : selectedDespesa.tipo === "ADIANTAMENTO" && selectedDespesa.valorComprovado !== null
                        ? "Prestação devolvida para correção!"
                        : "Solicitação reprovada com sucesso."
            )
            setDecisionModalOpen(false)
            fetchAprovacoes()
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar decisão")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto pt-4 relative">
            {/* Header / Top Banner */}
            <div className="relative -mt-8 -mx-4 md:mt-0 md:mx-0 p-6 md:p-0 bg-slate-950 md:bg-transparent text-white md:text-slate-900 border-b md:border-none border-emerald-500/20 overflow-hidden shadow-lg md:shadow-none md:space-y-1 md:block flex flex-col justify-center">
                {/* Glows for App View */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 md:hidden" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 md:hidden" />
                
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight text-white md:text-slate-900">
                    Aprovação de <span className="text-emerald-400 md:text-primary italic">Despesas</span>
                </h1>
                <p className="text-emerald-500/60 md:text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1 md:mt-0">
                    Valide e aprove reembolsos e adiantamentos pendentes
                </p>
            </div>

            {/* Cards de Resumo no Topo */}
            {!loading && despesas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Pendente</span>
                        <h3 className="text-2xl font-black text-slate-900">R$ {totalPendente.toFixed(2)}</h3>
                        <p className="text-xs font-semibold text-slate-400">{filteredDespesas.length} solicitações</p>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                        <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest block">Reembolsos</span>
                        <h3 className="text-2xl font-black text-rose-600">R$ {totalReembolsos.toFixed(2)}</h3>
                        <p className="text-xs font-semibold text-slate-400">{reembolsos.length} itens</p>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                        <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest block">Adiantamentos</span>
                        <h3 className="text-2xl font-black text-emerald-600">R$ {totalAdiantamentos.toFixed(2)}</h3>
                        <p className="text-xs font-semibold text-slate-400">{adiantamentos.length} itens</p>
                    </div>
                </div>
            )}

            {/* Listagem de pendentes */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Solicitações Aguardando Seu Parecer</h2>
                </div>

                {/* Filtros de Pesquisa e Agrupador */}
                {!loading && despesas.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por solicitante, descrição ou ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 border border-slate-100 rounded-2xl bg-slate-50/50 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-hidden text-slate-700"
                            />
                        </div>
                        <div className="w-full sm:w-60">
                            <select
                                value={selectedSolicitante}
                                onChange={(e) => setSelectedSolicitante(e.target.value)}
                                className="w-full h-11 border border-slate-100 rounded-2xl px-3 bg-slate-50/50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-hidden cursor-pointer"
                            >
                                <option value="">Todos os Solicitantes</option>
                                {solicitantesUnicos.map((nome) => (
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Carregando pendências...</p>
                    </div>
                                ) : (
                    <>
                        {/* Desktop Table View */}
                        {filteredDespesas.length === 0 ? (
                            <div className="bg-white border rounded-3xl p-16 text-center space-y-3">
                                <CheckCircle className="h-10 w-10 text-slate-300 mx-auto" />
                                <h3 className="font-bold text-slate-800 text-sm">Nenhum resultado encontrado</h3>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">Tente ajustar seus termos de pesquisa ou o filtro de solicitantes.</p>
                            </div>
                        ) : (
                            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="py-4.5 px-6">Data</th>
                                            <th className="py-4.5 px-6">Tipo</th>
                                            <th className="py-4.5 px-6">Solicitante</th>
                                            <th className="py-4.5 px-6">Descrição</th>
                                            <th className="py-4.5 px-6 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/60">
                                        {filteredDespesas.map(item => (
                                            <tr
                                                key={item.id}
                                                onClick={() => setDetailItem(item)}
                                                className="hover:bg-slate-50/80 active:bg-slate-100/50 transition-all cursor-pointer text-sm text-slate-700"
                                            >
                                            <td className="py-4.5 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-700">
                                                        {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
                                            <td className="py-4.5 px-6">
                                                <div className="font-bold text-slate-900">{item.solicitante.nome}</div>
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                                    {item.solicitante.role}
                                                </span>
                                            </td>
                                            <td className="py-4.5 px-6 truncate max-w-xs">
                                                <span className="text-slate-600 font-medium">{item.descricao}</span>
                                            </td>
                                            <td className="py-4.5 px-6 text-right">
                                                <span className="font-black text-slate-900 tracking-tight text-base">
                                                    R$ {Number(item.valorSolicitado).toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                        )}

                        {/* Mobile Extrato List View */}
                        {filteredDespesas.length > 0 && (
                            <div className="block md:hidden bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden mx-1">
                                {filteredDespesas.map((item, idx) => (
                                <div
                                    key={item.id}
                                    onClick={() => setDetailItem(item)}
                                    className={`flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-all cursor-pointer ${idx !== despesas.length - 1 ? 'border-b border-slate-100/80' : ''}`}
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
                                            R$ {Number(item.valorSolicitado).toFixed(2)}
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
                        )}
                    </>
                )}
            </div>

            {/* Modal de Aprovação / Reprovação */}
            {decisionModalOpen && selectedDespesa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                                    {actionType === "APROVAR" 
                                        ? "Confirmar Aprovação" 
                                        : selectedDespesa.tipo === "ADIANTAMENTO" && selectedDespesa.valorComprovado !== null
                                            ? "Devolver Prestação de Contas" 
                                            : "Confirmar Reprovação"}
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider pt-0.5">Solicitação de R$ {Number(selectedDespesa.valorSolicitado).toFixed(2)}</p>
                            </div>
                            <button
                                onClick={() => setDecisionModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-black text-lg p-2 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</Label>
                                <p className="text-sm font-semibold text-slate-800">{selectedDespesa.solicitante.nome} ({selectedDespesa.solicitante.email})</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finalidade declarada</Label>
                                <p className="text-xs font-medium bg-slate-50 p-3 rounded-lg border text-slate-600 italic">"{selectedDespesa.descricao}"</p>
                            </div>

                            {/* Campo de Justificativa */}
                            <div className="space-y-3 pt-2">
                                <Label htmlFor="justificativa" className="font-bold text-slate-700">
                                    Parecer / Justificativa {actionType === "REPROVAR" ? "*" : "(Opcional)"}
                                </Label>

                                {actionType === "REPROVAR" && (
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Selecione o Motivo Principal</Label>
                                        <select
                                            value={motivoSelecionado}
                                            onChange={(e) => setMotivoSelecionado(e.target.value)}
                                            className="w-full h-11 border border-slate-200 rounded-xl px-3 bg-slate-50 font-semibold text-xs focus:ring-primary focus:border-primary"
                                        >
                                            <option value="">Selecione o motivo...</option>
                                            {motivosDisponiveis.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                            <option value="Outro">Outro (especificar abaixo)</option>
                                        </select>
                                    </div>
                                )}

                                {(actionType === "APROVAR" || motivoSelecionado === "Outro" || !motivoSelecionado) && (
                                    <Textarea
                                        id="justificativa"
                                        placeholder={
                                            actionType === "REPROVAR"
                                                ? "Descreva em detalhes o motivo da devolução..."
                                                : "Escreva observações adicionais sobre a aprovação..."
                                        }
                                        rows={4}
                                        value={justificativa}
                                        onChange={(e) => setJustificativa(e.target.value)}
                                        className="rounded-xl border-slate-200"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDecisionModalOpen(false)}
                                className="h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={submitting}
                                onClick={handleDecisionSubmit}
                                className={`h-12 px-8 rounded-xl text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 ${
                                    actionType === "APROVAR"
                                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-md"
                                        : "bg-red-600 hover:bg-red-700 shadow-md"
                                }`}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {actionType === "APROVAR" ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                        <span>
                                            {actionType === "APROVAR" 
                                                ? "Aprovar Solicitação" 
                                                : selectedDespesa.tipo === "ADIANTAMENTO" && selectedDespesa.valorComprovado !== null
                                                    ? "Devolver para Correção" 
                                                    : "Reprovar Solicitação"}
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes da Despesa */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent showCloseButton={false} className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-slate-50">
                    {detailItem && (
                        <div className="flex flex-col max-h-[90vh] bg-slate-50 w-full h-full">
                            {/* Header */}
                            <div className="bg-white p-6 border-b border-slate-100 flex flex-col gap-2 shrink-0 relative">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className={`border-0 font-bold px-3 py-1 rounded-lg ${
                                            detailItem.tipo === "REEMBOLSO"
                                                ? "bg-rose-100 text-rose-800"
                                                : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            {detailItem.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            ID: {detailItem.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <DialogClose className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-all cursor-pointer shrink-0">
                                        <X className="h-5 w-5" />
                                    </DialogClose>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                        R$ {Number(detailItem.valorSolicitado).toFixed(2)}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold pt-0.5">
                                        Solicitado por: <span className="text-slate-700">{detailItem.solicitante.nome}</span> ({detailItem.solicitante.role})
                                    </p>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-slate-700 bg-slate-50">
                                {/* Alertas de Auditoria */}
                                {detailItem.alertaAuditoria && (
                                    <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs font-bold flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                        <span>{detailItem.alertaAuditoria}</span>
                                    </div>
                                )}

                                {/* Descrição / Finalidade */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finalidade / Descrição</Label>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 text-sm text-slate-600 font-semibold italic">
                                        "{detailItem.descricao}"
                                    </div>
                                </div>

                                {/* Itens da Despesa (se houver) */}
                                {detailItem.itens && detailItem.itens.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Lançados ({detailItem.itens.length})</Label>
                                        <div className="border rounded-xl overflow-hidden bg-white shadow-xs divide-y">
                                            {detailItem.itens.map((item: any) => (
                                                <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-slate-900">{item.descricao}</div>
                                                        <div className="text-slate-400 font-medium">
                                                            {item.categoria} &bull; {item.quantidade}x R$ {Number(item.valorUnitario).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-slate-900 shrink-0">
                                                        R$ {Number(item.valorTotal).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Documentos / Comprovantes */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprovantes ({detailItem.anexos?.length || 0})</Label>
                                    {detailItem.anexos && detailItem.anexos.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {detailItem.anexos.map((anexo: any, idx: number) => (
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
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-white p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => setDetailItem(null)}
                                    className="w-full sm:w-auto order-last sm:order-first h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-100 border-slate-200"
                                >
                                    Fechar
                                </Button>
                                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        onClick={() => {
                                            openDecisionModal(detailItem, "REPROVAR")
                                            setDetailItem(null)
                                        }}
                                        variant="outline"
                                        className="h-10 px-6 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-wider text-[10px] gap-1.5 w-full sm:w-auto cursor-pointer"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        <span>Reprovar</span>
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            openDecisionModal(detailItem, "APROVAR")
                                            setDetailItem(null)
                                        }}
                                        className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 shadow-sm w-full sm:w-auto cursor-pointer"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Aprovar</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AttachmentViewer anexo={previewAnexo} onClose={() => setPreviewAnexo(null)} />
        </div>
    )
}
