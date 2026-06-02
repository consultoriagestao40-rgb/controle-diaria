"use client"

export function LayoutMainContainer({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 md:p-8 bg-[#F8FAFC]">
            {children}
        </main>
    )
}
