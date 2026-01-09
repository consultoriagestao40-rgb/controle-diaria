import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const role = (session.user as any).role

    switch (role) {
        case 'ADMIN':
            redirect('/dashboard/admin')
        case 'SUPERVISOR':
            redirect('/dashboard/supervisor')
        case 'APROVADOR':
            redirect('/dashboard/aprovador')
        case 'FINANCEIRO':
            redirect('/dashboard/financeiro')
        default:
            return (
                <div className="p-4">
                    <h1 className="text-2xl font-bold">Bem-vindo</h1>
                    <p>Seu perfil não tem uma página inicial definida. Contate o administrador.</p>
                </div>
            )
    }
}
