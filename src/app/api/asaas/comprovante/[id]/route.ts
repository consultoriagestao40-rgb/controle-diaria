import { NextRequest, NextResponse } from "next/server"
import { getTransferReceiptUrl } from "@/lib/asaas"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params

    if (!id) {
        return new NextResponse("ID de comprovante não informado", { status: 400 })
    }

    try {
        const result = await getTransferReceiptUrl(id)

        if (result.success && result.url) {
            // Redireciona diretamente para a URL oficial em PDF do Asaas
            return NextResponse.redirect(result.url, 302)
        }

        // Se ainda está em processamento no Banco Central ou Asaas
        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Comprovante Pix Asaas - Em Processamento</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                    .card { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); padding: 2.5rem; border-radius: 1.5rem; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
                    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
                    button { background: #0284c7; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    button:hover { background: #0369a1; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>⚡ Pix em Processamento</h1>
                    <p>${result.error || "O comprovante bancário está sendo gerado pela rede Pix do Banco Central. Por favor, aguarde alguns segundos e atualize a página."}</p>
                    <button onclick="window.location.reload()">🔄 Atualizar Comprovante</button>
                </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    } catch (error: any) {
        return new NextResponse(`Erro ao obter comprovante: ${error.message}`, { status: 500 })
    }
}
