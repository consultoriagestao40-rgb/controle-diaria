"use client"

import { useState, useEffect } from "react"
import { CheckCircle, DollarSign, Loader2, Calendar, MapPin, User, FileText, CreditCard, Upload, Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"
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
    horaInicio?: string
    horaFim?: string
    posto: { nome: string }
    diarista: { nome: string; chavePix?: string }
    motivo: { descricao: string }
    valor: string
    supervisor: { nome: string }
    meioPagamentoSolicitado: { id: string; descricao: string }
    observacao?: string
    aprovadorN1?: { nome: string }
    justificativaAprovacaoN1?: string
    dataAprovacaoN1?: string
    aprovador?: { nome: string }
    justificativaAprovacaoN2?: string
    dataAprovacao?: string
    createdAt?: string
}

interface Meio {
    id: string
    descricao: string
}

export default function FinanceDashboard() {
    const [items, setItems] = useState<Item[]>([])
    const [meios, setMeios] = useState<Meio[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

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
        const timer = setTimeout(() => {
            fetchItems()
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    const fetchItems = async () => {
        try {
            const res = await fetch(`/api/finance/payable?search=${encodeURIComponent(search)}`)
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-4 text-slate-900">
                            Pagamentos
                            {!loading && (
                                <Badge variant="secondary" className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
                                    Total: {formatCurrency(items.reduce((acc, item) => acc + Number(item.valor), 0))}
                                </Badge>
                            )}
                        </h1>
                        <p className="text-slate-500 font-medium">Gestão financeira de diárias e coberturas aprovadas.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Pesquisar..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setExportOpen(true)}>
                                <Download className="mr-2 h-4 w-4" /> Exportar
                            </Button>
                            <Link href="/dashboard/financeiro/historico" className="flex-1 sm:flex-none">
                                <Button variant="outline" className="w-full">
                                    <Calendar className="mr-2 h-4 w-4" /> Histórico
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
                </div>
            ) : items.length === 0 ? (
                <Card className="glass-card border-dashed py-20 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="text-center text-slate-400 font-medium">Nenhum pagamento pendente no momento.</div>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {items.map(item => (
                        <Card key={item.id} className="glass-card overflow-hidden group hover:scale-[1.01] transition-all duration-300 premium-shadow">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row min-h-[180px]">
                                    {/* Left Accent Color */}
                                    <div className="w-1.5 bg-primary/80 group-hover:bg-primary transition-colors h-full absolute left-0" />

                                    {/* Info Block */}
                                    <div className="p-6 flex-1 space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px] tracking-widest px-2 py-0.5">Pendente</Badge>
                                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                            {(item.horaInicio || item.horaFim) && (
                                                <div className="text-[11px] font-black text-slate-900 bg-white shadow-sm border px-2 py-0.5 rounded-full flex items-center gap-1.5 ">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    {item.horaInicio || "??"} — {item.horaFim || "??"}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">Posto</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        <MapPin className="h-4 w-4 text-slate-600" />
                                                    </div>
                                                    <span className="font-bold text-slate-800 tracking-tight leading-tight">{item.posto.nome}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">Diarista</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                                        <User className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                    <span className="font-bold text-slate-800 tracking-tight leading-tight">{item.diarista.nome}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 pt-1">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-primary/20 transition-all duration-300">
                                                <div className="h-5 w-5 bg-white rounded border flex items-center justify-center text-[10px] font-black text-slate-900 shadow-sm">PIX</div>
                                                <span className="text-xs font-mono font-medium text-slate-600">{item.diarista.chavePix || "Sem chave definida"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-slate-400" />
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{item.meioPagamentoSolicitado.descricao}</span>
                                            </div>
                                        </div>

                                        {item.observacao && (
                                            <div className="text-[11px] bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-slate-600 italic leading-relaxed relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200" />
                                                "{item.observacao}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Status/Price Block */}
                                    <div className="p-6 md:w-56 bg-white/50 backdrop-blur-sm border-t md:border-t-0 md:border-l flex flex-col justify-center items-center gap-4 group-hover:bg-primary/[0.02] transition-colors">
                                        <div className="text-center">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Valor à pagar</span>
                                            <div className="text-3xl font-black text-slate-900 tracking-tighter mt-1 flex items-baseline gap-0.5">
                                                <span className="text-sm font-medium text-slate-400 mr-1">R$</span>
                                                {formatCurrency(item.valor).replace("R$", "").trim()}
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full bg-slate-900 hover:bg-primary shadow-lg hover:shadow-primary/20 transition-all duration-300 rounded-xl h-12 font-bold uppercase text-[11px] tracking-widest group-hover:scale-[1.03]"
                                            onClick={() => openPayDialog(item)}
                                        >
                                            <DollarSign className="mr-1 h-4 w-4" /> Baixar Pagamento
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
