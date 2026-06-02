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
    anexos: Array<{ nomeOriginal: string }> = []
): Promise<AuditResult> {
    try {
        const detectados: string[] = []
        const textoParaVerificar = descricao.toLowerCase()

        // 1. Busca a lista de palavras proibidas ativas
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

        // 2. Varrer termos proibidos na descrição
        for (const termo of termosProibidos) {
            if (textoParaVerificar.includes(termo)) {
                detectados.push(`"${termo}" (descrição)`)
            }
        }

        // 3. Varrer termos proibidos nos nomes de anexos
        for (const anexo of anexos) {
            const nomeAnexo = anexo.nomeOriginal.toLowerCase()
            for (const termo of termosProibidos) {
                if (nomeAnexo.includes(termo)) {
                    detectados.push(`"${termo}" (arquivo: ${anexo.nomeOriginal})`)
                }
            }
        }

        // 4. Verificar limites de políticas de despesas
        const politicas = await prisma.politicaDespesa.findMany({
            where: { ativo: true }
        })

        for (const pol of politicas) {
            const categoriaChave = pol.categoria.toLowerCase() // ex: "refeicao" ou "hospedagem"
            const limite = Number(pol.limiteValor)

            // Se o texto contiver a palavra-chave e o valor superar o limite
            if (textoParaVerificar.includes(categoriaChave) && valorSolicitado > limite) {
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
