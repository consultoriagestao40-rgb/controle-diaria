import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        // Atualizar todas as despesas no status 'APROVADO' (que estão no financeiro sem aprovação N2)
        // para o status 'AGUARDANDO_APROVACAO_N2'
        const result = await prisma.despesa.updateMany({
            where: {
                status: 'APROVADO'
            },
            data: {
                status: 'AGUARDANDO_APROVACAO_N2'
            }
        })
        
        return NextResponse.json({ 
            success: true, 
            message: "Despesas atualizadas com sucesso para re-aprovação do N2.",
            updatedCount: result.count 
        })
    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 })
    }
}
