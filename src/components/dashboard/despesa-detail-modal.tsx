"use client"

import { useState, useEffect } from "react"
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { 
    Calendar, User, Building2, CreditCard, Receipt, FileText, 
    Clock, CheckCircle, XCircle, AlertTriangle, AlertCircle, ExternalLink, Copy, Check, Eye, RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { AttachmentViewer } from "@/components/dashboard/attachment-viewer"

export interface DespesaDetalhes {
    id: string
    tipo: "REEMBOLSO" | "ADIANTAMENTO"
    status: string
    descricao: string
    observacao?: string | null
    valorSolicitado: number
    valorComprovado?: number | null
    saldoFinal?: number | null
    alertaAuditoria?: string | null
    chavePix?: string | null
    justificativaAprovacao?: string | null
    justificativaReprovacao?: string | null
    createdAt: string
    dataAprovacao?: string | null
    dataPagamento?: string | null
    contaAzulPayableId?: string | null
    contaAzulStatus?: string | null
    contaAzulReceiptUrl?: string | null
    empresa?: { id: string; nome: string } | null
    centroCusto?: { id: string; nome: string; codigo?: string | null } | null
    solicitante: {
        id: string
        nome: string
        email: string
        role?: string
        chavePix?: string | null
        cpf?: string | null
    }
    aprovador?: { id: string; nome: string; email: string } | null
    anexos?: any[]
    itens?: any[]
    historico?: Array<{
        id: string
        deStatus?: string | null
        paraStatus: string
        data: string
        observacao?: string | null
        usuario?: { nome: string; role?: string } | null
    }>
}

interface DespesaDetailModalProps {
    despesa: DespesaDetalhes | null
    isOpen: boolean
    onClose: () => void
    onAprovar?: (despesa: DespesaDetalhes, overrideEmpresaId?: string, overrideChavePix?: string) => void
    onReprovar?: (despesa: DespesaDetalhes) => void
    onAprovarPrestacao?: (despesa: DespesaDetalhes) => void
    onSincronizarContaAzul?: (despesa: DespesaDetalhes, overrideChavePix?: string) => void
    isApprover?: boolean
    empresas?: Array<{ id: string; nome: string }>
}

export function DespesaDetailModal({
    despesa,
    isOpen,
    onClose,
    onAprovar,
    onReprovar,
    onAprovarPrestacao,
    onSincronizarContaAzul,
    isApprover = false,
    empresas = []
}: DespesaDetailModalProps) {
    const [copiedPix, setCopiedPix] = useState(false)
    const [previewAnexo, setPreviewAnexo] = useState<any | null>(null)
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("")
    const [editChavePix, setEditChavePix] = useState<string>("")
    const [isEditingPix, setIsEditingPix] = useState<boolean>(false)

    useEffect(() => {
        if (despesa) {
            setSelectedEmpresaId(despesa.empresa?.id || "")
            const pix = despesa.chavePix || despesa.solicitante.chavePix || ""
            setEditChavePix(pix)
            setIsEditingPix(!pix)
        } else {
            setSelectedEmpresaId("")
            setEditChavePix("")
            setIsEditingPix(false)
        }
    }, [despesa?.id, despesa?.empresa?.id, despesa?.chavePix, despesa?.solicitante?.chavePix])

    if (!despesa) return null

    const effectivePix = despesa.chavePix || despesa.solicitante.chavePix || ""

    const copyPix = () => {
        if (!effectivePix) return
        navigator.clipboard.writeText(effectivePix)
        setCopiedPix(true)
        toast.success("Chave PIX copiada para a área de transferência!")
        setTimeout(() => setCopiedPix(false), 2000)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "AGUARDANDO_APROVACAO":
            case "AGUARDANDO_APROVACAO_N1":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">Aguardando N1</Badge>
            case "AGUARDANDO_APROVACAO_N2":
                return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold">Aguardando N2</Badge>
            case "APROVADO":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold">Aprovado (Conta Azul)</Badge>
            case "PAGO":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">Pago</Badge>
            case "AGUARDANDO_PRESTACAO":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold">Aguardando Prestação</Badge>
            case "AGUARDANDO_CONCILIACAO":
                return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold">Prestação a Validar</Badge>
            case "CONCLUIDO":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">Baixado / Concluído</Badge>
            case "REPROVADO":
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">Reprovado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const isPendingApproval = ["AGUARDANDO_APROVACAO", "AGUARDANDO_APROVACAO_N1", "AGUARDANDO_APROVACAO_N2"].includes(despesa.status) && (despesa.valorComprovado === null || despesa.valorComprovado === undefined)
    const isPrestacaoPending = despesa.tipo === "ADIANTAMENTO" && (despesa.status === "AGUARDANDO_CONCILIACAO" || (despesa.valorComprovado !== null && despesa.valorComprovado !== undefined && despesa.status.includes("AGUARDANDO")))

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                    <DialogHeader className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Badge className={despesa.tipo === "REEMBOLSO" ? "bg-blue-600 text-white font-bold" : "bg-purple-600 text-white font-bold"}>
                                    {despesa.tipo}
                                </Badge>
                                {getStatusBadge(despesa.status)}
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(despesa.createdAt).toLocaleString("pt-BR")}
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                            {despesa.descricao}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Protocolo: <span className="font-mono text-slate-700 dark:text-slate-300">{despesa.id}</span>
                            {despesa.contaAzulPayableId ? (
                                <span className="ml-2 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                                    • ERP Conta Azul: {despesa.contaAzulPayableId}
                                </span>
                            ) : despesa.status === 'APROVADO' ? (
                                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    Pendente de sincronização no Conta Azul
                                </span>
                            ) : null}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-3">
                        {/* Seção 1: Valores Financeiros */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor Solicitado</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {formatCurrency(Number(despesa.valorSolicitado))}
                                </p>
                            </div>

                            {despesa.valorComprovado !== null && despesa.valorComprovado !== undefined && (
                                <div>
                                    <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Valor Comprovado</p>
                                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                                        {formatCurrency(Number(despesa.valorComprovado))}
                                    </p>
                                </div>
                            )}

                            {despesa.saldoFinal !== null && despesa.saldoFinal !== undefined && Number(despesa.saldoFinal) !== 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                        {Number(despesa.saldoFinal) > 0 ? "A Devolver à Empresa" : "A Reembolsar"}
                                    </p>
                                    <p className={`text-xl font-black mt-0.5 ${Number(despesa.saldoFinal) > 0 ? "text-amber-600" : "text-blue-600"}`}>
                                        {formatCurrency(Math.abs(Number(despesa.saldoFinal)))}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Seção 2: Solicitante e Pagamento */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Dados do Solicitante & Pagamento
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                                <div>
                                    <p className="text-slate-500 font-medium">Nome do Colaborador</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{despesa.solicitante.nome}</p>
                                    <p className="text-slate-400 text-[11px]">{despesa.solicitante.email}</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-500 font-medium">
                                            {isApprover && isPendingApproval ? "Empresa para Lançamento" : "Empresa Vinculada"}
                                        </p>
                                        {isApprover && isPendingApproval && selectedEmpresaId && selectedEmpresaId !== (despesa.empresa?.id || "") && (
                                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0 border-amber-500/20 font-bold">
                                                Alterada
                                            </Badge>
                                        )}
                                    </div>

                                    {isApprover && isPendingApproval && empresas && empresas.length > 0 ? (
                                        <div className="mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                <select
                                                    value={selectedEmpresaId}
                                                    onChange={(e) => setSelectedEmpresaId(e.target.value)}
                                                    className="w-full text-xs font-semibold h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                >
                                                    <option value="">Selecione a empresa...</option>
                                                    {empresas.map((emp) => (
                                                        <option key={emp.id} value={emp.id}>
                                                            {emp.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                O título no Conta Azul será lançado nesta empresa.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                            {despesa.empresa?.nome || "Não informada"}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">CPF do Solicitante</p>
                                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                        {despesa.solicitante.cpf || "Não informado"}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-slate-500 font-medium">Chave PIX para Pagamento</p>
                                        {!isEditingPix && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingPix(true)}
                                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                            >
                                                Alterar
                                            </button>
                                        )}
                                    </div>
                                    {isEditingPix ? (
                                        <div className="mt-1 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <Input
                                                    value={editChavePix}
                                                    onChange={(e) => setEditChavePix(e.target.value)}
                                                    placeholder="CPF, E-mail, Celular ou Aleatória"
                                                    className="h-8 text-xs font-mono bg-slate-50 dark:bg-slate-800"
                                                />
                                                {effectivePix && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditChavePix(effectivePix)
                                                            setIsEditingPix(false)
                                                        }}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </div>
                                            {!effectivePix && (
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                                    Como na diária, a chave PIX é necessária para o pagamento no ERP.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                                {editChavePix || effectivePix || "NÃO INFORMADA"}
                                            </span>
                                            {(editChavePix || effectivePix) && (
                                                <button
                                                    type="button"
                                                    onClick={copyPix}
                                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 cursor-pointer"
                                                    title="Copiar Chave PIX"
                                                >
                                                    {copiedPix ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Seção 3: Comentários e Observações */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                Justificativa e Comentários
                            </h4>
                            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500">Descrição / Motivo Informado:</p>
                                    <p className="text-slate-800 dark:text-slate-200 font-medium text-sm whitespace-pre-wrap mt-0.5">
                                        {despesa.descricao}
                                    </p>
                                </div>
                                {despesa.observacao && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <p className="text-[11px] font-semibold text-slate-500">Observação Complementar:</p>
                                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5">
                                            {despesa.observacao}
                                        </p>
                                    </div>
                                )}
                                {despesa.justificativaAprovacao && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Nota de Aprovação:</p>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                            {despesa.justificativaAprovacao}
                                        </p>
                                    </div>
                                )}
                                {despesa.justificativaReprovacao && (
                                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-200/50">
                                        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Motivo da Reprovação / Devolução:</p>
                                        <p className="text-rose-800 dark:text-rose-200 font-medium mt-0.5">
                                            {despesa.justificativaReprovacao}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Seção 4: Itens Desdobrados (se houver) */}
                        {despesa.itens && despesa.itens.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5" />
                                    Itens da Despesa ({despesa.itens.length})
                                </h4>
                                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="p-2.5">Descrição</th>
                                                <th className="p-2.5">Categoria</th>
                                                <th className="p-2.5">Centro de Custo</th>
                                                <th className="p-2.5 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {despesa.itens.map((it: any, idx: number) => (
                                                <tr key={it.id || idx}>
                                                    <td className="p-2.5 font-medium text-slate-900 dark:text-white">{it.descricao || "-"}</td>
                                                    <td className="p-2.5 text-slate-600">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                                                            {it.categoria || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-slate-500 text-xs">
                                                        {it.centroCustoNome ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                                                {it.centroCustoNome}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Padrão</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                                                        {formatCurrency(Number(it.valorTotal || it.valor || (Number(it.valorUnitario || 0) * (it.quantidade || 1)) || 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Seção 5: Comprovantes e Anexos */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5" />
                                Comprovantes Anexados ({despesa.anexos?.length || 0})
                            </h4>
                            {despesa.anexos && despesa.anexos.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {despesa.anexos.map((anexo: any, idx: number) => (
                                        <div 
                                            key={anexo.id || idx}
                                            className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Receipt className="w-4 h-4 text-blue-500 shrink-0" />
                                                <div className="truncate">
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={anexo.nomeOriginal || anexo.nome}>
                                                        {anexo.nomeOriginal || anexo.nome || `Comprovante ${idx + 1}`}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-mono">
                                                        {anexo.tamanho ? `${(anexo.tamanho / 1024).toFixed(1)} KB` : "Arquivo"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPreviewAnexo(anexo)}
                                                className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer shrink-0 gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Visualizar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                    Nenhum comprovante anexado a esta solicitação.
                                </p>
                            )}
                        </div>

                        {/* Seção 6: Linha do Tempo e Histórico de Aprovação */}
                        {despesa.historico && despesa.historico.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Histórico de Eventos & Auditoria
                                </h4>
                                <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 ml-2 text-xs">
                                    {despesa.historico.map((h, i) => (
                                        <div key={h.id || i} className="relative pb-2">
                                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {h.usuario?.nome || "Sistema"}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(h.data).toLocaleString("pt-BR")}
                                                </span>
                                            </div>
                                            {h.observacao && (
                                                <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px]">
                                                    {h.observacao}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-10 text-xs rounded-xl"
                        >
                            Fechar
                        </Button>

                        {isApprover && isPendingApproval && (
                            <div className="flex items-center gap-2">
                                {onReprovar && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            onClose()
                                            onReprovar(despesa)
                                        }}
                                        className="h-10 text-xs rounded-xl border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold cursor-pointer"
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reprovar
                                    </Button>
                                )}
                                {onAprovar && (
                                    <Button
                                        onClick={() => {
                                            if (!editChavePix.trim()) {
                                                toast.warning("Atenção: Solicitação sem chave PIX. Como na diária, é altamente recomendado informar a chave PIX.")
                                            }
                                            onClose()
                                            onAprovar(despesa, selectedEmpresaId || undefined, editChavePix.trim() || undefined)
                                        }}
                                        className="h-10 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Aprovar (N2 / ERP)
                                    </Button>
                                )}
                            </div>
                        )}

                        {isApprover && isPrestacaoPending && onAprovarPrestacao && (
                            <Button
                                onClick={() => {
                                    onClose()
                                    onAprovarPrestacao(despesa)
                                }}
                                className="h-10 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar Prestação & Baixar
                            </Button>
                        )}

                        {isApprover && despesa.status === 'APROVADO' && !despesa.contaAzulPayableId && onSincronizarContaAzul && (
                            <Button
                                onClick={() => {
                                    if (!editChavePix.trim()) {
                                        toast.warning("Atenção: Informe uma chave PIX para garantir o pagamento correto no Conta Azul.")
                                    }
                                    onSincronizarContaAzul(despesa, editChavePix.trim() || undefined)
                                }}
                                className="h-10 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Sincronizar no Conta Azul
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Visualizador de comprovante */}
            {previewAnexo && (
                <AttachmentViewer
                    anexo={previewAnexo}
                    onClose={() => setPreviewAnexo(null)}
                />
            )}
        </>
    )
}
