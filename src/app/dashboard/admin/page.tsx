import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Building2, Users, Calendar, UserCog, FileText } from "lucide-react"

export default function AdminPage() {
    const cards = [
        {
            title: "Postos de Trabalho",
            description: "Gerenciar unidades e postos",
            href: "/dashboard/admin/postos",
            icon: Building2,
            color: "text-blue-500",
        },
        {
            title: "Diaristas",
            description: "Gerenciar profissionais",
            href: "/dashboard/admin/diaristas",
            icon: Users,
            color: "text-green-500",
        },
        {
            title: "Colaboradores",
            description: "Profissionais substituídos",
            href: "/dashboard/admin/colaboradores",
            icon: Calendar,
            color: "text-purple-500",
        },

        {
            title: "Motivos & Configs",
            description: "Tabelas auxiliares e ajustes",
            href: "/dashboard/admin/configs",
            icon: FileText,
            color: "text-slate-500",
        },
    ]

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
            <p className="text-muted-foreground">Gerencie os cadastros e tabelas do sistema.</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href}>
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-medium">
                                    {card.title}
                                </CardTitle>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{card.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
