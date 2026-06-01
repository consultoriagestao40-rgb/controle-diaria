"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Receipt, DollarSign, ArrowRight, Loader2, FileUp, Sparkles, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function NovaDespesaPage() {
    const router = useRouter()
    const [tipo, setTipo] = useState<"REEMBOLSO" | "ADIANTAMENTO">("REEMBOLSO")
    const [descricao, setDescricao] = useState("")
    const [valorSolicitado, setValorSolicitado] = useState("")
    const [anexos, setAnexos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Simulador de Upload de Comprovantes
    const handleFileSimulate = () => {
        setUploading(true)
        setTimeout(() => {
            const mockFile = {
                url: `/mock/comprovante_${Math.floor(Math.random() * 1000)}.pdf`,
                nomeOriginal: `nota_fiscal_${Date.now().toString().slice(-4)}.pdf`,
                tamanho: 1024 * Math.floor(Math.random() * 500 + 100),
                tipo: "application/pdf"
            }
            setAnexos([...anexos, mockFile])
            setUploading(false)
            toast.success("Comprovante anexado com sucesso!")
        }, 1500)
    }

    const handleSubmit = async (enviarParaAprovacao: boolean) => {
        if (!descricao || !valorSolicitado) {
            toast.error("Por favor, preencha todos os campos obrigatórios.")
            return
        }

        const valor = parseFloat(valorSolicitado)
        if (isNaN(valor) || valor <= 0) {
            toast.error("O valor solicitado deve ser maior que zero.")
            return
        }

        if (tipo === "REEMBOLSO" && anexos.length === 0) {
            toast.error("Para solicitações de Reembolso, é obrigatório anexar pelo menos um comprovante.")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/despesas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo,
                    descricao,
                    valorSolicitado: valor,
                    anexos,
                    enviarParaAprovacao
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao criar solicitação")
            }

            toast.success(
                enviarParaAprovacao
                    ? "Solicitação enviada para aprovação!"
                    : "Rascunho salvo com sucesso!"
            )
            router.push("/dashboard/despesas")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Falha ao processar solicitação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10 pb-32 max-w-4xl mx-auto pt-4">
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                    Solicitar <span className="text-primary italic">Reembolso ou Adiantamento</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Preencha os dados e anexe os comprovantes necessários
                </p>
            </div>

            {/* Toggle Tipo */}
            <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded-2xl border shadow-sm">
                <button
                    onClick={() => {
                        setTipo("REEMBOLSO")
                        setAnexos([])
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 ${
                        tipo === "REEMBOLSO"
                            ? "bg-slate-900 text-white shadow-lg scale-[1.02]"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <Receipt className="h-5 w-5" />
                    <span>Reembolso (Gasto Efetuado)</span>
                </button>
                <button
                    onClick={() => {
                        setTipo("ADIANTAMENTO")
                        setAnexos([])
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 ${
                        tipo === "ADIANTAMENTO"
                            ? "bg-slate-900 text-white shadow-lg scale-[1.02]"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <DollarSign className="h-5 w-5" />
                    <span>Adiantamento (Valor Previsto)</span>
                </button>
            </div>

            <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <CardTitle className="text-xl font-black text-slate-900">
                        {tipo === "REEMBOLSO" ? "Dados do Reembolso" : "Dados do Adiantamento"}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm">
                        {tipo === "REEMBOLSO"
                            ? "Use essa modalidade se você já efetuou o gasto com recursos próprios e necessita do reembolso da empresa."
                            : "Use essa modalidade para prever um gasto corporativo e receber o valor adiantado (sujeito a prestação de contas posterior)."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="descricao" className="font-bold text-slate-700">Descrição Detalhada *</Label>
                        <Textarea
                            id="descricao"
                            placeholder="Descreva a finalidade da despesa (ex: Viagem técnica a posto Penha, compra de materiais hidráulicos de emergência...)"
                            rows={3}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/10 transition-colors"
                        />
                    </div>

                    {/* Valor */}
                    <div className="space-y-2">
                        <Label htmlFor="valor" className="font-bold text-slate-700">Valor Solicitado (R$) *</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                            <Input
                                id="valor"
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={valorSolicitado}
                                onChange={(e) => setValorSolicitado(e.target.value)}
                                className="pl-12 h-14 rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/10 font-bold text-lg transition-colors"
                            />
                        </div>
                    </div>

                    {/* Comprovantes */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <Label className="font-bold text-slate-700">
                                    Comprovantes & Notas Fiscais {tipo === "REEMBOLSO" ? "*" : "(Opcional na solicitação)"}
                                </Label>
                                <p className="text-xs text-slate-400">Anexe PDFs ou Imagens legíveis do recibo.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={handleFileSimulate}
                                className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileUp className="h-4 w-4 text-primary" />
                                )}
                                Anexar Nota/Recibo
                            </Button>
                        </div>

                        {anexos.length > 0 ? (
                            <div className="grid gap-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                {anexos.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                                                <CheckCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{file.nomeOriginal}</p>
                                                <p className="text-xs text-slate-400">{(file.tamanho / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            Remover
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border-dashed border-2 border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/50">
                                <FileUp className="h-10 w-10 text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-400">Nenhum documento anexado ainda.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Ações de envio */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSubmit(false)}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    Salvar Rascunho
                </Button>
                <Button
                    type="button"
                    disabled={loading || uploading}
                    onClick={() => handleSubmit(true)}
                    className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-primary shadow-xl hover:shadow-primary/20 text-white font-black uppercase tracking-[0.2em] text-[11px] gap-2 active:scale-95 transition-all group"
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <span>Enviar para Aprovação</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
