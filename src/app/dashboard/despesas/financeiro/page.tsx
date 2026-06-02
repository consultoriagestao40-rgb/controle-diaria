"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2, AlertCircle, Calendar, Receipt, FileText, CheckCircle, Wallet, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
    solicitante: { nome: string, email: string }
    anexos: any[]
    alertaAuditoria: string | null
}

export default function FinanceiroDespesasPage() {
    const [despesasAprovadas, setDespesasAprovadas] = useState<Despesa[]>([])
    const [despesasPendentesPrestacao, setDespesasPendentesPrestacao] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState<"PAGAMENTOS" | "CONCILIACOES">("PAGAMENTOS")

    // Estados para o Modal de Ação Financeira
    const [actionModalOpen, setActionModalOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [observacao, setObservacao] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchFinanceData()
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
        setActionModalOpen(true)
    }

    const handleActionSubmit = async () => {
        if (!selectedDespesa) return

        setSubmitting(true)
        const isReconciliation = selectedDespesa.status === 'AGUARDANDO_PRESTACAO' || selectedDespesa.status === 'AGUARDANDO_CONCILIACAO'
        const endpoint = isReconciliation 
            ? `/api/despesas/${selectedDespesa.id}/conciliar`
            : `/api/despesas/${selectedDespesa.id}/pagar`

        try {
            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ observacao })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao processar baixa financeira")
            }

            toast.success(
                isReconciliation
                    ? "Prestação de contas aprovada e fluxo concluído!"
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
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                    Painel <span className="text-primary italic">Financeiro de Despesas</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Gerencie os pagamentos e conciliações de saldos de despesas
                </p>
            </div>

            {/* Alternador de Sessões */}
            <div className="flex gap-4 bg-white p-2 rounded-2xl border shadow-sm max-w-lg">
                <button
                    onClick={() => setActiveSection("PAGAMENTOS")}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        activeSection === "PAGAMENTOS"
                            ? "bg-slate-900 text-white shadow-md scale-[1.01]"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <DollarSign className="h-4 w-4" />
                    <span>Pagamentos Iniciais ({despesasAprovadas.length})</span>
                </button>
                <button
                    onClick={() => setActiveSection("CONCILIACOES")}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        activeSection === "CONCILIACOES"
                            ? "bg-slate-900 text-white shadow-md scale-[1.01]"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Conciliações de Saldo ({despesasPendentesPrestacao.length})</span>
                </button>
            </div>

            {/* Listagem */}
            <div className="space-y-6">
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
                            despesasAprovadas.length === 0 ? (
                                <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-85">
                                    <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <DollarSign className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                        Nenhum pagamento aprovado aguardando liberação.
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid gap-6">
                                    {despesasAprovadas.map((item) => (
                                        <Card key={item.id} className="glass-card shadow-lg border-none bg-white">
                                            <CardContent className="p-8">
                                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                                    <div className="space-y-3 flex-1">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <Badge className={`border-0 font-bold px-3 py-1 rounded-lg ${
                                                                item.tipo === "REEMBOLSO"
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : "bg-emerald-100 text-emerald-800"
                                                            }`}>
                                                                {item.tipo === "REEMBOLSO" ? "Reembolso" : "Adiantamento"}
                                                            </Badge>
                                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {item.id.slice(0, 6)}</span>
                                                        </div>

                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">R$ {Number(item.valorSolicitado).toFixed(2)}</h3>
                                                            <p className="text-xs text-slate-400 font-semibold pt-0.5">Colaborador beneficiário: <span className="text-slate-700">{item.solicitante.nome}</span></p>
                                                        </div>

                                                        {item.alertaAuditoria && (
                                                            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs font-bold flex items-start gap-2">
                                                                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                                                <span>{item.alertaAuditoria}</span>
                                                            </div>
                                                        )}

                                                        <p className="text-slate-600 text-sm font-semibold bg-slate-50 p-4 rounded-xl border border-slate-100">{item.descricao}</p>
                                                    </div>

                                                    <Button
                                                        onClick={() => openActionModal(item)}
                                                        className="w-full lg:w-44 h-12 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-widest text-[10px] gap-1.5 active:scale-95 transition-all shadow-md shrink-0"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Efetuar Pagamento
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )
                        ) : (
                            despesasPendentesPrestacao.length === 0 ? (
                                <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-85">
                                    <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <ArrowRightLeft className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                        Nenhuma conciliação ou acerto de saldo pendente.
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid gap-6">
                                    {despesasPendentesPrestacao.map((item) => {
                                        const saldo = item.saldoFinal ? Number(item.saldoFinal) : 0
                                        return (
                                            <Card key={item.id} className="glass-card shadow-lg border-none bg-white">
                                                <CardContent className="p-8">
                                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                                        <div className="space-y-3 flex-1">
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <Badge className="border-0 font-bold px-3 py-1 rounded-lg bg-orange-100 text-orange-800">
                                                                    Prestação de Contas Enviada
                                                                </Badge>
                                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {item.id.slice(0, 6)}</span>
                                                            </div>

                                                            <div>
                                                                <div className="flex items-baseline gap-2">
                                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">R$ {Number(item.valorSolicitado).toFixed(2)}</h3>
                                                                    <span className="text-xs font-bold text-slate-400">gasto real de R$ {Number(item.valorComprovado).toFixed(2)}</span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 font-semibold pt-0.5">Colaborador beneficiário: <span className="text-slate-700">{item.solicitante.nome}</span></p>
                                                            </div>

                                                            {item.alertaAuditoria && (
                                                                <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs font-bold flex items-start gap-2">
                                                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                                                    <span>{item.alertaAuditoria}</span>
                                                                </div>
                                                            )}

                                                            <div className={`p-4 rounded-xl border font-bold text-xs space-y-1 ${
                                                                saldo > 0
                                                                    ? "bg-amber-50 text-amber-800 border-amber-100"
                                                                    : "bg-rose-50 text-rose-800 border-rose-100"
                                                            }`}>
                                                                {saldo > 0 ? (
                                                                    <p>💰 **O colaborador deve DEVOLVER R$ {saldo.toFixed(2)}** à empresa (gastou menos do que recebeu).</p>
                                                                ) : (
                                                                    <p>💸 **A empresa deve REEMBOLSAR complementar de R$ {Math.abs(saldo).toFixed(2)}** ao colaborador (gastou mais do que recebeu).</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <Button
                                                            onClick={() => openActionModal(item)}
                                                            className="w-full lg:w-44 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-[10px] gap-1.5 active:scale-95 transition-all shadow-md shrink-0 border-none"
                                                        >
                                                            <ArrowRightLeft className="h-4 w-4" />
                                                            Confirmar Acerto
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Modal de Confirmação Financeira (Aprovar Pagamento ou Conciliação) */}
            {actionModalOpen && selectedDespesa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                                    {selectedDespesa.status === 'AGUARDANDO_PRESTACAO' ? "Conciliar Saldo Devedor/Credor" : "Registrar Pagamento de Despesa"}
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider pt-0.5">Operação Financeira de Despesa</p>
                            </div>
                            <button
                                onClick={() => setActionModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-black text-lg p-2 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm font-semibold text-slate-700">
                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-2 text-xs">
                                <p>👤 **Beneficiário:** {selectedDespesa.solicitante.nome}</p>
                                <p>🗒️ **Finalidade:** {selectedDespesa.descricao}</p>
                                <p>💵 **Valor da Solicitação original:** R$ {Number(selectedDespesa.valorSolicitado).toFixed(2)}</p>
                                {selectedDespesa.valorComprovado !== null && (
                                    <p>🧾 **Valor Real Comprovado:** R$ {Number(selectedDespesa.valorComprovado).toFixed(2)}</p>
                                )}
                                {selectedDespesa.saldoFinal !== null && selectedDespesa.saldoFinal !== 0 && (
                                    <p className={selectedDespesa.saldoFinal > 0 ? "text-amber-700 font-black" : "text-rose-700 font-black"}>
                                        🔄 **Diferença a Acertar:** {selectedDespesa.saldoFinal > 0 ? `Colaborador devolve R$ ${Number(selectedDespesa.saldoFinal).toFixed(2)}` : `Empresa paga R$ ${Math.abs(Number(selectedDespesa.saldoFinal)).toFixed(2)}`}
                                    </p>
                                )}
                            </div>

                            {/* Campo de observações */}
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="observacao" className="font-bold text-slate-700">Observações Internas (Opcional)</Label>
                                <Textarea
                                    id="observacao"
                                    placeholder="Ex: Pago via PIX corporativo, Transação ID: 827419... ou Devolução recebida em conta corrente..."
                                    rows={3}
                                    value={observacao}
                                    onChange={(e) => setObservacao(e.target.value)}
                                    className="rounded-xl border-slate-200"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActionModalOpen(false)}
                                className="h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={submitting}
                                onClick={handleActionSubmit}
                                className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 shadow-md"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Confirmar Lançamento</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
