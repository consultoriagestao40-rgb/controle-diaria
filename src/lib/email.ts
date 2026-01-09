import { prisma } from "@/lib/prisma"

export async function sendEmail(to: string, subject: string, html: string) {
    console.log(`
    ===================================================
    [MOCK EMAIL SERVICE]
    TO: ${to}
    SUBJECT: ${subject}
    ---------------------------------------------------
    ${html.replace(/<[^>]*>?/gm, '')} 
    (HTML content stripped for log readability)
    ===================================================
    `)
}

export async function notifyNewCoverage(coberturaId: string) {
    try {
        const cobertura = await prisma.cobertura.findUnique({
            where: { id: coberturaId },
            include: { diarista: true, posto: true, supervisor: true }
        })
        if (!cobertura) return

        // Find all approvers
        const approvers = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'APROVADOR'] as any },
                ativo: true
            }
        })

        const subject = `[Novo Lançamento] ${cobertura.diarista.nome} em ${cobertura.posto.nome}`
        const html = `
            <h1>Nova Cobertura Lançada</h1>
            <p><strong>Supervisor:</strong> ${cobertura.supervisor.nome}</p>
            <p><strong>Diarista:</strong> ${cobertura.diarista.nome}</p>
            <p><strong>Posto:</strong> ${cobertura.posto.nome}</p>
            <p><strong>Data:</strong> ${new Date(cobertura.data).toLocaleDateString('pt-BR')}</p>
            <p>Acesse o painel de aprovação para analisar.</p>
        `

        // Send to each approver
        for (const user of approvers) {
            await sendEmail(user.email, subject, html)
        }
    } catch (e) {
        console.error("[EmailService] Failed to notify new coverage", e)
    }
}

export async function notifyStatusChange(coberturaId: string, newStatus: string, justification?: string) {
    // Only notify Supervisor if Rejected or Adjust Requested
    if (!['REPROVADO', 'AJUSTE'].includes(newStatus)) return

    try {
        const cobertura = await prisma.cobertura.findUnique({
            where: { id: coberturaId },
            include: { supervisor: true, diarista: true }
        })
        if (!cobertura) return

        const subject = `[Atenção] Cobertura ${newStatus}: ${cobertura.diarista.nome}`
        const html = `
            <h1>Atualização de Status</h1>
            <p>A cobertura de <strong>${cobertura.diarista.nome}</strong> foi marcada como <strong>${newStatus}</strong>.</p>
            ${justification ? `<p><strong>Justificativa:</strong> ${justification}</p>` : ''}
            <p>Por favor, verifique o sistema para realizar os ajustes necessários.</p>
        `

        await sendEmail(cobertura.supervisor.email, subject, html)
    } catch (e) {
        console.error("[EmailService] Failed to notify status change", e)
    }
}
