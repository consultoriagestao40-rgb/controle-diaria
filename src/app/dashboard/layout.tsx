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
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

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
        <div className="flex min-h-screen flex-col md:flex-row bg-slate-100">
            {/* Sidebar for Desktop (Client Component) */}
            <SidebarNav user={{ name: session.user?.name, role: role }} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden">
                    <span className="font-bold">Diárias App</span>

                    {/* Mobile Navigation */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                            <div className="flex flex-col h-full">
                                <div className="flex h-16 items-center border-b px-6">
                                    <span className="text-xl font-bold text-primary">Diárias</span>
                                </div>
                                <div className="flex-1 overflow-y-auto py-4 px-4">
                                    <ul className="space-y-1">
                                        {navItems.map((item) => (
                                            <li key={item.href}>
                                                <SheetClose asChild>
                                                    <Link
                                                        href={item.href}
                                                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors"
                                                    >
                                                        <item.icon className="h-5 w-5" />
                                                        {item.label}
                                                    </Link>
                                                </SheetClose>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="border-t p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                                            <UserIcon className="h-6 w-6" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{session.user?.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{role}</p>
                                        </div>
                                    </div>
                                    <Link href="/api/auth/signout">
                                        <Button variant="ghost" className="mt-4 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sair
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
