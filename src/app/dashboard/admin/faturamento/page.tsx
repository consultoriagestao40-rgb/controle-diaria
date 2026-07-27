"use client"

import { useState, useEffect } from "react"
import {
    Receipt, FileSpreadsheet, Printer, Search, Filter, Loader2, ArrowLeft,
    TrendingUp, DollarSign, Zap, Building2, MapPin, Calendar, Percent, CheckCircle2, ShieldCheck,
    CheckSquare, Square, FileText, Check, AlertCircle, Eye, Sparkles, X, ChevronRight, ExternalLink, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import Link from "next/link"

interface FaturamentoItem {
    id: string
    data: string
    postoNome: string
    empresaId: string | null
    empresaNome: string
    diaristaNome: string
    reservaNome: string
    motivo: string
    valorDiaria: number
    taxaServicoPercentual: number
    valorTaxaServico: number
    valorFaturaCliente: number
    antecipada: boolean
    taxaAntecipacaoRetida: number
    valorPagoDiarista: number
    lucroPlantao: number
    status: string // 'PAGO' | 'APROVADO' | etc.
    faturado: boolean
    ponto?: {
        checkInAt: string
        checkOutAt?: string | null
    } | null
    faturaCliente?: {
        id: string
        numeroFatura: string
        geradaEm: string
        status: string
    } | null
}

interface TotaisFaturamento {
    qtdPlantoes: number
    totalDiariasBruto: number
    totalTaxaServicoCliente: number
    totalFaturaCliente: number
    totalCustoDiarista: number
    totalGanhoAntecipacao: number
    totalLucroPrestadora: number
}

interface CoberturaFatura {
    id: string
    data: string
    valor: number | string
    posto: { nome: string }
    diarista: { nome: string }
    reserva?: { nome: string } | null
    motivo: { descricao: string }
    ponto?: {
        checkInAt: string
        checkOutAt?: string | null
    } | null
}

interface FaturaEmitida {
    id: string
    numeroFatura: string
    empresaId: string
    empresa: { nome: string }
    valorDiarias: number
    taxaServicoPercentual: number
    valorTaxaServico: number
    valorTotal: number
    status: string
    vencimentoEm?: string | null
    createdAt: string
    coberturas?: CoberturaFatura[]
}

interface ItemFaturaDetalhada {
    id: string
    data: string
    postoNome: string
    quemFaltou: string
    quemCobriu: string
    motivo: string
    pontoInfo: string
    valorDiaria: number
    valorTaxaServico: number
    valorFaturaCliente: number
}

interface FaturaDetalheState {
    numeroFatura: string
    empresaNome: string
    periodoInicio: string
    periodoFim: string
    geradaEm: string
    vencimentoEm: string
    taxaServicoPercentual: number
    items: ItemFaturaDetalhada[]
    totalDiarias: number
    totalTaxa: number
    totalFatura: number
}

export default function FaturamentoClientesPage() {
    const [items, setItems] = useState<FaturamentoItem[]>([])
    const [totais, setTotais] = useState<TotaisFaturamento | null>(null)
    const [faturasEmitidas, setFaturasEmitidas] = useState<FaturaEmitida[]>([])
    const [loading, setLoading] = useState(true)

    // Abas de visualização
    const [statusTab, setStatusTab] = useState<"A_FATURAR" | "FATURADAS">("A_FATURAR")

    // Seleção manual de diárias para faturamento
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    // Filtros
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [empresaId, setEmpresaId] = useState("ALL")
    const [postoId, setPostoId] = useState("ALL")
    const [search, setSearch] = useState("")

    // Catalogs
    const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
    const [postos, setPostos] = useState<{ id: string; nome: string }[]>([])

    // Taxa do cliente
    const [taxaServicoInput, setTaxaServicoInput] = useState<number>(10.0)
    const [savingTaxa, setSavingTaxa] = useState(false)
    const [gerandoFatura, setGerandoFatura] = useState(false)

    // Modal & Documento Impresso da Fatura
    const [faturaModalOpen, setFaturaModalOpen] = useState(false)
    const [faturaDetalhe, setFaturaDetalhe] = useState<FaturaDetalheState | null>(null)

    const fetchFaturamento = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.append("statusFaturamento", statusTab)
            if (startDate) params.append("start", startDate)
            if (endDate) params.append("end", endDate)
            if (empresaId !== "ALL") params.append("empresaId", empresaId)
            if (postoId !== "ALL") params.append("postoId", postoId)

            const res = await fetch(`/api/admin/faturamento?${params.toString()}`)
            if (!res.ok) throw new Error()
            const data = await res.json()

            setItems(data.items || [])
            setTotais(data.totais || null)
            setFaturasEmitidas(data.faturasEmitidas || [])
            if (data.config?.taxaServicoClientePercentual !== undefined) {
                setTaxaServicoInput(data.config.taxaServicoClientePercentual)
            }
            setSelectedIds([])
        } catch {
            toast.error("Erro ao carregar dados de faturamento.")
        } finally {
            setLoading(false)
        }
    }

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/admin/options")
            if (res.ok) {
                const data = await res.json()
                setEmpresas(data.empresas || [])
                setPostos(data.postos || [])
            }
        } catch { }
    }

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        fetchFaturamento()
    }, [statusTab])

    const handleSalvarTaxaServico = async () => {
        setSavingTaxa(true)
        try {
            const res = await fetch("/api/admin/faturamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    acao: "SALVAR_TAXA",
                    taxaServicoClientePercentual: taxaServicoInput
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao salvar taxa.")

            toast.success("Taxa de Serviço do Cliente atualizada com sucesso!")
            fetchFaturamento()
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar taxa.")
        } finally {
            setSavingTaxa(false)
        }
    }

    // Seleção de Diárias Apenas para Status PAGO
    const diariasesPagas = items.filter(i => i.status === "PAGO")

    const toggleSelectAll = () => {
        if (selectedIds.length === diariasesPagas.length && diariasesPagas.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(diariasesPagas.map(i => i.id))
        }
    }

    const toggleSelectItem = (item: FaturamentoItem) => {
        if (item.status !== "PAGO") {
            toast.error("Esta diária ainda não foi baixada como PAGA ao diarista pelo financeiro. Apenas diárias PAGAS podem ser faturadas ao cliente.")
            return
        }
        setSelectedIds(prev =>
            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
        )
    }

    const formatarPonto = (ponto?: { checkInAt: string; checkOutAt?: string | null } | null) => {
        if (!ponto) return "Sem ponto GPS"
        const inStr = new Date(ponto.checkInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const outStr = ponto.checkOutAt ? new Date(ponto.checkOutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "Em Serviço"
        return `In: ${inStr} | Out: ${outStr}`
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
    }

    // Ação: Gerar Fatura do Cliente com os Itens Selecionados
    const handleGerarFaturaCliente = async () => {
        if (selectedIds.length === 0) {
            toast.error("Selecione ao menos 1 diária PAGA para gerar a fatura.")
            return
        }

        const selectedItemsList = items.filter(i => selectedIds.includes(i.id))

        const temNaoPago = selectedItemsList.some(i => i.status !== "PAGO")
        if (temNaoPago) {
            toast.error("Atenção: Apenas diárias com repasse baixado como PAGO ao diarista podem ser faturadas ao cliente.")
            return
        }

        const firstEmpresaId = selectedItemsList[0]?.empresaId
        const firstEmpresaNome = selectedItemsList[0]?.empresaNome

        if (!firstEmpresaId) {
            toast.error("Diárias selecionadas precisam estar vinculadas a um Cliente / Empresa.")
            return
        }

        const sameEmpresa = selectedItemsList.every(i => i.empresaId === firstEmpresaId)
        if (!sameEmpresa) {
            toast.error("Selecione diárias pertencentes ao MESMO cliente para gerar uma única fatura.")
            return
        }

        setGerandoFatura(true)
        try {
            const res = await fetch("/api/admin/faturamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    acao: "GERAR_FATURA",
                    coberturaIds: selectedIds,
                    empresaId: firstEmpresaId
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao gerar fatura.")

            toast.success(data.message)

            let totalDiarias = 0
            let totalTaxa = 0
            let totalFatura = 0

            const datas = selectedItemsList.map(i => new Date(i.data).getTime()).sort((a, b) => a - b)
            const pInicio = datas.length > 0 ? new Date(datas[0]).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"
            const pFim = datas.length > 0 ? new Date(datas[datas.length - 1]).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"

            const mappedItems: ItemFaturaDetalhada[] = selectedItemsList.map(i => {
                totalDiarias += i.valorDiaria
                totalTaxa += i.valorTaxaServico
                totalFatura += i.valorFaturaCliente

                return {
                    id: i.id,
                    data: i.data,
                    postoNome: i.postoNome,
                    quemFaltou: i.reservaNome,
                    quemCobriu: i.diaristaNome,
                    motivo: i.motivo,
                    pontoInfo: formatarPonto(i.ponto),
                    valorDiaria: i.valorDiaria,
                    valorTaxaServico: i.valorTaxaServico,
                    valorFaturaCliente: i.valorFaturaCliente
                }
            })

            const hoje = new Date()
            const vencimento = new Date()
            vencimento.setDate(vencimento.getDate() + 10)

            const detalheObj: FaturaDetalheState = {
                numeroFatura: data.fatura.numeroFatura,
                empresaNome: firstEmpresaNome,
                periodoInicio: pInicio,
                periodoFim: pFim,
                geradaEm: hoje.toLocaleDateString("pt-BR"),
                vencimentoEm: vencimento.toLocaleDateString("pt-BR"),
                taxaServicoPercentual: taxaServicoInput,
                items: mappedItems,
                totalDiarias,
                totalTaxa,
                totalFatura
            }

            setFaturaDetalhe(detalheObj)
            setFaturaModalOpen(true)
            fetchFaturamento()

        } catch (err: any) {
            toast.error(err.message || "Erro ao gerar fatura do cliente.")
        } finally {
            setGerandoFatura(false)
        }
    }

    // Visualizar extrato/documento de fatura da Tabela de Faturas Emitidas (Aba 2)
    const handleAbrirFaturaEmitida = (fatura: FaturaEmitida) => {
        const taxa = Number(fatura.taxaServicoPercentual || 10.0)
        let totalDiarias = Number(fatura.valorDiarias || 0)
        let totalTaxa = Number(fatura.valorTaxaServico || 0)
        let totalFatura = Number(fatura.valorTotal || 0)

        const coberturasList = fatura.coberturas || []
        const datas = coberturasList.map(c => new Date(c.data).getTime()).sort((a, b) => a - b)
        const pInicio = datas.length > 0 ? new Date(datas[0]).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"
        const pFim = datas.length > 0 ? new Date(datas[datas.length - 1]).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"

        const mappedItems: ItemFaturaDetalhada[] = coberturasList.map(c => {
            const vDiaria = Number(c.valor || 0)
            const vTaxa = Number((vDiaria * (taxa / 100)).toFixed(2))
            const vFatura = Number((vDiaria + vTaxa).toFixed(2))

            return {
                id: c.id,
                data: c.data,
                postoNome: c.posto?.nome || "Posto de Trabalho",
                quemFaltou: c.reserva?.nome || "Vaga em Aberto",
                quemCobriu: c.diarista?.nome || "Diarista",
                motivo: c.motivo?.descricao || "Substituição",
                pontoInfo: formatarPonto(c.ponto),
                valorDiaria: vDiaria,
                valorTaxaServico: vTaxa,
                valorFaturaCliente: vFatura
            }
        })

        const gerada = new Date(fatura.createdAt)
        const vencimento = fatura.vencimentoEm ? new Date(fatura.vencimentoEm) : new Date(gerada.getTime() + 10 * 24 * 60 * 60 * 1000)

        setFaturaDetalhe({
            numeroFatura: fatura.numeroFatura,
            empresaNome: fatura.empresa?.nome || "Cliente",
            periodoInicio: pInicio,
            periodoFim: pFim,
            geradaEm: gerada.toLocaleDateString("pt-BR"),
            vencimentoEm: vencimento.toLocaleDateString("pt-BR"),
            taxaServicoPercentual: taxa,
            items: mappedItems,
            totalDiarias,
            totalTaxa,
            totalFatura
        })

        setFaturaModalOpen(true)
    }

    // EXPORTADOR / IMPRESSOR DE FATURA DE ALTA DEFINIÇÃO EM UMA JANELA INDEPENDENTE (SEM PÁGINA EM BRANCO)
    const handleExecutarImpressaoPDF = (detalheTarget?: FaturaDetalheState | null) => {
        const detalhe = detalheTarget || faturaDetalhe
        if (!detalhe) return

        const clienteClean = detalhe.empresaNome.replace(/[^a-zA-Z0-9]/g, '_')
        const pInicioClean = detalhe.periodoInicio.replace(/\//g, '-')
        const pFimClean = detalhe.periodoFim.replace(/\//g, '-')
        const nomeArquivoPDF = `Fatura_${detalhe.numeroFatura}_${clienteClean}_Periodo_${pInicioClean}_a_${pFimClean}`

        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            toast.error("Por favor, permita janelas pop-up no seu navegador para abrir o PDF da Fatura.")
            return
        }

        const rowsHtml = detalhe.items.map((item, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; font-weight: 700; white-space: nowrap;">${new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${item.postoNome}</td>
                <td style="padding: 6px 8px; color: #581c87; font-weight: 600;">${item.quemFaltou}</td>
                <td style="padding: 6px 8px; color: #0f172a; font-weight: 600;">${item.quemCobriu}</td>
                <td style="padding: 6px 8px; color: #475569;">${item.motivo}</td>
                <td style="padding: 6px 8px; color: #059669; font-family: monospace; font-size: 8.5px; white-space: nowrap;">${item.pontoInfo}</td>
                <td style="padding: 6px 8px; text-align: right; white-space: nowrap;">${formatCurrency(item.valorDiaria)}</td>
                <td style="padding: 6px 8px; text-align: right; color: #059669; font-weight: 700; white-space: nowrap;">+${formatCurrency(item.valorTaxaServico)}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: 900; color: #0f172a; white-space: nowrap;">${formatCurrency(item.valorFaturaCliente)}</td>
            </tr>
        `).join('')

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${nomeArquivoPDF}</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 8mm 10mm;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background: #ffffff;
                        color: #0f172a;
                        margin: 0;
                        padding: 16px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header-flex {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 12px;
                        margin-bottom: 16px;
                    }
                    .box-sacado {
                        display: flex;
                        justify-content: space-between;
                        background-color: #f1f5f9;
                        border: 1px solid #cbd5e1;
                        padding: 10px 14px;
                        border-radius: 10px;
                        margin-bottom: 16px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 9.5px;
                        margin-bottom: 16px;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    th {
                        background-color: #0f172a;
                        color: #ffffff;
                        text-transform: uppercase;
                        font-size: 8px;
                        letter-spacing: 0.5px;
                        padding: 8px 10px;
                        border: 1px solid #1e293b;
                    }
                    .totais-container {
                        display: flex;
                        justify-content: flex-end;
                        margin-bottom: 20px;
                        page-break-inside: avoid;
                    }
                    .box-totais {
                        width: 320px;
                        background-color: #0f172a;
                        color: #ffffff;
                        padding: 14px;
                        border-radius: 10px;
                    }
                    .pix-container {
                        background-color: #f0fdf4;
                        border: 1px solid #bbf7d0;
                        padding: 10px 14px;
                        border-radius: 10px;
                        margin-bottom: 30px;
                        font-size: 9.5px;
                        color: #166534;
                        page-break-inside: avoid;
                    }
                    .assinaturas {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 40px;
                        padding-top: 12px;
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <div class="header-flex">
                    <div>
                        <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0;">
                            JVS FACILITIES & GESTÃO DE SERVIÇOS
                        </h1>
                        <p style="font-size: 10px; color: #475569; font-weight: 600; margin: 2px 0 0 0;">
                            Prestação e Intermediação de Serviços de Cobertura e Diárias
                        </p>
                        <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0;">
                            CNPJ: 00.000.000/0001-00 &bull; Curitiba - PR &bull; Contato: financeiro@jvsfacilities.com.br
                        </p>
                    </div>

                    <div style="text-align: right; background-color: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; min-width: 220px;">
                        <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; display: block;">FATURA DE FECHAMENTO</span>
                        <span style="font-size: 16px; font-weight: 900; color: #0f172a; font-family: monospace; display: block; margin: 2px 0;">
                            ${detalhe.numeroFatura}
                        </span>
                        <span style="font-size: 9px; color: #334155; font-weight: 700; display: block;">Data Emissão: ${detalhe.geradaEm}</span>
                        <span style="font-size: 9px; color: #059669; font-weight: 800; display: block;">Vencimento: ${detalhe.vencimentoEm}</span>
                    </div>
                </div>

                <div class="box-sacado">
                    <div>
                        <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #64748b; display: block;">CLIENTE / SACADO</span>
                        <h2 style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 2px 0 0 0;">${detalhe.empresaNome}</h2>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #64748b; display: block;">PERÍODO DE APURAÇÃO</span>
                        <span style="font-size: 11px; font-weight: 800; color: #0f172a; display: block; margin-top: 2px;">
                            De ${detalhe.periodoInicio} até ${detalhe.periodoFim}
                        </span>
                        <span style="font-size: 9px; color: #059669; font-weight: 800; display: block; margin-top: 2px;">
                            Total de ${detalhe.items.length} plantão(ões) faturados
                        </span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left; width: 80px;">Data</th>
                            <th style="text-align: left;">Posto de Trabalho</th>
                            <th style="text-align: left;">Quem Faltou</th>
                            <th style="text-align: left;">Quem Cobriu</th>
                            <th style="text-align: left;">Motivo</th>
                            <th style="text-align: left; width: 110px;">Presença (Ponto GPS)</th>
                            <th style="text-align: right; width: 80px;">Valor Diária</th>
                            <th style="text-align: right; width: 80px;">Taxa (${detalhe.taxaServicoPercentual}%)</th>
                            <th style="text-align: right; width: 85px;">Total Item</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="totais-container">
                    <div class="box-totais">
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; color: #94a3b8;">
                            <span>Subtotal Diárias:</span>
                            <span style="font-weight: 700; color: #ffffff;">${formatCurrency(detalhe.totalDiarias)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; color: #34d399;">
                            <span>Taxa de Serviço (${detalhe.taxaServicoPercentual}%):</span>
                            <span style="font-weight: 700;">+${formatCurrency(detalhe.totalTaxa)}</span>
                        </div>
                        <div style="border-top: 1px solid #334155; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 11px; font-weight: 900; text-transform: uppercase;">VALOR TOTAL DA FATURA:</span>
                            <span style="font-size: 16px; font-weight: 900; color: #34d399;">${formatCurrency(detalhe.totalFatura)}</span>
                        </div>
                    </div>
                </div>

                <div class="pix-container">
                    <span style="font-weight: 900; text-transform: uppercase; display: block; margin-bottom: 2px;">💰 DADOS PARA PAGAMENTO VIA PIX</span>
                    <p style="margin: 2px 0;">Chave PIX / CNPJ JVS Facilities: <strong>00.000.000/0001-00</strong></p>
                    <p style="margin: 2px 0; font-size: 8.5px; color: #15803d;">Após efetuar o pagamento, favor enviar o comprovante informando o número desta fatura (${detalhe.numeroFatura}).</p>
                </div>

                <div class="assinaturas">
                    <div style="width: 45%; border-top: 1px solid #94a3b8; text-align: center; font-size: 9px; color: #475569; padding-top: 4px;">
                        Assinatura do Responsável (Prestadora)
                    </div>
                    <div style="width: 45%; border-top: 1px solid #94a3b8; text-align: center; font-size: 9px; color: #475569; padding-top: 4px;">
                        Carimbo / Assinatura de Recebimento (Cliente)
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `

        printWindow.document.open()
        printWindow.document.write(fullHtml)
        printWindow.document.close()
    }

    const filteredItems = items.filter(item => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            item.empresaNome.toLowerCase().includes(s) ||
            item.postoNome.toLowerCase().includes(s) ||
            item.diaristaNome.toLowerCase().includes(s) ||
            item.reservaNome.toLowerCase().includes(s)
        )
    })

    const filteredFaturas = faturasEmitidas.filter(f => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            f.numeroFatura.toLowerCase().includes(s) ||
            f.empresa?.nome.toLowerCase().includes(s)
        )
    })

    const selectedItemsList = filteredItems.filter(i => selectedIds.includes(i.id))
    const totalSelecionadoFatura = selectedItemsList.reduce((acc, i) => acc + i.valorFaturaCliente, 0)

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/admin">
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Receipt className="h-6 w-6 text-primary" />
                            Fechamento & Faturamento de Clientes
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Apenas diárias com repasse <strong>PAGO ao diarista</strong> pelo financeiro podem ser selecionadas e faturadas ao cliente.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => {
                            const params = new URLSearchParams()
                            if (startDate) params.append("start", startDate)
                            if (endDate) params.append("end", endDate)
                            window.open(`/api/finance/export?${params.toString()}`, '_blank')
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Configuração Rápida de Taxa do Cliente */}
            <Card className="bg-slate-900 text-white rounded-3xl border-slate-800 shadow-xl overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Taxa de Gestão / Serviço</Badge>
                            <span className="text-xs text-slate-400 font-medium">Markup cobrado na Fatura do Cliente</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight">Configurar Taxa de Serviço do Cliente (%)</h3>
                        <p className="text-xs text-slate-400 max-w-xl">
                            Esta taxa de acréscimo é aplicada sobre o valor das diárias para compor a fatura final do cliente. As diárias não baixadas como pagas permanecerão com trava financeira.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                        <div className="relative w-28">
                            <Input
                                type="number"
                                step="0.5"
                                value={taxaServicoInput}
                                onChange={(e) => setTaxaServicoInput(Number(e.target.value))}
                                className="bg-slate-900 border-slate-700 text-white font-black text-right pr-7 rounded-xl"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                        </div>
                        <Button
                            onClick={handleSalvarTaxaServico}
                            disabled={savingTaxa}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                        >
                            {savingTaxa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Taxa"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Gerenciais */}
            {totais && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Fatura Cliente */}
                    <Card className="bg-gradient-to-br from-cyan-950/90 to-slate-900 text-white rounded-3xl border-cyan-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">Total Fatura Cliente</span>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {formatCurrency(totais.totalFaturaCliente)}
                                </div>
                                <p className="text-[10px] text-cyan-300/80 font-medium">{totais.qtdPlantoes} plantões listados</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                                <Receipt className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Receita Taxa de Serviço (Cliente) */}
                    <Card className="bg-gradient-to-br from-emerald-950/90 to-slate-900 text-white rounded-3xl border-emerald-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Taxa de Serviço ({taxaServicoInput}%)</span>
                                <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                    {formatCurrency(totais.totalTaxaServicoCliente)}
                                </div>
                                <p className="text-[10px] text-slate-400">Margem faturada ao cliente</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <Percent className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Receita de Antecipações */}
                    <Card className="bg-gradient-to-br from-amber-950/90 to-slate-900 text-white rounded-3xl border-amber-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Ganho c/ Antecipação</span>
                                <div className="text-2xl font-black text-amber-400 tracking-tight">
                                    {formatCurrency(totais.totalGanhoAntecipacao)}
                                </div>
                                <p className="text-[10px] text-slate-400">Retenção interna da plataforma</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Zap className="h-6 w-6 fill-amber-400" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Lucro Total da Prestadora */}
                    <Card className="bg-gradient-to-br from-indigo-950/90 to-slate-900 text-white rounded-3xl border-indigo-500/30 shadow-lg">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">Lucro Bruto Prestadora</span>
                                <div className="text-2xl font-black text-indigo-300 tracking-tight">
                                    {formatCurrency(totais.totalLucroPrestadora)}
                                </div>
                                <p className="text-[10px] text-slate-400">Taxa Serviço + Antecipações</p>
                            </div>
                            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SELETOR DE ABAS: ABA 1 (A FATURAR) vs ABA 2 (FATURAS FECHADAS) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setStatusTab("A_FATURAR")}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            statusTab === "A_FATURAR"
                                ? "bg-white text-slate-900 shadow-md"
                                : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        ⏳ Aba 1: Diárias a Faturar (Pendentes)
                    </button>
                    <button
                        onClick={() => setStatusTab("FATURADAS")}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            statusTab === "FATURADAS"
                                ? "bg-white text-slate-900 shadow-md"
                                : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        📄 Aba 2: Tabela de Faturas Emitidas (Fechadas)
                    </button>
                </div>

                {statusTab === "A_FATURAR" && selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl animate-fade-in">
                        <div className="text-xs">
                            <span className="font-black text-emerald-800">{selectedIds.length} diárias selecionadas</span>
                            <span className="text-slate-500 ml-2 font-bold">Total Fatura: {formatCurrency(totalSelecionadoFatura)}</span>
                        </div>
                        <Button
                            onClick={handleGerarFaturaCliente}
                            disabled={gerandoFatura}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs h-9 shadow-md cursor-pointer"
                        >
                            {gerandoFatura ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <Receipt className="h-4 w-4 mr-1.5" /> Gerar Fatura do Cliente
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Filtros de Busca */}
            <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Início</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data Fim</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cliente / Empresa</label>
                            <Select value={empresaId} onValueChange={setEmpresaId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Clientes</SelectItem>
                                    {empresas.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Posto de Trabalho</label>
                            <Select value={postoId} onValueChange={setPostoId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos os Postos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Postos</SelectItem>
                                    {postos.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <div className="relative flex-1">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                                placeholder="Buscar por número da fatura, cliente ou posto..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 rounded-xl border-slate-200"
                            />
                        </div>
                        <Button onClick={fetchFaturamento} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
                            <Filter className="h-4 w-4 mr-2" /> Filtrar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ABA 1: DIÁRIAS A FATURAR */}
            {statusTab === "A_FATURAR" && (
                <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                                ⏳ Diárias Disponíveis para Faturamento
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Regra de Segurança: Apenas diárias com repasse <strong>PAGO ao diarista</strong> pelo financeiro podem ser selecionadas e faturadas.
                            </p>
                        </div>

                        {filteredItems.length > 0 && (
                            <Button
                                onClick={handleGerarFaturaCliente}
                                disabled={selectedIds.length === 0 || gerandoFatura}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs h-10 px-4 shadow-md cursor-pointer"
                            >
                                {gerandoFatura ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <>
                                        <Receipt className="h-4 w-4 mr-1.5" /> Gerar Fatura do Cliente ({selectedIds.length})
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col justify-center items-center p-12 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carregando diárias...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm font-medium">
                                Nenhuma diária pendente de faturamento encontrada para estes filtros.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 px-4 w-10 text-center">
                                                <button
                                                    onClick={toggleSelectAll}
                                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                    title="Selecionar todas as diárias pagas ao diarista"
                                                >
                                                    {selectedIds.length === diariasesPagas.length && diariasesPagas.length > 0 ? (
                                                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                                                    ) : (
                                                        <Square className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3.5 px-6">Data</th>
                                            <th className="py-3.5 px-6">Cliente / Empresa</th>
                                            <th className="py-3.5 px-6">Posto de Trabalho</th>
                                            <th className="py-3.5 px-6">Quem Faltou</th>
                                            <th className="py-3.5 px-6">Quem Cobriu</th>
                                            <th className="py-3.5 px-6 text-center">Pgto Diarista</th>
                                            <th className="py-3.5 px-6 text-right">Valor Diária</th>
                                            <th className="py-3.5 px-6 text-right">Taxa Serviço ({taxaServicoInput}%)</th>
                                            <th className="py-3.5 px-6 text-right">Valor Fatura</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredItems.map(item => {
                                            const isSelected = selectedIds.includes(item.id)
                                            const isPagoDiarista = item.status === "PAGO"

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`transition-colors ${
                                                        isSelected
                                                            ? "bg-emerald-50/50"
                                                            : !isPagoDiarista
                                                            ? "bg-slate-50/40 opacity-75"
                                                            : "hover:bg-slate-50/70"
                                                    }`}
                                                >
                                                    <td className="py-4 px-4 text-center">
                                                        {isPagoDiarista ? (
                                                            <button
                                                                onClick={() => toggleSelectItem(item)}
                                                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                            >
                                                                {isSelected ? (
                                                                    <CheckSquare className="h-5 w-5 text-emerald-600" />
                                                                ) : (
                                                                    <Square className="h-5 w-5" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <div title="Trava Financeira: Diária precisa ser baixada como PAGA ao diarista antes de ser faturada ao cliente.">
                                                                <Lock className="h-4 w-4 text-slate-300 mx-auto" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-slate-900">
                                                        {item.empresaNome}
                                                    </td>
                                                    <td className="py-4 px-6 font-semibold text-slate-700">
                                                        {item.postoNome}
                                                    </td>
                                                    <td className="py-4 px-6 font-semibold text-purple-900">
                                                        {item.reservaNome}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {item.diaristaNome}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        {isPagoDiarista ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black">
                                                                ✅ Pago Diarista
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold" title="Aguardando baixa do pagamento no financeiro">
                                                                ⏳ Pendente Pgto
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                        {formatCurrency(item.valorDiaria)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">
                                                        +{formatCurrency(item.valorTaxaServico)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                                                        {formatCurrency(item.valorFaturaCliente)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ABA 2: TABELA DE FATURAS EMITIDAS (FATURAS FECHADAS) */}
            {statusTab === "FATURADAS" && (
                <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                            📄 Tabela de Faturas Emitidas (Faturas Fechadas)
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Histórico oficial de faturas geradas. Clique em Ver Extrato para abrir o documento oficial e exportar o PDF de alta qualidade.
                        </p>
                    </div>

                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex flex-col justify-center items-center p-12 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carregando faturas emitidas...</p>
                            </div>
                        ) : filteredFaturas.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm font-medium">
                                Nenhuma fatura emitida encontrada para os filtros selecionados.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="py-3.5 px-6">Nº da Fatura</th>
                                            <th className="py-3.5 px-6">Cliente / Sacado</th>
                                            <th className="py-3.5 px-6">Data Emissão</th>
                                            <th className="py-3.5 px-6">Vencimento</th>
                                            <th className="py-3.5 px-6 text-center">Qtd. Plantões</th>
                                            <th className="py-3.5 px-6 text-right">Subtotal Diárias</th>
                                            <th className="py-3.5 px-6 text-right">Taxa Serviço</th>
                                            <th className="py-3.5 px-6 text-right">Total Fatura</th>
                                            <th className="py-3.5 px-6 text-center">Status</th>
                                            <th className="py-3.5 px-6 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredFaturas.map(f => {
                                            const totalDiarias = Number(f.valorDiarias || 0)
                                            const totalTaxa = Number(f.valorTaxaServico || 0)
                                            const totalFatura = Number(f.valorTotal || 0)
                                            const qtdPlantoes = f.coberturas?.length || 0

                                            return (
                                                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-4 px-6 font-black text-slate-900">
                                                        <Badge className="bg-slate-900 text-white font-mono text-xs px-2.5 py-1 rounded-lg">
                                                            {f.numeroFatura}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-slate-900">
                                                        {f.empresa?.nome || "Cliente Padrão"}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-slate-700">
                                                        {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="py-4 px-6 font-medium text-emerald-700">
                                                        {f.vencimentoEm ? new Date(f.vencimentoEm).toLocaleDateString('pt-BR') : "-"}
                                                    </td>
                                                    <td className="py-4 px-6 text-center font-bold text-slate-700">
                                                        {qtdPlantoes} plantão(ões)
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                        {formatCurrency(totalDiarias)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-semibold text-emerald-600">
                                                        +{formatCurrency(totalTaxa)} ({f.taxaServicoPercentual}%)
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                                                        {formatCurrency(totalFatura)}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black">
                                                            ✅ Emitida
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAbrirFaturaEmitida(f)}
                                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-8 px-3 shadow-xs cursor-pointer"
                                                        >
                                                            <Printer className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Ver Extrato (PDF)
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* MODAL DA FATURA PARA VISUALIZAÇÃO EM TELA (PREVIEW) */}
            <Dialog open={faturaModalOpen} onOpenChange={setFaturaModalOpen}>
                <DialogContent showCloseButton={false} className="max-w-4xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    Fatura de Fechamento {faturaDetalhe?.numeroFatura}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs">
                                    Documento Oficial de Cobrança de Serviços Prestados
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={() => handleExecutarImpressaoPDF(faturaDetalhe)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md">
                                <Printer className="h-4 w-4 mr-1.5" /> Exportar PDF Paisagem (A4)
                            </Button>
                            <Button variant="ghost" onClick={() => setFaturaModalOpen(false)} className="text-slate-400 hover:text-white rounded-xl h-9 w-9 p-0">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {faturaDetalhe && (
                        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white">
                            {/* Header da Fatura na Tela */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">JVS FACILITIES & GESTÃO DE SERVIÇOS</h2>
                                    <p className="text-xs text-slate-500 font-medium">Prestação e Intermediação de Plantões e Coberturas</p>
                                    <p className="text-xs text-slate-400 mt-1">CNPJ: 00.000.000/0001-00 &bull; Curitiba - PR</p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left sm:text-right min-w-[220px]">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Número da Fatura</span>
                                    <span className="text-lg font-black text-slate-900 tracking-tight block font-mono">{faturaDetalhe.numeroFatura}</span>
                                    <span className="text-xs text-slate-500 font-bold block mt-1">Emissão: {faturaDetalhe.geradaEm}</span>
                                    <span className="text-xs text-emerald-600 font-bold block">Vencimento: {faturaDetalhe.vencimentoEm}</span>
                                </div>
                            </div>

                            {/* Dados do Cliente Contratante & Período */}
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Cliente / Sacado</span>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{faturaDetalhe.empresaNome}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Fatura de fechamento de serviços prestados</p>
                                </div>
                                <div className="sm:text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Período de Apuração</span>
                                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                                        📅 {faturaDetalhe.periodoInicio} até {faturaDetalhe.periodoFim}
                                    </span>
                                    <span className="text-xs text-emerald-700 font-bold block mt-1">
                                        {faturaDetalhe.items.length} plantão(ões) faturados
                                    </span>
                                </div>
                            </div>

                            {/* Tabela Discriminada de Plantões Faturados */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 font-black uppercase text-slate-600">
                                            <th className="py-3 px-3">Data</th>
                                            <th className="py-3 px-3">Posto de Trabalho</th>
                                            <th className="py-3 px-3">Quem Faltou</th>
                                            <th className="py-3 px-3">Quem Cobriu</th>
                                            <th className="py-3 px-3">Motivo</th>
                                            <th className="py-3 px-3 text-right">Diária</th>
                                            <th className="py-3 px-3 text-right">Taxa ({faturaDetalhe.taxaServicoPercentual}%)</th>
                                            <th className="py-3 px-3 text-right">Total Faturado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                                        {faturaDetalhe.items.map(item => (
                                            <tr key={item.id}>
                                                <td className="py-3 px-3 font-bold whitespace-nowrap">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                <td className="py-3 px-3 font-semibold text-slate-900">{item.postoNome}</td>
                                                <td className="py-3 px-3 font-semibold text-purple-900">{item.quemFaltou}</td>
                                                <td className="py-3 px-3 font-medium text-slate-800">{item.quemCobriu}</td>
                                                <td className="py-3 px-3 text-slate-600">{item.motivo}</td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap">{formatCurrency(item.valorDiaria)}</td>
                                                <td className="py-3 px-3 text-right text-emerald-700 whitespace-nowrap">+{formatCurrency(item.valorTaxaServico)}</td>
                                                <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">{formatCurrency(item.valorFaturaCliente)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Resumo de Valores e Totais da Fatura */}
                            <div className="flex justify-end pt-2">
                                <div className="w-full sm:w-80 bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
                                    <div className="flex justify-between text-xs text-slate-300">
                                        <span>Subtotal Diárias:</span>
                                        <span className="font-bold">{formatCurrency(faturaDetalhe.totalDiarias)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-emerald-400">
                                        <span>Taxa de Serviço ({faturaDetalhe.taxaServicoPercentual}%):</span>
                                        <span className="font-bold">+{formatCurrency(faturaDetalhe.totalTaxa)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-lg font-black text-white">
                                        <span>TOTAL FATURA:</span>
                                        <span className="text-xl text-emerald-400">{formatCurrency(faturaDetalhe.totalFatura)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                        <Button onClick={() => handleExecutarImpressaoPDF(faturaDetalhe)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md">
                            <Printer className="h-4 w-4 mr-1.5" /> Exportar PDF Paisagem (A4)
                        </Button>
                        <Button onClick={() => setFaturaModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
