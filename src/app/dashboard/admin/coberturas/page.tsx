"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Search, Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

    const [status, setStatus] = useState("ALL")

    // New Filters State
    const [filters, setFilters] = useState({
        diaristaId: "ALL",
        postoId: "ALL",
        reservaId: "ALL",
        motivoId: "ALL",
        supervisorId: "ALL"
    })

    const [options, setOptions] = useState({
        postos: [],
        diaristas: [],
        motivos: [],
        reservas: [],
        supervisores: []
    })

    useEffect(() => {
        fetchOptions()
        fetchItems()
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) setOptions(await res.json())
        } catch (e) {
            console.error("Failed to load options")
        }
    }

    const fetchItems = async () => {
        setLoading(true)
        try {
            let url = "/api/admin/coberturas"
            const params = new URLSearchParams()

            if (startDate && endDate) {
                params.append("start", startDate)
                params.append("end", endDate)
            }

            if (status && status !== "ALL") params.append("status", status)
            if (filters.diaristaId !== "ALL") params.append("diaristaId", filters.diaristaId)
            if (filters.postoId !== "ALL") params.append("postoId", filters.postoId)
            if (filters.reservaId !== "ALL") params.append("reservaId", filters.reservaId)
            if (filters.motivoId !== "ALL") params.append("motivoId", filters.motivoId)
            if (filters.supervisorId !== "ALL") params.append("supervisorId", filters.supervisorId)

            if (params.toString()) {
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
        setStatus("ALL")
        setFilters({
            diaristaId: "ALL",
            postoId: "ALL",
            reservaId: "ALL",
            motivoId: "ALL",
            supervisorId: "ALL"
        })
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
                <div className="flex flex-col gap-4">
                    {/* New Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Select value={filters.diaristaId} onValueChange={(v) => setFilters(prev => ({ ...prev, diaristaId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Diarista" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas Diaristas</SelectItem>
                                {options.diaristas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.reservaId} onValueChange={(v) => setFilters(prev => ({ ...prev, reservaId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Colaboradores</SelectItem>
                                {options.reservas.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.motivoId} onValueChange={(v) => setFilters(prev => ({ ...prev, motivoId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Motivos</SelectItem>
                                {options.motivos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.postoId} onValueChange={(v) => setFilters(prev => ({ ...prev, postoId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Posto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Postos</SelectItem>
                                {options.postos.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.supervisorId} onValueChange={(v) => setFilters(prev => ({ ...prev, supervisorId: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Supervisores</SelectItem>
                                {options.supervisores.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Existing Date/Status/Search Row */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 max-w-sm w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por texto..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <Input
                                type="date"
                                className="w-[150px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="date"
                                className="w-[150px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Status: Todos</SelectItem>
                                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                                    <SelectItem value="PAGO">Pago</SelectItem>
                                    <SelectItem value="REPROVADO">Reprovado</SelectItem>
                                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={fetchItems} disabled={loading}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filtrar
                            </Button>
                            <Button variant="ghost" onClick={clearFilters}>
                                Limpar
                            </Button>
                            <Button variant="outline" onClick={() => {
                                const params = new URLSearchParams()
                                if (startDate && endDate) {
                                    params.append("start", startDate)
                                    params.append("end", endDate)
                                }
                                if (status && status !== "ALL") params.append("status", status)
                                if (filters.diaristaId !== "ALL") params.append("diaristaId", filters.diaristaId)
                                if (filters.postoId !== "ALL") params.append("postoId", filters.postoId)
                                if (filters.reservaId !== "ALL") params.append("reservaId", filters.reservaId)
                                if (filters.motivoId !== "ALL") params.append("motivoId", filters.motivoId)
                                if (filters.supervisorId !== "ALL") params.append("supervisorId", filters.supervisorId)

                                window.open(`/api/finance/export?${params.toString()}`, '_blank')
                            }}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Excel
                            </Button>
                        </div>
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
                                    <TableHead>Data</TableHead>
                                    <TableHead>Posto</TableHead>
                                    <TableHead>Diarista</TableHead>
                                    <TableHead>Quem Faltou</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Solicitante</TableHead>
                                    <TableHead>Aprovador</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{new Date(item.data).toLocaleDateString()}</TableCell>
                                        <TableCell>{item.posto.nome}</TableCell>
                                        <TableCell className="font-medium">{item.diarista.nome}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.reserva?.nome || '-'}</TableCell>
                                        <TableCell>R$ {Number(item.valor).toFixed(2)}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.supervisor.nome}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.aprovador?.nome || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                                    <TableCell className="font-bold">
                                        R$ {filteredItems.reduce((acc, item) => acc + Number(item.valor), 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
