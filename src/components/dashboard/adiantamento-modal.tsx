"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export interface AdiantamentoModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    user: any
}

export function AdiantamentoModal({ isOpen, onClose, onSuccess, user }: AdiantamentoModalProps) {
    const [descricao, setDescricao] = useState("")
    const [valorAdiantamento, setValorAdiantamento] = useState("")
    const [dataAdiantamento, setDataAdiantamento] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setDescricao("")
        setValorAdiantamento("")
        setDataAdiantamento("")
    }, [isOpen])

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!descricao) {
            toast.error("Por favor, preencha a finalidade geral da solicitação.")
            return
        }

        if (!dataAdiantamento) {
            toast.error("Por favor, selecione a data prevista da viagem/operação.")
            return
        }

        const val = parseFloat(valorAdiantamento)
        if (isNaN(val) || val <= 0) {
            toast.error("Por favor, insira um valor total previsto maior que zero.")
            return
        }

        setLoading(true)

        try {
            const roundedValorAdiantamento = Math.round(val * 100) / 100
            const finalItens = [{
                categoria: "VIAGEM",
                descricao: descricao,
                data: dataAdiantamento,
                quantidade: 1,
                valorUnitario: roundedValorAdiantamento,
                valorTotal: roundedValorAdiantamento
            }]

            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "ADIANTAMENTO",
                    descricao,
                    valorSolicitado: roundedValorAdiantamento,
                    itens: finalItens,
                    anexos: [],
                    enviarParaAprovacao
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao criar solicitação")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Solicitação de adiantamento enviada para aprovação!"
                    : "Rascunho de adiantamento salvo com sucesso!"
            )
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent showCloseButton={false} className="fixed inset-0! sm:inset-auto! top-0! left-0! translate-x-0! translate-y-0! sm:top-1/2! sm:left-1/2! sm:-translate-x-1/2! sm:-translate-y-1/2! w-full! max-w-full! sm:max-w-xl! h-full! sm:h-auto! sm:max-h-[90vh] flex flex-col gap-0 rounded-none! sm:rounded-3xl! p-0 bg-white border-none! sm:border sm:border-slate-200 overflow-hidden shadow-2xl transition-all duration-300">
                <div className="p-5 pt-4 sm:p-8 pb-4 border-b border-slate-100 flex-none flex flex-col gap-3">
                    <div className="flex items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-10 w-10 text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer active:scale-95 transition-all shrink-0"
                        >
                            <X className="h-5 w-5 stroke-[2.5]" />
                        </Button>
                    </div>
                    
                    <div className="space-y-1 mt-1">
                        <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-indigo-500 shrink-0" />
                            Nova Solicitação de Adiantamento
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs sm:text-sm font-medium">
                            Use essa modalidade para prever um gasto corporativo e receber o valor adiantado (sujeito a prestação de contas posterior).
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="desc-adiant" className="text-xs font-semibold text-slate-500 ml-1">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="desc-adiant"
                            placeholder="Descreva o propósito geral da viagem/operação (ex: Participação na feira de tecnologia em SP...)"
                            rows={3}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Data Prevista */}
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="dataAdiantamento" className="text-xs font-semibold text-slate-500 ml-1">Data Prevista *</Label>
                            <Input
                                id="dataAdiantamento"
                                type="date"
                                value={dataAdiantamento}
                                onChange={(e) => setDataAdiantamento(e.target.value)}
                                className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors h-12 text-sm"
                            />
                        </div>

                        {/* Valor Solicitado */}
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="valorAdiantamento" className="text-xs font-semibold text-slate-500 ml-1">Valor Total Previsto *</Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                <Input
                                    id="valorAdiantamento"
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={valorAdiantamento}
                                    onChange={(e) => setValorAdiantamento(e.target.value)}
                                    className="pl-8 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors h-12 text-sm font-semibold"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-5 sm:p-8 pt-4 border-t border-slate-100 gap-3 bg-slate-50/50 flex-none flex flex-col sm:flex-row">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-sm border-slate-200 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Salvar Rascunho
                    </Button>
                    <Button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-bold text-sm gap-2 active:scale-95 transition-all group cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                            <>
                                <span>Enviar para Aprovação</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
