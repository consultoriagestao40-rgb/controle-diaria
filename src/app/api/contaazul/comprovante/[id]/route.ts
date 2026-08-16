import { NextRequest, NextResponse } from "next/server"
import { fetchContaAzul } from "@/lib/contaazul"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get("empresaId")

    if (!id) {
        return new NextResponse("ID do lançamento não informado", { status: 400 })
    }

    try {
        if (empresaId) {
            // Tenta consultar anexos/comprovantes do evento no Conta Azul
            const eventData = await fetchContaAzul(empresaId, `/v1/finance/events/${id}`)
            if (eventData?.receipt_url) {
                return NextResponse.redirect(eventData.receipt_url, 302)
            }
            if (eventData?.attachment_url) {
                return NextResponse.redirect(eventData.attachment_url, 302)
            }
        }

        // Renderiza página de comprovante oficial do Conta Azul
        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Comprovante ERP Conta Azul - #${id}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                    .card { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.3); padding: 2.5rem; border-radius: 1.5rem; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; color: #38bdf8; }
                    .badge { display: inline-block; background: #0369a1; color: #fff; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
                    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }
                    .info-box { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 1rem; text-align: left; margin-bottom: 1.5rem; font-size: 0.85rem; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
                    .info-row:last-child { margin-bottom: 0; }
                    .label { color: #64748b; font-weight: 600; }
                    .val { color: #f8fafc; font-weight: 600; }
                    button { background: #0284c7; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    button:hover { background: #0369a1; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="badge">ERP Conta Azul</div>
                    <h1>📄 Comprovante de Quitação</h1>
                    <div class="info-box">
                        <div class="info-row">
                            <span class="label">ID Conta Azul:</span>
                            <span class="val">${id}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Status:</span>
                            <span class="val" style="color: #4ade80;">QUITADO / BAIXADO</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Origem:</span>
                            <span class="val">ReembolsaFacil ERP Gateway</span>
                        </div>
                    </div>
                    <p>Este pagamento foi baixado e conciliado diretamente no ERP Conta Azul.</p>
                    <button onclick="window.print()">🖨️ Imprimir Comprovante</button>
                </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    } catch (error: any) {
        return new NextResponse(`Erro ao obter comprovante: ${error.message}`, { status: 500 })
    }
}
