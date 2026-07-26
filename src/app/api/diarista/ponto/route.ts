import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Função utilitária para calcular a distância em metros entre duas coordenadas GPS (Fórmula de Haversine)
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000 // Raio da terra em metros
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
}

export async function POST(req: NextRequest) {
    try {
        const { coberturaId, diaristaId, acao, latitude, longitude, foto, observacao } = await req.json()

        if (!coberturaId || !diaristaId || !acao) {
            return NextResponse.json({ error: "Parâmetros incompletos." }, { status: 400 })
        }

        const cobertura = await prisma.cobertura.findUnique({
            where: { id: coberturaId },
            include: { posto: true, ponto: true }
        })

        if (!cobertura) {
            return NextResponse.json({ error: "Plantão/Cobertura não encontrado." }, { status: 404 })
        }

        // Validação opcional de Raio GPS se o Posto tiver latitude/longitude cadastradas
        let distanciaMetros = 0
        let dentroDoRaio = true

        if (cobertura.posto.latitude && cobertura.posto.longitude && latitude && longitude) {
            distanciaMetros = getDistanceFromLatLonInMeters(
                latitude,
                longitude,
                cobertura.posto.latitude,
                cobertura.posto.longitude
            )
            const raioMaximo = cobertura.posto.raioMetros || 300
            if (distanciaMetros > raioMaximo) {
                dentroDoRaio = false;
                console.warn(`[CHECK-IN WARN] Distância ${distanciaMetros}m excede o raio de ${raioMaximo}m do Posto ${cobertura.posto.nome}`)
            }
        }

        // Processa o Check-in
        if (acao === "CHECK_IN") {
            if (cobertura.ponto) {
                return NextResponse.json({ error: "Check-in já foi realizado para este plantão." }, { status: 400 })
            }

            const novoPonto = await prisma.registroPonto.create({
                data: {
                    coberturaId,
                    diaristaId,
                    checkInAt: new Date(),
                    checkInLat: latitude || null,
                    checkInLng: longitude || null,
                    checkInFoto: foto || null,
                    status: "EM_ANDAMENTO",
                    observacao: observacao || (dentroDoRaio ? "Check-in presencial no Posto" : `Check-in realizado a ${distanciaMetros}m do Posto`)
                }
            })

            return NextResponse.json({
                success: true,
                message: "Check-in realizado com sucesso!",
                ponto: novoPonto
            })
        }

        // Processa o Check-out
        if (acao === "CHECK_OUT") {
            if (!cobertura.ponto) {
                return NextResponse.json({ error: "Check-in ainda não foi realizado." }, { status: 400 })
            }

            if (cobertura.ponto.status === "CONCLUIDO") {
                return NextResponse.json({ error: "Check-out já foi realizado." }, { status: 400 })
            }

            const pontoAtualizado = await prisma.registroPonto.update({
                where: { id: cobertura.ponto.id },
                data: {
                    checkOutAt: new Date(),
                    checkOutLat: latitude || null,
                    checkOutLng: longitude || null,
                    checkOutFoto: foto || null,
                    status: "CONCLUIDO"
                }
            })

            return NextResponse.json({
                success: true,
                message: "Check-out realizado com sucesso!",
                ponto: pontoAtualizado
            })
        }

        return NextResponse.json({ error: "Ação inválida." }, { status: 400 })

    } catch (error: any) {
        console.error("[PONTO ERROR]", error)
        return NextResponse.json({ error: "Erro ao registrar ponto." }, { status: 500 })
    }
}
