"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, Calendar, MapPin, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"

interface Cobertura {
    id: string
    data: string
    status: string
    posto: { nome: string }
    diarista: { nome: string }
}

export default function SupervisorDashboard() {
    const [coberturas, setCoberturas] = useState<Cobertura[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch("/api/supervisor/coberturas", { cache: 'no-store' })
            if (!res.ok) throw new Error()
            const data = await res.json()
            setCoberturas(data)
        } catch {
            toast.error("Erro ao carregar lançamentos")
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const map: any = {
            'PENDENTE': 'bg-yellow-100 text-yellow-800',
            'APROVADO': 'bg-green-100 text-green-800',
            'REPROVADO': 'bg-red-100 text-red-800',
            'PAGO': 'bg-blue-100 text-blue-800',
            'AJUSTE': 'bg-orange-100 text-orange-800',
        }
        return <Badge variant="outline" className={`${map[status] || 'bg-gray-100'} border-0`}>{status}</Badge>
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Minhas Diárias</h1>
                <p className="text-muted-foreground text-sm">Gerencie seus lançamentos e acompanhe os status.</p>
            </div>

            <Link href="/dashboard/supervisor/nova" className="block">
                <Button className="w-full h-12 text-lg shadow-md" size="lg">
                    <Plus className="mr-2 h-5 w-5" /> Nova Diária
                </Button>
            </Link>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Recentes
                </h2>

                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : coberturas.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p>Nenhum lançamento encontrado.</p>
                            <p className="text-xs">Clique em "Nova Diária" para começar.</p>
                        </CardContent>
                    </Card>
                ) : (
                    coberturas.map((item) => (
                        <Link key={item.id} href={`/dashboard/supervisor/editar/${item.id}`} className="block">
                            <Card className="overflow-hidden active:scale-[0.99] transition-transform hover:shadow-md cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-base">{new Date(item.data).toLocaleDateString()}</span>
                                            <span className="text-xs text-muted-foreground">ID: {item.id.slice(0, 6)}</span>
                                        </div>
                                        {getStatusBadge(item.status)}
                                    </div>

                                    <div className="grid gap-2 text-sm mt-3">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium truncate">{item.posto.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate">{item.diarista.nome}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
