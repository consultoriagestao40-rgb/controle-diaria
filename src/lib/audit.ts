import { prisma } from "@/lib/prisma"

interface AuditResult {
    hasProhibitedItems: boolean
    alertMessage: string | null
}

/**
 * Motor de Auditoria Inteligente (AI Audit Engine)
 * - Varrer termos proibidos (customizados pelo Admin) em descrições e nomes de arquivos.
 * - Verificar limites máximos permitidos por categoria nas Políticas de Despesas.
 */
export async function runExpenseAudit(
    descricao: string,
    valorSolicitado: number,
    anexos: Array<{ nomeOriginal: string }> = [],
    itens: Array<{ categoria: string, descricao: string, valorTotal: number }> = []
): Promise<AuditResult> {
    try {
        const detectados: string[] = []
        
        // 1. Concatenar descrição geral e dados de todos os itens para varredura de termos proibidos
        const textoParaVerificar = (
            descricao + 
            " " + 
            itens.map(i => `${i.categoria} ${i.descricao}`).join(" ")
        ).toLowerCase()

        // 2. Busca a lista de palavras proibidas ativas
        let config = await prisma.configuracaoAuditoria.findFirst({
            where: { ativo: true }
        })

        if (!config) {
            config = await prisma.configuracaoAuditoria.create({
                data: {
                    palavrasProibidas: "cerveja,energetico,preservativo,chiclete,bala,doce,bebida"
                }
            })
        }

        const termosProibidos = config.palavrasProibidas
            .split(",")
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0)

        // 3. Varrer termos proibidos na descrição consolidada
        for (const termo of termosProibidos) {
            if (textoParaVerificar.includes(termo)) {
                detectados.push(`"${termo}" (descrição/itens)`)
            }
        }

        // 4. Varrer termos proibidos nos nomes de anexos
        for (const anexo of anexos) {
            const nomeAnexo = anexo.nomeOriginal.toLowerCase()
            for (const termo of termosProibidos) {
                if (nomeAnexo.includes(termo)) {
                    detectados.push(`"${termo}" (arquivo: ${anexo.nomeOriginal})`)
                }
            }
        }

        // 5. Verificar limites de políticas de despesas
        const politicas = await prisma.politicaDespesa.findMany({
            where: { ativo: true }
        })

        // A. Validar limites por itens individuais
        for (const item of itens) {
            const pol = politicas.find(p => p.categoria.toUpperCase() === item.categoria.toUpperCase())
            if (pol) {
                const limite = Number(pol.limiteValor)
                if (item.valorTotal > limite) {
                    detectados.push(
                        `item "${pol.descricao}" excede o limite permitido (valor do item: R$ ${Number(item.valorTotal).toFixed(2)}, limite máximo: R$ ${limite.toFixed(2)})`
                    )
                }
            }
        }

        // B. Verificação de Fallback (descrição genérica + valor total)
        for (const pol of politicas) {
            const categoriaChave = pol.categoria.toLowerCase()
            const limite = Number(pol.limiteValor)

            if (textoParaVerificar.includes(categoriaChave) && valorSolicitado > limite && itens.length === 0) {
                detectados.push(`limite de "${pol.descricao}" excedido (solicitado: R$ ${valorSolicitado.toFixed(2)}, máximo permitido: R$ ${limite.toFixed(2)})`)
            }
        }

        if (detectados.length > 0) {
            return {
                hasProhibitedItems: true,
                alertMessage: `⚠️ Alerta de Auditoria: ${detectados.join(", ")}.`
            }
        }

        return { hasProhibitedItems: false, alertMessage: null }
    } catch (error) {
        console.error("Erro ao rodar auditoria de despesa:", error)
        return { hasProhibitedItems: false, alertMessage: null }
    }
}
