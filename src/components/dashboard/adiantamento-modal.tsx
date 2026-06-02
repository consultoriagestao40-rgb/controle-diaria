"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2, ArrowRight } from "lucide-react"
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
            <DialogContent className="fixed bottom-0 sm:bottom-auto top-auto sm:top-1/2 left-0 sm:left-1/2 translate-x-0 sm:-translate-x-1/2 translate-y-0 sm:-translate-y-1/2 w-full sm:max-w-xl h-[85dvh] sm:h-auto sm:max-h-[90vh] flex flex-col gap-0 rounded-t-[2rem] rounded-b-none sm:rounded-3xl p-0 bg-white border border-slate-200 overflow-hidden shadow-2xl transition-all duration-300">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-1 sm:hidden flex-none" />
                <DialogHeader className="p-5 pt-2 sm:p-8 pb-4 border-b border-slate-100 flex-none">
                    <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-indigo-500" />
                        Nova Solicitação de Adiantamento
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs sm:text-sm font-medium">
                        Use essa modalidade para prever um gasto corporativo e receber o valor adiantado (sujeito a prestação de contas posterior).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="desc-adiant" className="font-bold text-slate-700 text-xs sm:text-sm">Finalidade Geral da Solicitação *</Label>
                        <Textarea
                            id="desc-adiant"
                            placeholder="Descreva o propósito geral da viagem/operação (ex: Participação na feira de tecnologia em SP...)"
                            rows={3}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors text-xs sm:text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Data Prevista */}
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="dataAdiantamento" className="font-bold text-slate-700 text-xs sm:text-sm">Data Prevista *</Label>
                            <Input
                                id="dataAdiantamento"
                                type="date"
                                value={dataAdiantamento}
                                onChange={(e) => setDataAdiantamento(e.target.value)}
                                className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors h-11 text-xs"
                            />
                        </div>

                        {/* Valor Solicitado */}
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="valorAdiantamento" className="font-bold text-slate-700 text-xs sm:text-sm">Valor Total Previsto *</Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                                <Input
                                    id="valorAdiantamento"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valorAdiantamento}
                                    onChange={(e) => setValorAdiantamento(e.target.value)}
                                    className="pl-8 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 transition-colors h-11 text-xs font-black"
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
                        className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-wider text-[10px] border-slate-200 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    >
                        Salvar Rascunho
                    </Button>
                    <Button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-slate-900 hover:bg-indigo-600 shadow-xl hover:shadow-indigo-500/20 text-white font-black uppercase tracking-wider text-[10px] gap-2 active:scale-95 transition-all group cursor-pointer"
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
