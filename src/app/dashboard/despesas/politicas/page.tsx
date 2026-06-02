"use client"

import { useState, useEffect } from "react"
import { Settings, ShieldAlert, Sparkles, Loader2, Save, BadgeDollarSign, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Politica {
    id?: string
    categoria: string
    descricao: string
    limiteValor: number
}

interface AuditoriaConfig {
    id?: string
    palavrasProibidas: string
}

export default function PoliticasConfigPage() {
    const [politicas, setPoliticas] = useState<Politica[]>([])
    const [palavrasProibidas, setPalavrasProibidas] = useState("")
    const [loading, setLoading] = useState(true)
    const [savingAuditoria, setSavingAuditoria] = useState(false)
    const [savingLimite, setSavingLimite] = useState<string | null>(null)

    // Valores para cadastrar novas políticas
    const [novaCategoria, setNovaCategoria] = useState("")
    const [novaDescricao, setNovaDescricao] = useState("")
    const [novoLimite, setNovoLimite] = useState("")

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/politicas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setPoliticas(data.politicas || [])
            setPalavrasProibidas(data.auditoria?.palavrasProibidas || "")
        } catch {
            toast.error("Erro ao carregar configurações de políticas")
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAuditoria = async () => {
        setSavingAuditoria(true)
        try {
            const res = await fetch("/api/politicas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipoConfig: "AUDITORIA",
                    palavrasProibidas
                })
            })

            if (!res.ok) throw new Error()
            toast.success("Políticas de termos proibidos salvas com sucesso!")
        } catch {
            toast.error("Erro ao salvar termos proibidos")
        } finally {
            setSavingAuditoria(false)
        }
    }

    const handleSaveLimite = async (categoria: string, valor: number, desc: string) => {
        setSavingLimite(categoria)
        try {
            const res = await fetch("/api/politicas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipoConfig: "LIMITE",
                    categoria,
                    limiteValor: valor,
                    descricao: desc
                })
            })

            if (!res.ok) throw new Error()
            toast.success(`Limite de "${categoria}" atualizado com sucesso!`)
            fetchConfig()
        } catch {
            toast.error("Erro ao salvar limite da categoria")
        } finally {
            setSavingLimite(null)
        }
    }

    const handleCreateLimite = async () => {
        if (!novaCategoria || !novoLimite || !novaDescricao) {
            toast.error("Preencha todos os campos da nova política.")
            return
        }

        const valor = parseFloat(novoLimite)
        if (isNaN(valor) || valor <= 0) {
            toast.error("Valor limite inválido.")
            return
        }

        setSavingLimite("NOVA")
        try {
            const res = await fetch("/api/politicas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipoConfig: "LIMITE",
                    categoria: novaCategoria.toUpperCase().trim(),
                    limiteValor: valor,
                    descricao: novaDescricao
                })
            })

            if (!res.ok) throw new Error()
            toast.success("Nova categoria cadastrada!")
            setNovaCategoria("")
            setNovaDescricao("")
            setNovoLimite("")
            fetchConfig()
        } catch {
            toast.error("Erro ao cadastrar limite")
        } finally {
            setSavingLimite(null)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-32 gap-6 max-w-5xl mx-auto">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Carregando painel de controle...</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto pt-4 relative">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                    Configuração de <span className="text-primary italic">Políticas de Despesas</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    Gerencie limites corporativos e regras da IA de auditoria
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* 1. Palavras Proibidas (IA Audit) */}
                <Card className="glass-card shadow-xl border-none bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                            Palavras Proibidas (IA Audit)
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs pt-1">
                            A Inteligência Artificial varrerá notas fiscais, PDFs e descrições buscando esses termos. Separe os termos por vírgula.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="palavras" className="font-bold text-slate-700">Palavras/Termos Banidos</Label>
                            <textarea
                                id="palavras"
                                rows={6}
                                value={palavrasProibidas}
                                onChange={(e) => setPalavrasProibidas(e.target.value)}
                                placeholder="ex: cerveja, chopp, energetico, preservativo, motel, cigarro, doce, sobremesa"
                                className="w-full rounded-2xl border-slate-200 focus:border-red-500 focus:ring-red-100 font-medium text-slate-700 p-4 transition-colors"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                disabled={savingAuditoria}
                                onClick={handleSaveAuditoria}
                                className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold uppercase tracking-wider text-[10px] gap-2 active:scale-95 transition-all shadow-md"
                            >
                                {savingAuditoria ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Salvar Regras de Auditoria
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Categorias e Limites Monetários */}
                <Card className="glass-card shadow-xl border-none bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
                            Limites de Despesas Permitidos
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs pt-1">
                            Estabeleça limites máximos tolerados por categoria. Despesas criadas acima do valor estipulado gerarão alertas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {politicas.length === 0 ? (
                            <p className="text-xs text-slate-400 font-semibold text-center py-6">Nenhum limite cadastrado ainda.</p>
                        ) : (
                            <div className="space-y-4">
                                {politicas.map((pol) => (
                                    <div key={pol.categoria} className="flex justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="space-y-0.5 flex-1">
                                            <p className="text-xs font-black text-slate-900 tracking-wide">{pol.categoria}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold">{pol.descricao}</p>
                                        </div>
                                        <div className="flex items-center gap-2 w-32 shrink-0">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={pol.limiteValor}
                                                onChange={(e) => {
                                                    const updated = politicas.map(p => 
                                                        p.categoria === pol.categoria ? { ...p, limiteValor: parseFloat(e.target.value) || 0 } : p
                                                    )
                                                    setPoliticas(updated)
                                                }}
                                                className="h-10 text-right font-bold rounded-lg"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={savingLimite === pol.categoria}
                                            onClick={() => handleSaveLimite(pol.categoria, pol.limiteValor, pol.descricao)}
                                            className="h-10 w-10 p-0 rounded-lg"
                                        >
                                            {savingLimite === pol.categoria ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4 text-emerald-600" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Adicionar nova política */}
                        <div className="border-t pt-6 space-y-4">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Nova Categoria de Limite</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="catName" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificador (sem acentos/espaços)</Label>
                                    <Input
                                        id="catName"
                                        placeholder="ex: HOSPEDAGEM, REFEICAO"
                                        value={novaCategoria}
                                        onChange={(e) => setNovaCategoria(e.target.value)}
                                        className="h-10 rounded-lg mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="catLimit" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Limite Máximo (R$)</Label>
                                    <Input
                                        id="catLimit"
                                        type="number"
                                        placeholder="0,00"
                                        value={novoLimite}
                                        onChange={(e) => setNovoLimite(e.target.value)}
                                        className="h-10 rounded-lg mt-1 font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="catDesc" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição Amigável</Label>
                                <Input
                                    id="catDesc"
                                    placeholder="ex: Hospedagem diária permitida"
                                    value={novaDescricao}
                                    onChange={(e) => setNovaDescricao(e.target.value)}
                                    className="h-10 rounded-lg mt-1"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    disabled={savingLimite === "NOVA"}
                                    onClick={handleCreateLimite}
                                    className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold uppercase tracking-wider text-[9px] gap-1.5 active:scale-95 transition-all"
                                >
                                    {savingLimite === "NOVA" ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Plus className="h-3.5 w-3.5" />
                                    )}
                                    Cadastrar Categoria
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
