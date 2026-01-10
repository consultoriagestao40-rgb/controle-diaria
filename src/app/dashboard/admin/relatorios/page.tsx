"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Download, FileSpreadsheet, List, MapPin, User, AlertCircle, Loader2, DollarSign } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

export default function RelatoriosPage() {
    const [exportOpen, setExportOpen] = useState(false)
    const [loadingStats, setLoadingStats] = useState(false)
    const [stats, setStats] = useState<any>(null)
    const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day current month
        end: new Date()
    })

    const [filters, setFilters] = useState({
        diaristaId: "all",
        motivoId: "all",
        postoId: "all",
        supervisorId: "all",
        colaboradorId: "all"
    })

    const [options, setOptions] = useState<any>({
        diaristas: [],
        motivos: [],
        postos: [],
        supervisores: [],
        colaboradores: []
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        try {
            // 1. Common Options
            const resOpts = await fetch("/api/supervisor/options")
            const dataOpts = await resOpts.json()

            // 2. Supervisors (Admin only)
            const resSups = await fetch("/api/admin/supervisores")
            const dataSups = await resSups.json()

            setOptions({
                diaristas: dataOpts.diaristas || [],
                motivos: dataOpts.motivos || [],
                postos: dataOpts.postos || [],
                supervisores: dataSups || [],
                colaboradores: dataOpts.reservas || [] // Remapped from reservas
            })
        } catch (e) {
            console.error("Failed to fetch filter options", e)
        }
    }

    const fetchStats = async () => {
        if (!dateRange.start || !dateRange.end) return
        setLoadingStats(true)
        try {
            const startStr = dateRange.start.toISOString().split('T')[0]
            const endStr = dateRange.end.toISOString().split('T')[0]

            let query = `?start=${startStr}&end=${endStr}&t=${Date.now()}`
            if (filters.diaristaId && filters.diaristaId !== 'all') query += `&diarista=${filters.diaristaId}`
            if (filters.motivoId && filters.motivoId !== 'all') query += `&motivo=${filters.motivoId}`
            if (filters.postoId && filters.postoId !== 'all') query += `&posto=${filters.postoId}`
            if (filters.supervisorId && filters.supervisorId !== 'all') query += `&supervisor=${filters.supervisorId}`
            if (filters.colaboradorId && filters.colaboradorId !== 'all') query += `&colaborador=${filters.colaboradorId}`

            const res = await fetch(`/api/admin/reports/stats${query}`, {
                cache: 'no-store'
            })
            if (res.ok) {
                setStats(await res.json())
            }
        } catch {
            toast.error("Erro ao carregar estatísticas")
        } finally {
            setLoadingStats(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [filters]) // Reload when filters change

    const handleFilterApply = () => {
        fetchStats()
    }

    const handleExport = () => {
        if (!dateRange.start || !dateRange.end) return

        const startStr = dateRange.start.toISOString().split('T')[0]
        const endStr = dateRange.end.toISOString().split('T')[0]

        let url = `/api/finance/export?start=${startStr}&end=${endStr}`
        // Note: Export might need update to support these filters too if requested essentially
        // For now, user only asked for filters on screen, but consistency suggests export should match view.
        // Assuming V1 only needs screen update as per request.
        window.open(url, '_blank')
        setExportOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h1>
                    <p className="text-muted-foreground">
                        Visão consolidada de custos e produtividade.
                    </p>
                </div>

                {/* Date Filter Bar */}
                <div className="flex items-end gap-2 p-2 bg-white rounded-lg border shadow-sm">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                            type="date"
                            className="h-8 w-[130px] text-sm"
                            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : undefined }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                            type="date"
                            className="h-8 w-[130px] text-sm"
                            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : undefined }))}
                        />
                    </div>
                    <Button size="sm" onClick={handleFilterApply} disabled={loadingStats}>
                        {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
                    </Button>
                </div>
            </div>

            <Separator />

            {/* TOTAL COST & CHART */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4">
                {/* Total Cost Card */}
                <Card className="bg-slate-50 border-primary/20 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Total (Período)</CardTitle>
                        <DollarSign className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {loadingStats ? "..." : `R$ ${Number(stats?.totalValue || 0).toFixed(2)}`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Soma de itens Pagos ou Aprovados.
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Chart */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Evolução Mensal (Ano Corrente)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[200px] w-full">
                            {loadingStats ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (!stats || !stats.monthlyStats) ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    Sem dados para o gráfico.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.monthlyStats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `R$${value}`}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* FILTERS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="space-y-1">
                    <Label className="text-xs">Diarista</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.diaristaId}
                        onChange={(e) => setFilters(prev => ({ ...prev, diaristaId: e.target.value }))}
                    >
                        <option value="all">Todos</option>
                        {options.diaristas.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Colaborador</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.colaboradorId}
                        onChange={(e) => setFilters(prev => ({ ...prev, colaboradorId: e.target.value }))}
                    >
                        <option value="all">Todos</option>
                        {options.colaboradores.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Motivo</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.motivoId}
                        onChange={(e) => setFilters(prev => ({ ...prev, motivoId: e.target.value }))}
                    >
                        <option value="all">Todos</option>
                        {options.motivos.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.descricao}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Posto</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.postoId}
                        onChange={(e) => setFilters(prev => ({ ...prev, postoId: e.target.value }))}
                    >
                        <option value="all">Todos</option>
                        {options.postos.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Supervisor</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.supervisorId}
                        onChange={(e) => setFilters(prev => ({ ...prev, supervisorId: e.target.value }))}
                    >
                        <option value="all">Todos</option>
                        {options.supervisores.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Actions / Export */}
            <div className="flex justify-end">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Exportar Dados (.xlsx)
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* RANKING DIARISTA */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-5 w-5 text-blue-600" />
                            Top 5 Diaristas
                        </CardTitle>
                        <CardDescription>Quem mais recebeu.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (!stats || stats.diaristaStats.length === 0) ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado.</p>
                        ) : (
                            <Table>
                                <TableBody>
                                    {stats.diaristaStats.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                                            <TableCell className="py-2 text-right text-sm">R$ {Number(item.value).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* RANKING COLABORADOR (NEW) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-5 w-5 text-purple-600" />
                            Por Colaborador
                        </CardTitle>
                        <CardDescription>Gastos por quem faltou.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (!stats || !stats.colaboradorStats || stats.colaboradorStats.length === 0) ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado.</p>
                        ) : (
                            <Table>
                                <TableBody>
                                    {stats.colaboradorStats.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                                            <TableCell className="py-2 text-right text-sm">R$ {Number(item.value).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* RANKING POSTO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-5 w-5 text-red-600" />
                            Top 5 Postos
                        </CardTitle>
                        <CardDescription>Maior custo por posto.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (!stats || stats.postoStats.length === 0) ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado.</p>
                        ) : (
                            <Table>
                                <TableBody>
                                    {stats.postoStats.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                                            <TableCell className="py-2 text-right text-sm">R$ {Number(item.value).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* RANKING MOTIVO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            Por Motivo
                        </CardTitle>
                        <CardDescription>Principais causas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : (!stats || stats.motivoStats.length === 0) ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado.</p>
                        ) : (
                            <Table>
                                <TableBody>
                                    {stats.motivoStats.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                                            <TableCell className="py-2 text-right text-sm">R$ {Number(item.value).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
