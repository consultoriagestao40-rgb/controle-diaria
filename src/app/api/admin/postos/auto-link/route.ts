import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getValidAccessToken } from "@/lib/contaazul"

function normalizeName(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim()
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== "ADMIN") {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const empresaId = body.empresaId

        // Se uma empresa específica foi passada, busca por ela, senão pega a primeira ativa conectada
        let targetEmpresaId = empresaId
        if (!targetEmpresaId) {
            const empresaConectada = await prisma.contaAzulConfig.findFirst({
                where: { accessToken: { not: null }, ativo: true }
            })
            targetEmpresaId = empresaConectada?.empresaId
        }

        if (!targetEmpresaId) {
            return NextResponse.json({ error: "Nenhuma empresa conectada ao Conta Azul encontrada." }, { status: 400 })
        }

        const token = await getValidAccessToken(targetEmpresaId)
        if (!token) {
            return NextResponse.json({ error: "Token do Conta Azul inválido ou expirado." }, { status: 400 })
        }

        // 1. Busca todos os Centros de Custo do Conta Azul
        const resCc = await fetch("https://api-v2.contaazul.com/v1/centro-de-custo?tamanho_pagina=250", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })

        if (!resCc.ok) {
            return NextResponse.json({ error: "Erro ao consultar centros de custo no Conta Azul." }, { status: 500 })
        }

        const dataCc = await resCc.json()
        const centrosCusto: any[] = dataCc.itens || []

        // 2. Busca todos os Postos de Trabalho do sistema
        const postos = await prisma.posto.findMany()

        let vinculados = 0
        const detalhes: any[] = []

        for (const posto of postos) {
            const normPosto = normalizeName(posto.nome)

            // Tenta match exato ou por inclusão
            const match = centrosCusto.find((cc: any) => {
                const normCc = normalizeName(cc.nome)
                return normCc === normPosto || normCc.includes(normPosto) || normPosto.includes(normCc)
            })

            if (match) {
                await prisma.posto.update({
                    where: { id: posto.id },
                    data: {
                        centroCustoContaAzulId: match.id,
                        centroCustoContaAzulNome: match.nome
                    }
                })
                vinculados++
                detalhes.push({
                    posto: posto.nome,
                    centroCusto: match.nome,
                    id: match.id
                })
            }
        }

        return NextResponse.json({
            success: true,
            totalPostos: postos.length,
            totalCentrosCustoContaAzul: centrosCusto.length,
            vinculados,
            detalhes
        })
    } catch (error: any) {
        console.error("[AUTO LINK CENTROS CUSTO ERROR]", error)
        return NextResponse.json({ error: error.message || "Erro ao vincular centros de custo." }, { status: 500 })
    }
}
