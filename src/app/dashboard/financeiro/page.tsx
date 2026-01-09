"use client"

import { useState, useEffect } from "react"
import { CheckCircle, DollarSign, Loader2, Calendar, MapPin, User, FileText, CreditCard, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

interface Item {
    id: string
    data: string
    posto: { nome: string }
    diarista: { nome: string }
    motivo: { descricao: string }
    valor: string
    supervisor: { nome: string }
    meioPagamentoSolicitado: { id: string; descricao: string }
    observacao?: string
}

interface Meio {
    id: string
    descricao: string
}

export default function FinanceDashboard() {
    const [items, setItems] = useState<Item[]>([])
    const [meios, setMeios] = useState<Meio[]>([])
    const [loading, setLoading] = useState(true)

    // Payment Dialog State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)
    const [payData, setPayData] = useState({
        date: new Date().toISOString().split('T')[0],
        methodId: "",
        obs: ""
    })
    const [file, setFile] = useState<File | null>(null)
    const [processing, setProcessing] = useState(false)

    // Export Dialog State
    const [exportOpen, setExportOpen] = useState(false)
    const [exportDates, setExportDates] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of month
        end: new Date().toISOString().split('T')[0] // Today
    })

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/finance/payable")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data.items)
            setMeios(data.meios)
        } catch {
            toast.error("Erro ao carregar pagamentos pendentes")
        } finally {
            setLoading(false)
        }
    }

    const openPayDialog = (item: Item) => {
        setSelectedItem(item)
        setPayData({
            date: new Date().toISOString().split('T')[0], // Today
            methodId: item.meioPagamentoSolicitado.id, // Default to requested
            obs: ""
        })
        setFile(null)
    }

    const submitPayment = async () => {
        if (!selectedItem) return
        setProcessing(true)

        try {
            const formData = new FormData()
            formData.append("id", selectedItem.id)
            formData.append("dataPagamento", payData.date)
            formData.append("meioPagamentoId", payData.methodId)
            formData.append("justificativa", payData.obs)
            if (file) {
                formData.append("comprovante", file)
            }

            const res = await fetch("/api/finance/payable", {
                method: "POST",
                body: formData // No Content-Type header needed, browser sets boundary
            })
            if (!res.ok) throw new Error()

            toast.success("Pagamento registrado com sucesso!")
            setSelectedItem(null)
            fetchItems()
        } catch {
            toast.error("Erro ao processar pagamento")
        } finally {
            setProcessing(false)
        }
    }

    const handleExport = () => {
        const url = `/api/finance/export?start=${exportDates.start}&end=${exportDates.end}`
        window.open(url, '_blank')
        setExportOpen(false)
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
                        <p className="text-muted-foreground">Itens aprovados aguardando baixa financeira.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setExportOpen(true)}>
                            <Download className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                        <Link href="/dashboard/financeiro/historico">
                            <Button variant="outline">
                                <Calendar className="mr-2 h-4 w-4" /> Histórico
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
                <Card className="bg-slate-50 border-dashed py-10">
                    <div className="text-center text-muted-foreground">Nenhum pagamento pendente.</div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {items.map(item => (
                        <Card key={item.id} className="overflow-hidden border-l-4 border-l-green-500">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    {/* Info Block */}
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aprovado</Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(item.data).toLocaleDateString()}</span>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{item.posto.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.diarista.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                <span>Solicitado: {item.meioPagamentoSolicitado.descricao}</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-bold text-lg text-green-700">
                                                <DollarSign className="h-4 w-4" />
                                                <span>{Number(item.valor).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 rounded-md border border-slate-100">
                                            <span className="text-xs text-muted-foreground">Solicitado por:</span>
                                            <span className="text-sm font-medium text-slate-700">{item.supervisor.nome}</span>
                                        </div>
                                    </div>

                                    {/* Actions Block */}
                                    <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4 min-w-[120px]">
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                                            onClick={() => openPayDialog(item)}
                                        >
                                            <DollarSign className="mr-1 h-4 w-4" /> Pagar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Payment Dialog */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Pagamento</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Data do Pagamento</Label>
                            <Input
                                type="date"
                                value={payData.date}
                                onChange={e => setPayData({ ...payData, date: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Meio de Pagamento</Label>
                            <Select
                                value={payData.methodId}
                                onValueChange={v => setPayData({ ...payData, methodId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {meios.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Comprovante (Imagem/PDF)</Label>
                            <Input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>

                        <div>
                            <Label>Observações (Opcional)</Label>
                            <Textarea
                                value={payData.obs}
                                onChange={e => setPayData({ ...payData, obs: e.target.value })}
                                placeholder="Ex: Código do comprovante..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedItem(null)}>Cancelar</Button>
                        <Button
                            onClick={submitPayment}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Exportar Relatório</DialogTitle>
                        <DialogDescription>
                            Selecione o período para exportação.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                            <Label>Data Inicial</Label>
                            <Input
                                type="date"
                                value={exportDates.start}
                                onChange={e => setExportDates({ ...exportDates, start: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Data Final</Label>
                            <Input
                                type="date"
                                value={exportDates.end}
                                onChange={e => setExportDates({ ...exportDates, end: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setExportOpen(false)}>Cancelar</Button>
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Baixar .xlsx
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
