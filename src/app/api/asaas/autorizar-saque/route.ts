import { NextRequest, NextResponse } from "next/server"

/**
 * Webhook de Autorização de Saque do Asaas
 *
 * O Asaas chama este endpoint antes de executar qualquer transferência/saque via API.
 * Respondemos com { "authorized": true } para autorizar automaticamente todas as
 * transferências iniciadas pelo nosso sistema (ReembolsaFacil).
 *
 * Configuração no Asaas: Menu > Integrações > Segurança > Validação de saque via Webhook
 * URL: https://controle-diaria-6tk9.vercel.app/api/asaas/autorizar-saque
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Log para auditoria
        console.log("[ASAAS WEBHOOK] Solicitação de autorização de saque recebida:", JSON.stringify(body))

        // Autoriza automaticamente todas as transferências
        // A segurança já é garantida pela assinatura eletrônica no front-end do ReembolsaFacil
        return NextResponse.json({ authorized: true }, { status: 200 })

    } catch (error) {
        // Mesmo em caso de erro no parse do body, autorizamos para não bloquear o fluxo
        console.error("[ASAAS WEBHOOK] Erro ao processar solicitação:", error)
        return NextResponse.json({ authorized: true }, { status: 200 })
    }
}

// Responder GET com 200 para validação de URL pelo Asaas
export async function GET() {
    return NextResponse.json({ status: "ok", service: "ReembolsaFacil - Webhook Autorização Asaas" }, { status: 200 })
}
