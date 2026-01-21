"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Calendar, MapPin, User, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Item {
    id: string
    data: string
    posto: { nome: string }
    diarista: { nome: string }
    motivo: { descricao: string }
    reserva: { nome: string }
    cargaHoraria: { descricao: string }
    valor: string
    supervisor: { nome: string }
    observacao?: string
    diariasNoMes?: number
    faltasNoMes?: number
    meioPagamentoSolicitado?: { descricao: string }
    empresa?: { nome: string }
}

export default function ApproverDashboard() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Action State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [detailItem, setDetailItem] = useState<Item | null>(null)
    const [actionType, setActionType] = useState<'REPROVAR' | 'AJUSTE' | null>(null)
    const [justificativa, setJustificativa] = useState("")
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/approver/items")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar pendências")
        } finally {
            setLoading(false)
        }
    }

    const filteredItems = items.filter(item => {
        const term = searchTerm.toLowerCase()
        return (
            item.posto.nome.toLowerCase().includes(term) ||
            item.diarista.nome.toLowerCase().includes(term) ||
            item.supervisor.nome.toLowerCase().includes(term) ||
            item.reserva?.nome.toLowerCase().includes(term) ||
            item.motivo.descricao.toLowerCase().includes(term)
        )
    })

    const handleQuickApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Confirmar aprovação?")) return
        await submitAction(id, 'APROVAR')
    }

    const openActionDialog = (item: Item, type: 'REPROVAR' | 'AJUSTE', e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedItem(item)
        setActionType(type)
        setJustificativa("")
    }

    const submitAction = async (id: string, acao: string, justif?: string) => {
        setProcessing(true)
        try {
            const res = await fetch("/api/approver/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, acao, justificativa: justif })
            })
            if (!res.ok) throw new Error()

            toast.success(`Sucesso: ${acao}`)
            setSelectedItem(null)
            fetchItems() // Refresh list
        } catch {
            toast.error("Erro ao processar ação")
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Painel de Aprovação</h1>
                <p className="text-muted-foreground">Analise as coberturas pendentes.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filtrar por posto, diarista, colaborador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredItems.length === 0 ? (
                <Card className="bg-slate-50 border-dashed py-10">
                    <div className="text-center text-muted-foreground">
                        {searchTerm ? "Nenhum resultado para a busca." : "Nenhuma pendência encontrada."}
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredItems.map(item => (
                        <Card
                            key={item.id}
                            className="overflow-hidden border-l-4 border-l-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setDetailItem(item)}
                        >
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    {/* Info Block */}
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(item.data).toLocaleDateString()}</span>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{item.posto.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div className="flex items-center gap-2">
                                                    <span title="Diarista">{item.diarista.nome}</span>
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                                        {item.diariasNoMes !== undefined ? `${item.diariasNoMes} já aprovadas` : 'Checking...'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-purple-600" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-purple-700" title="Colaborador (Falta)">{item.reserva?.nome || 'N/A'}</span>
                                                    {item.reserva && (
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                                            {item.faltasNoMes !== undefined ? `${item.faltasNoMes} já cobertas` : 'Checking...'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.motivo.descricao}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.cargaHoraria?.descricao || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                                <span>{formatCurrency(item.valor)}</span>
                                            </div>
                                        </div>

                                        {item.observacao && (
                                            <div className="mt-2 text-xs bg-slate-50 p-2 rounded text-slate-600 italic">
                                                "{item.observacao}"
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 rounded-md border border-slate-100">
                                            <span className="text-xs text-muted-foreground">Solicitado por:</span>
                                            <span className="text-sm font-medium text-slate-700">{item.supervisor.nome}</span>
                                        </div>
                                    </div>

                                    {/* Actions Block */}
                                    <div className="flex flex-col gap-2 justify-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4 min-w-[120px]">
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                            size="sm"
                                            onClick={(e) => handleQuickApprove(item.id, e)}
                                        >
                                            <CheckCircle className="mr-1 h-4 w-4" /> Aprovar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-orange-600 border-orange-200 hover:bg-orange-50 w-full sm:w-auto"
                                            size="sm"
                                            onClick={(e) => openActionDialog(item, 'AJUSTE', e)}
                                        >
                                            <AlertTriangle className="mr-1 h-4 w-4" /> Ajuste
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="w-full sm:w-auto"
                                            size="sm"
                                            onClick={(e) => openActionDialog(item, 'REPROVAR', e)}
                                        >
                                            <XCircle className="mr-1 h-4 w-4" /> Reprovar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog for Reject/Adjust */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'REPROVAR' ? 'Reprovar Cobertura' : 'Solicitar Ajuste'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'REPROVAR'
                                ? 'Justifique a reprovação. O item será cancelado.'
                                : 'Descreva o que precisa ser corrigido. O supervisor será notificado.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label>Justificativa / Motivo</Label>
                        <Textarea
                            value={justificativa}
                            onChange={e => setJustificativa(e.target.value)}
                            placeholder="Digite aqui..."
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedItem(null)}>Cancelar</Button>
                        <Button
                            variant={actionType === 'REPROVAR' ? 'destructive' : 'default'}
                            onClick={() => selectedItem && submitAction(selectedItem.id, actionType!, justificativa)}
                            disabled={processing || !justificativa.trim()}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Lançamento</DialogTitle>
                        <DialogDescription>Informações completas da cobertura lançada.</DialogDescription>
                    </DialogHeader>
                    {detailItem && (
                        <div className="grid gap-4 py-2">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <span className="text-sm font-medium text-slate-500">Data do Plantão</span>
                                <span className="font-bold">{format(new Date(detailItem.data), "PPP", { locale: ptBR })}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Posto</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.posto.nome}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Empresa (Grupo)</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.empresa?.nome || '-'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Diarista (Executante)</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.diarista.nome}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quem Faltou</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.reserva?.nome || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Motivo</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.motivo.descricao}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Carga Horária</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.cargaHoraria?.descricao || '-'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor (R$)</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white text-green-700">{formatCurrency(detailItem.valor)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Forma Pagamento</Label>
                                    <div className="font-medium p-2 border rounded-md bg-white">{detailItem.meioPagamentoSolicitado?.descricao || '-'}</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Observação</Label>
                                <div className="p-3 border rounded-md bg-slate-50 text-sm italic min-h-[60px]">
                                    {detailItem.observacao || "Sem observações."}
                                </div>
                            </div>

                            <div className="pt-2 border-t mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Solicitado por:</span>
                                    <span className="font-bold">{detailItem.supervisor.nome}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setDetailItem(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
