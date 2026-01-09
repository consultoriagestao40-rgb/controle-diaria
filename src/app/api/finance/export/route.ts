import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Allow Admin/Finance/Approver to export? Let's say yes.

    try {
        const { searchParams } = new URL(req.url)
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        const where: any = {}

        if (start && end) {
            where.data = {
                gte: new Date(start),
                lte: new Date(end)
            }
        }

        const coberturas = await prisma.cobertura.findMany({
            where,
            include: {
                posto: true,
                diarista: true,
                motivo: true,
                supervisor: true,
                aprovador: true,
                financeiro: true,
                meioPagamentoSolicitado: true,
                meioPagamentoEfetivado: true
            },
            orderBy: { data: 'desc' }
        })

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet("Coberturas")

        worksheet.columns = [
            { header: "ID", key: "id", width: 10 },
            { header: "Data", key: "data", width: 15 },
            { header: "Posto", key: "posto", width: 25 },
            { header: "Diarista", key: "diarista", width: 20 },
            { header: "Chave Pix", key: "chavePix", width: 25 },
            { header: "Motivo", key: "motivo", width: 20 },
            { header: "Valor", key: "valor", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Supervisor", key: "supervisor", width: 20 },
            { header: "Aprovador", key: "aprovador", width: 20 },
            { header: "Financeiro", key: "financeiro", width: 20 },
            { header: "Pagto Solicitado", key: "pagtoSol", width: 20 },
            { header: "Pagto Efetivado", key: "pagtoEfe", width: 20 },
            { header: "Data Pagto", key: "dataPagto", width: 15 },
        ]

        coberturas.forEach(c => {
            worksheet.addRow({
                id: c.id.substring(0, 8),
                data: c.data.toISOString().split('T')[0],
                posto: c.posto.nome,
                diarista: c.diarista.nome,
                chavePix: c.diarista.chavePix || '-',
                motivo: c.motivo.descricao,
                valor: Number(c.valor),
                status: c.status,
                supervisor: c.supervisor.nome,
                aprovador: c.aprovador?.nome || '-',
                financeiro: c.financeiro?.nome || '-',
                pagtoSol: c.meioPagamentoSolicitado.descricao,
                pagtoEfe: c.meioPagamentoEfetivado?.descricao || '-',
                dataPagto: c.dataPagamento ? c.dataPagamento.toISOString().split('T')[0] : '-'
            })
        })

        const buffer = await workbook.xlsx.writeBuffer()

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="relatorio_coberturas_${Date.now()}.xlsx"`
            }
        })
    } catch (error) {
        console.error(error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
