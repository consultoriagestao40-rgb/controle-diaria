import { notifyNewCoverage, notifyStatusChange } from '../src/lib/email'
import { prisma } from '../src/lib/prisma'

async function main() {
    console.log("--- TEST EMAIL SERVICE ---")

    // 1. Get a random coverage to test
    const cov = await prisma.cobertura.findFirst({
        include: { supervisor: true, diarista: true, posto: true }
    })

    if (!cov) {
        console.log("No coverage found to test.")
        return
    }

    console.log(`Testing with Cobertura ID: ${cov.id} (Diarista: ${cov.diarista.nome})`)

    // 2. Test New Coverage Notification (Should email Approvers)
    console.log("\n>>> TESTING NEW COVERAGE NOTIFICATION (Expect 'TO: Admin/Approver')")
    await notifyNewCoverage(cov.id)

    // 3. Test Rejection Notification (Should email Supervisor)
    console.log("\n>>> TESTING REJECTION NOTIFICATION (Expect 'TO: Supervisor')")
    await notifyStatusChange(cov.id, 'REPROVADO', 'Teste de Justificativa via Script')

    console.log("\n--- TEST COMPLETE ---")
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
