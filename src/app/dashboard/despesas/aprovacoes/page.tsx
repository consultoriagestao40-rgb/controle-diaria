"use client"

import { useState, useEffect } from "react"
import { CheckSquare, Loader2, AlertCircle, Calendar, Receipt, DollarSign, FileText, CheckCircle, XCircle } from "lucide-react"
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
    createdAt: string
    solicitante: { nome: string, email: string, role: string }
    anexos: any[]
}

export default function AprovacoesDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([])
    const [loading, setLoading] = useState(true)

    // Estados para o Modal de Decisão (Aprovar/Reprovar)
    const [decisionModalOpen, setDecisionModalOpen] = useState(false)
    const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
    const [actionType, setActionType] = useState<"APROVAR" | "REPROVAR">("APROVAR")
    const [justificativa, setJustificativa] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchAprovacoes()
    }, [])

    const fetchAprovacoes = async () => {
        try {
            const res = await fetch("/api/despesas?status=AGUARDANDO_APROVACAO")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setDespesas(data)
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
        setDecisionModalOpen(true)
    }

    const handleDecisionSubmit = async () => {
        if (!selectedDespesa) return

        if (actionType === "REPROVAR" && !justificativa) {
            toast.error("A justificativa é obrigatória para reprovações.")
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch(`/api/despesas/${selectedDespesa.id}/aprovar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: actionType,
                    justificativa
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao processar decisão")
            }

            toast.success(
                actionType === "APROVAR"
                    ? "Solicitação aprovada com sucesso!"
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
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                    Aprovação de <span className="text-primary italic">Despesas</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Valide e aprove reembolsos e adiantamentos pendentes
                </p>
            </div>

            {/* Listagem de pendentes */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Solicitações Aguardando Seu Parecer</h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-6">
                        <div className="relative h-16 w-16">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Carregando pendências...</p>
                    </div>
                ) : despesas.length === 0 ? (
                    <Card className="glass-card border-dashed border-2 py-32 flex flex-col items-center justify-center bg-white opacity-80">
                        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <CheckSquare className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                            Tudo em dia! Nenhuma despesa pendente de aprovação.
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {despesas.map((item) => (
                            <Card key={item.id} className="glass-card hover:scale-[1.002] transition-all duration-300 shadow-xl border-none bg-white">
                                <CardContent className="p-8">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                        {/* Detalhes */}
                                        <div className="space-y-4 flex-1">
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
                                                <p className="text-xs text-slate-400 font-semibold pt-0.5">Solicitado por: <span className="text-slate-700">{item.solicitante.nome}</span> ({item.solicitante.role})</p>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 font-semibold">
                                                {item.descricao}
                                            </div>

                                            {/* Exibição dos Anexos/Recibos enviados */}
                                            {item.anexos && item.anexos.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentos Comprovantes ({item.anexos.length})</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.anexos.map((anexo, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={anexo.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-slate-50 transition-all shadow-sm"
                                                            >
                                                                <FileText className="h-3.5 w-3.5" />
                                                                <span>{anexo.nomeOriginal}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ações */}
                                        <div className="flex sm:flex-row lg:flex-col gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 shrink-0">
                                            <Button
                                                onClick={() => openDecisionModal(item, "REPROVAR")}
                                                variant="outline"
                                                className="flex-1 lg:w-40 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-widest text-[10px] gap-1.5 transition-all"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reprovar
                                            </Button>
                                            <Button
                                                onClick={() => openDecisionModal(item, "APROVAR")}
                                                className="flex-1 lg:w-40 h-12 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-widest text-[10px] gap-1.5 transition-all shadow-md"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Aprovação / Reprovação */}
            {decisionModalOpen && selectedDespesa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                                    {actionType === "APROVAR" ? "Confirmar Aprovação" : "Confirmar Reprovação"}
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
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="justificativa" className="font-bold text-slate-700">
                                    Parecer / Justificativa {actionType === "REPROVAR" ? "*" : "(Opcional)"}
                                </Label>
                                <Textarea
                                    id="justificativa"
                                    placeholder={
                                        actionType === "REPROVAR"
                                            ? "Escreva o motivo da reprovação obrigatoriamente..."
                                            : "Escreva observações adicionais sobre a aprovação..."
                                    }
                                    rows={4}
                                    value={justificativa}
                                    onChange={(e) => setJustificativa(e.target.value)}
                                    className="rounded-xl border-slate-200"
                                />
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
                                        <span>{actionType === "APROVAR" ? "Aprovar Solicitação" : "Reprovar Solicitação"}</span>
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
