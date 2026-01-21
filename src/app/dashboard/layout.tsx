import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    BarChart,
    FileText,
    CheckSquare,
    DollarSign,
    Settings,
    LogOut,
    User as UserIcon,
    Menu,
    Users,
    Calendar,
    Building2
} from "lucide-react"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { MobileNav } from "@/components/dashboard/mobile-nav"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const role = (session.user as any).role

    return (
        <div className="flex h-screen flex-col md:flex-row bg-slate-100 overflow-hidden">
            {/* Sidebar for Desktop (Client Component) */}
            <SidebarNav user={{ name: session.user?.name, role: role }} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden flex-none">
                    <span className="font-bold">Diárias App</span>

                    {/* Mobile Navigation (Client Component) */}
                    <MobileNav user={{ name: session.user?.name, role: role }} />
                </header>

                <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-8 min-h-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
