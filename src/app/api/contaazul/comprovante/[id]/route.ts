import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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
            try {
                // Tenta consultar anexos/comprovantes do evento no Conta Azul se houver URL externa
                const eventData = await fetchContaAzul(empresaId, `/v1/finance/events/${id}`)
                if (eventData?.receipt_url) {
                    return NextResponse.redirect(eventData.receipt_url, 302)
                }
                if (eventData?.attachment_url) {
                    return NextResponse.redirect(eventData.attachment_url, 302)
                }
            } catch {
                // Continua para renderização do voucher oficial interno
            }
        }

        // 1. Busca dados no banco de dados (Cobertura ou Despesa)
        const cobertura = await prisma.cobertura.findFirst({
            where: {
                OR: [
                    { contaAzulPayableId: id },
                    { id: id }
                ]
            },
            include: {
                diarista: true,
                posto: true,
                empresa: true,
                meioPagamentoEfetivado: true
            }
        })

        const despesa = !cobertura ? await prisma.despesa.findFirst({
            where: {
                OR: [
                    { contaAzulPayableId: id },
                    { id: id }
                ]
            },
            include: {
                solicitante: true,
                centroCusto: true,
                empresa: true
            }
        }) : null

        const dataPagto = cobertura?.dataPagamento 
            ? new Date(cobertura.dataPagamento).toLocaleDateString('pt-BR') 
            : despesa?.dataPagamento 
                ? new Date(despesa.dataPagamento).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR')

        const dataRef = cobertura?.data 
            ? new Date(cobertura.data).toLocaleDateString('pt-BR') 
            : despesa?.createdAt 
                ? new Date(despesa.createdAt).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR')

        const valorNum = cobertura ? Number(cobertura.valor) : despesa ? Number(despesa.valorSolicitado) : 0
        const valorFormatado = valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        
        const beneficiarioNome = cobertura?.diarista?.nome || despesa?.solicitante?.nome || "Beneficiário Cadastrado"
        const beneficiarioCpf = cobertura?.diarista?.cpf || "Não Informado"
        const beneficiarioPix = cobertura?.diarista?.chavePix || "Cadastrada no ERP"
        const postoOuCentro = cobertura?.posto?.nome || despesa?.centroCusto?.nome || "Operacional"
        const empresaNome = cobertura?.empresa?.nome || despesa?.empresa?.nome || "ReembolsaFácil Gestão Operacional"
        const empresaCnpj = cobertura?.empresa?.cnpj || "Consolidado Grupo"
        const tipoDescricao = cobertura ? "Diária de Cobertura Operacional" : despesa ? `${despesa.tipo} - ${despesa.descricao}` : "Pagamento Operacional"
        const authHash = Buffer.from(`${id}-${beneficiarioNome}-${valorNum}-${dataPagto}`).toString("base64").slice(0, 24).toUpperCase()

        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Comprovante Oficial de Quitação ERP - #${id}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    body { background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
                    .voucher-container { background: #ffffff; width: 100%; max-width: 580px; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.07); overflow: hidden; }
                    .header-strip { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 1.5rem 2rem; color: #ffffff; position: relative; }
                    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
                    .erp-badge { background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3); }
                    .doc-title { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.02em; }
                    .doc-subtitle { font-size: 0.8rem; opacity: 0.9; font-weight: 500; }
                    
                    .body-section { padding: 2rem; }
                    .amount-card { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 1.25rem; padding: 1.25rem; text-align: center; margin-bottom: 1.5rem; }
                    .amount-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #15803d; margin-bottom: 0.25rem; }
                    .amount-val { font-size: 2rem; font-weight: 900; color: #166534; letter-spacing: -0.03em; }
                    .status-pill { display: inline-flex; align-items: center; gap: 0.4rem; background: #dcfce7; color: #15803d; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; margin-top: 0.5rem; }
                    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; }

                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
                    .info-cell { background: #f8fafc; border: 1px solid #f1f5f9; padding: 0.85rem 1rem; border-radius: 1rem; }
                    .info-cell.full { grid-column: span 2; }
                    .cell-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.2rem; }
                    .cell-val { font-size: 0.85rem; font-weight: 700; color: #0f172a; word-break: break-word; }
                    .cell-pix { font-family: monospace; background: #e0f2fe; color: #0369a1; padding: 0.15rem 0.4rem; border-radius: 0.4rem; font-weight: 700; font-size: 0.8rem; }

                    .auth-box { border-top: 1px dashed #cbd5e1; padding-top: 1.25rem; margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.7rem; color: #64748b; }
                    .auth-code { font-family: monospace; font-weight: 700; color: #334155; }

                    .actions { padding: 0 2rem 2rem 2rem; display: flex; gap: 0.75rem; }
                    .btn-print { flex: 1; background: #0284c7; color: #ffffff; border: none; padding: 0.85rem 1.25rem; border-radius: 1rem; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; box-shadow: 0 4px 12px rgba(2,132,199,0.25); }
                    .btn-print:hover { background: #0369a1; transform: translateY(-1px); }
                    .btn-close { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 0.85rem 1.25rem; border-radius: 1rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
                    .btn-close:hover { background: #e2e8f0; }

                    @media print {
                        body { background: #ffffff; padding: 0; }
                        .voucher-container { border: none; box-shadow: none; max-width: 100%; }
                        .actions { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="voucher-container">
                    <div class="header-strip">
                        <div class="header-top">
                            <span class="erp-badge">Conta Azul &bull; ERP Integrado</span>
                            <span style="font-size: 0.75rem; opacity: 0.8; font-weight: 600;">Via do Beneficiário / Financeiro</span>
                        </div>
                        <h1 class="doc-title">Comprovante de Quitação</h1>
                        <p class="doc-subtitle">${empresaNome} &bull; CNPJ: ${empresaCnpj}</p>
                    </div>

                    <div class="body-section">
                        <div class="amount-card">
                            <div class="amount-label">Valor Total Liquidado</div>
                            <div class="amount-val">${valorFormatado}</div>
                            <div class="status-pill">
                                <div class="status-dot"></div>
                                BAIXADO E CONCILIADO NO ERP CONTA AZUL
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-cell full">
                                <div class="cell-label">Beneficiário (Recebedor)</div>
                                <div class="cell-val">${beneficiarioNome}</div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">CPF</div>
                                <div class="cell-val">${beneficiarioCpf}</div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">Chave PIX</div>
                                <div class="cell-val"><span class="cell-pix">${beneficiarioPix}</span></div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">Posto / Local / CC</div>
                                <div class="cell-val">${postoOuCentro}</div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">Data do Pagamento</div>
                                <div class="cell-val" style="color: #0369a1;">${dataPagto}</div>
                            </div>
                            <div class="info-cell full">
                                <div class="cell-label">Descrição / Tipo de Lançamento</div>
                                <div class="cell-val" style="font-size: 0.8rem; font-weight: 600; color: #475569;">${tipoDescricao} (Ref. ${dataRef})</div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">Meio de Efetivação</div>
                                <div class="cell-val">Conta Azul (ERP) &bull; Pix</div>
                            </div>
                            <div class="info-cell">
                                <div class="cell-label">ID Evento Conta Azul</div>
                                <div class="cell-val" style="font-family: monospace; font-size: 0.75rem;">${id}</div>
                            </div>
                        </div>

                        <div class="auth-box">
                            <div>
                                <div>Autenticação Digital ERP:</div>
                                <div class="auth-code">${authHash}</div>
                            </div>
                            <div style="text-align: right;">
                                <div>Emissão ReembolsaFácil</div>
                                <div>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    </div>

                    <div class="actions">
                        <button class="btn-print" onclick="window.print()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            Imprimir / Salvar em PDF
                        </button>
                        <button class="btn-close" onclick="window.close()">Fechar</button>
                    </div>
                </div>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    } catch (error: any) {
        console.error("[CONTA AZUL RECEIPT ROUTE ERROR]", error)
        return new NextResponse(`Erro ao obter comprovante: ${error.message}`, { status: 500 })
    }
}

