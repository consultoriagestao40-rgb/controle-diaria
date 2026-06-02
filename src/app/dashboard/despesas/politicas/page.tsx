"use client"

import { useState, useEffect } from "react"
import { Settings, ShieldAlert, Sparkles, Loader2, Save, BadgeDollarSign, Plus, Check, Building2, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Politica {
    id?: string
    categoria: string
    descricao: string
    limiteValor: number
}

interface AuditoriaConfig {
    id?: string
    palavrasProibidas: string
    motivosRejeicao?: string
    logoPersonalizado?: string | null
}

export default function PoliticasConfigPage() {
    const router = useRouter()
    const [politicas, setPoliticas] = useState<Politica[]>([])
    const [palavrasProibidas, setPalavrasProibidas] = useState("")
    const [motivosRejeicao, setMotivosRejeicao] = useState("")
    const [logoPersonalizado, setLogoPersonalizado] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [savingAuditoria, setSavingAuditoria] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [savingLimite, setSavingLimite] = useState<string | null>(null)
    const [userRole, setUserRole] = useState("")

    // Valores para cadastrar novas políticas
    const [novaCategoria, setNovaCategoria] = useState("")
    const [novaDescricao, setNovaDescricao] = useState("")
    const [novoLimite, setNovoLimite] = useState("")

    useEffect(() => {
        fetchConfig()
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(session => {
                if (session?.user?.role) {
                    setUserRole(session.user.role)
                }
            })
            .catch(() => {})
    }, [])

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/politicas")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setPoliticas(data.politicas || [])
            setPalavrasProibidas(data.auditoria?.palavrasProibidas || "")
            setMotivosRejeicao(data.auditoria?.motivosRejeicao || "")
            setLogoPersonalizado(data.auditoria?.logoPersonalizado || null)
        } catch {
            toast.error("Erro ao carregar configurações de políticas")
        } finally {
            setLoading(false)
        }
    }

    const handleUploadLogo = async (file: File) => {
        if (!file) return

        const fileTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"]
        if (!fileTypes.includes(file.type)) {
            toast.error("Formato de arquivo não suportado. Use PNG, JPG, SVG ou WEBP.")
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error("O arquivo do logotipo deve ter no máximo 2MB.")
            return
        }

        setUploadingLogo(true)
        try {
            const formData = new FormData()
            formData.append("tipoConfig", "AUDITORIA")
            formData.append("logoFile", file)

            const res = await fetch("/api/politicas", {
                method: "POST",
                body: formData
            })

            if (!res.ok) throw new Error()
            const data = await res.json()
            setLogoPersonalizado(data.logoPersonalizado)
            toast.success("Logotipo da empresa atualizado com sucesso!")
            router.refresh()
        } catch {
            toast.error("Erro ao fazer upload do logotipo.")
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleRemoveLogo = async () => {
        setUploadingLogo(true)
        try {
            const res = await fetch("/api/politicas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipoConfig: "AUDITORIA",
                    logoPersonalizado: null
                })
            })

            if (!res.ok) throw new Error()
            setLogoPersonalizado(null)
            toast.success("Logotipo personalizado removido. Usando logotipo padrão!")
            router.refresh()
        } catch {
            toast.error("Erro ao remover logotipo personalizado.")
        } finally {
            setUploadingLogo(false)
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
                    palavrasProibidas,
                    motivosRejeicao
                })
            })

            if (!res.ok) throw new Error()
            toast.success("Regras de auditoria e motivos de devolução salvos com sucesso!")
        } catch {
            toast.error("Erro ao salvar regras de auditoria")
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
            toast.success(`Limite de "${categoria}" updated successfully!`)
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

    const isAdmin = userRole === "ADMIN"

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto pt-4 relative">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
                    {isAdmin ? "Configuração de " : "Políticas de "}
                    <span className="text-primary italic">Despesas Corporativas</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                    {isAdmin ? "Gerencie limites corporativos e regras da IA de auditoria" : "Consulte as diretrizes e limites máximos permitidos"}
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* 1. Categorias e Limites Monetários */}
                <Card className="glass-card shadow-xl border-none bg-white rounded-3xl overflow-hidden col-span-2 md:col-span-1">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
                            Limites de Despesas Permitidos
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs pt-1">
                            {isAdmin 
                                ? "Estabeleça limites máximos tolerados por categoria. Despesas criadas acima do valor estipulado gerarão alertas." 
                                : "Valores máximos tolerados para reembolso ou adiantamento por tipo de despesa."}
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
                                        {isAdmin ? (
                                            <>
                                                <div className="flex items-center gap-2 w-28 shrink-0">
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
                                                    className="h-10 w-10 p-0 rounded-lg shrink-0"
                                                >
                                                    {savingLimite === pol.categoria ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                    )}
                                                </Button>
                                            </>
                                        ) : (
                                            <span className="text-xs font-black text-slate-800 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 shrink-0">
                                                R$ {Number(pol.limiteValor).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {isAdmin && (
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
                        )}
                    </CardContent>
                </Card>

                {/* 2. Palavras Proibidas (IA Audit) */}
                <Card className="glass-card shadow-xl border-none bg-white rounded-3xl overflow-hidden col-span-2 md:col-span-1">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                            Diretrizes de Auditoria (IA Audit)
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs pt-1">
                            {isAdmin 
                                ? "A Inteligência Artificial varrerá notas fiscais, PDFs e descrições buscando esses termos. Separe os termos por vírgula." 
                                : "A IA audita automaticamente os comprovantes e descrições para garantir conformidade."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {isAdmin ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="palavras" className="font-bold text-slate-700">Palavras/Termos Banidos (IA Audit)</Label>
                                    <textarea
                                        id="palavras"
                                        rows={3}
                                        value={palavrasProibidas}
                                        onChange={(e) => setPalavrasProibidas(e.target.value)}
                                        placeholder="ex: cerveja, chopp, energetico, preservativo, motel, cigarro, doce, sobremesa"
                                        className="w-full rounded-2xl border-slate-200 focus:border-red-500 focus:ring-red-100 font-medium text-slate-700 p-4 transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="motivos" className="font-bold text-slate-700">Motivos de Rejeição/Devolução (Opções para Atores)</Label>
                                    <textarea
                                        id="motivos"
                                        rows={3}
                                        value={motivosRejeicao}
                                        onChange={(e) => setMotivosRejeicao(e.target.value)}
                                        placeholder="ex: Fora da política, Despesas não autorizada, Comprovante ilegível, Outros"
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
                                        Salvar Configurações
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 space-y-3">
                                    <p className="text-xs font-bold text-red-800 uppercase tracking-wide">⚠️ Regras de Conformidade Automática</p>
                                    <p className="text-xs text-red-700 leading-relaxed font-semibold">
                                        Não é permitido o reembolso ou adiantamento para despesas que incluam termos restritos pela empresa, tais como bebidas alcoólicas, cigarros, entretenimento adulto ou despesas pessoais que fujam da finalidade corporativa.
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-500 font-semibold leading-relaxed">
                                    <p className="font-bold text-slate-700">💡 Instruções Importantes:</p>
                                    <ul className="list-disc pl-4 space-y-1.5">
                                        <li>Lançamentos devem ser realizados **por item** (ex: cada almoço individualizado, diárias de hospedagem, etc.) com suas respectivas datas.</li>
                                        <li>Os valores digitados devem corresponder **exatamente** aos comprovantes anexados.</li>
                                        <li>Justifique detalhadamente a finalidade corporativa da despesa na descrição de cada item.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. Identidade Visual (Logo) */}
            {isAdmin && (
                <Card className="glass-card shadow-xl border-none bg-white rounded-3xl overflow-hidden mt-8">
                    <CardHeader className="bg-slate-50 border-b p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Logotipo da Empresa
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs pt-1">
                            Customize a identidade visual da plataforma. Faça o upload do logotipo da sua empresa que será exibido no menu lateral e nas navegações internas. Se nenhum logotipo for carregado, o sistema usará o logotipo padrão (ReembolsaFácil).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid md:grid-cols-3 gap-8 items-center">
                            {/* Visualização Atual */}
                            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 bg-slate-50 rounded-2xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Logotipo Atual</span>
                                <div className="h-24 w-full flex items-center justify-center bg-white border border-slate-200/50 rounded-xl p-4 shadow-sm">
                                    <img
                                        src={logoPersonalizado || "/logo.png"}
                                        alt="Logo da Empresa"
                                        className="h-16 w-auto object-contain rounded"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold mt-3">
                                    {logoPersonalizado ? "Logotipo Customizado" : "Logotipo Padrão"}
                                </span>
                            </div>

                            {/* Upload Area */}
                            <div className="md:col-span-2 space-y-4">
                                <Label className="text-xs font-bold text-slate-700">Fazer Upload de Novo Logotipo</Label>
                                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/20 group relative">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleUploadLogo(file)
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={uploadingLogo}
                                    />
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            {uploadingLogo ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Upload className="h-5 w-5" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-800">Clique para selecionar arquivo de imagem</p>
                                        <p className="text-[10px] text-slate-400 font-semibold">Formatos suportados: PNG, JPG, SVG, WEBP (Máx. 2MB)</p>
                                    </div>
                                </div>

                                {logoPersonalizado && (
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleRemoveLogo}
                                            disabled={uploadingLogo}
                                            className="h-10 px-4 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-wider text-[9px] gap-1.5 active:scale-95 transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remover Logo Personalizado
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

