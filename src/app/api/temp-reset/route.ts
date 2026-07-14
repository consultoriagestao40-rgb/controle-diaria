import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const result = await prisma.despesa.updateMany({
            where: {
                status: 'AGUARDANDO_PRESTACAO',
                valorComprovado: { not: null }
            },
            data: {
                valorComprovado: null,
                saldoFinal: null
            }
        })

        return NextResponse.json({
            success: true,
            message: `Resetadas ${result.count} despesas presas em AGUARDANDO_PRESTACAO com valorComprovado preenchido.`
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}
