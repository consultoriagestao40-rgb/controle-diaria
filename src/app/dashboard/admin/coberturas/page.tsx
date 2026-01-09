"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"

interface Item {
    id: string
    data: string
    status: string
    valor: string
    posto: { nome: string }
    diarista: { nome: string }
    reserva?: { nome: string }
    motivo: { descricao: string }
    supervisor: { nome: string }
    aprovador?: { nome: string }
    financeiro?: { nome: string }
}

export default function AdminCoberturasPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Date Filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        setLoading(true)
        try {
            let url = "/api/admin/coberturas"

            if (startDate && endDate) {
                const params = new URLSearchParams()
                params.append("start", startDate)
                params.append("end", endDate)
                url += `?${params.toString()}`
            }

            const res = await fetch(url)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setItems(data)
        } catch {
            toast.error("Erro ao carregar coberturas")
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setStartDate("")
        setEndDate("")
        // Fetch original list again to reset
        fetchItems() // This will see empty State, but state update is async.
        // Actually better to manually call with empty url or rely on useEffect if we added dependencies.
        // For simplicity:
        window.location.reload()
    }

    const filteredItems = items.filter(item =>
        item.diarista.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.posto.nome.toLowerCase().includes(search.toLowerCase()) ||
        (item.reserva?.nome && item.reserva.nome.toLowerCase().includes(search.toLowerCase()))
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>
            case 'APROVADO': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aprovado</Badge>
            case 'PAGO': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>
            case 'REPROVADO': return <Badge variant="destructive">Reprovado</Badge>
            case 'AJUSTE': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Ajuste</Badge>
            case 'CANCELADO': return <Badge variant="secondary">Cancelado</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Todas as Coberturas</h1>
                    <p className="text-muted-foreground">Visão geral de todos os lançamentos do sistema.</p>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por Diarista, Posto ou Colaborador..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">De:</span>
                            <Input
                                type="date"
                                className="w-auto"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Até:</span>
                            <Input
                                type="date"
                                className="w-auto"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={fetchItems} disabled={loading}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filtrar
                        </Button>
                        {(startDate || endDate) && (
                            <Button variant="ghost" onClick={clearFilters}>
                                Limpar
                            </Button>
                        )}
                    </div>
                </div>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Posto</TableHead>
                                    <TableHead>Diarista</TableHead>
                                    <TableHead>Quem Faltou</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Resp.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell>{new Date(item.data).toLocaleDateString()}</TableCell>
                                        <TableCell>{item.posto.nome}</TableCell>
                                        <TableCell className="font-medium">{item.diarista.nome}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.reserva?.nome || '-'}</TableCell>
                                        <TableCell>R$ {Number(item.valor).toFixed(2)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.supervisor.nome}
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
