"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Calendar, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"

interface Item {
    id: string
    data: string
    dataPagamento: string
    posto: { nome: string }
    diarista: { nome: string }
    valor: string
    meioPagamentoEfetivado?: { descricao: string }
    financeiro: { nome: string }
    anexos: { id: string; url: string; nomeOriginal: string }[]
}

export default function FinanceHistoryPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/finance/history")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar histórico")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/financeiro">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Histórico de Pagamentos</h1>
                    <p className="text-muted-foreground">Registros de todas as baixas efetuadas.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Nenhum histórico encontrado.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data Pagto</TableHead>
                                    <TableHead>Diarista / Posto</TableHead>
                                    <TableHead>Meio</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Comprovante</TableHead>
                                    <TableHead>Resp.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(item.dataPagamento).toLocaleDateString()}</span>
                                                <span className="text-xs text-muted-foreground">Ref: {new Date(item.data).toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{item.diarista.nome}</span>
                                                <span className="text-xs text-muted-foreground">{item.posto.nome}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{item.meioPagamentoEfetivado?.descricao || '-'}</Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-green-700">
                                            {formatCurrency(item.valor)}
                                        </TableCell>
                                        <TableCell>
                                            {item.anexos && item.anexos.length > 0 ? (
                                                <a href={item.anexos[0].url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                                    <Download className="h-3 w-3 mr-1" />
                                                    <span className="text-xs truncate max-w-[100px]">{item.anexos[0].nomeOriginal}</span>
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.financeiro?.nome}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
