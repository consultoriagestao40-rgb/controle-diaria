"use client"

import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttachmentViewerProps {
    anexo: { url: string; nomeOriginal: string; tipo?: string } | null
    onClose: () => void
}

export function AttachmentViewer({ anexo, onClose }: AttachmentViewerProps) {
    if (!anexo) return null

    const isPdf = anexo.tipo === "application/pdf" || anexo.url.startsWith("data:application/pdf")

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0 text-white bg-slate-900">
                <Button 
                    type="button"
                    variant="ghost" 
                    onClick={onClose}
                    className="text-white hover:bg-white/10 hover:text-white font-bold text-xs uppercase tracking-wider h-10 px-4 rounded-xl gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                    <X className="h-4 w-4" />
                    Fechar
                </Button>
                <span className="text-xs font-bold truncate max-w-[45%] text-slate-300">
                    {anexo.nomeOriginal}
                </span>
                <a 
                    href={anexo.url} 
                    download={anexo.nomeOriginal}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider h-10 px-4 rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                    <Download className="h-4 w-4" />
                    Baixar
                </a>
            </div>

            {/* Content Viewport */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {isPdf ? (
                    <iframe 
                        src={anexo.url} 
                        className="w-full max-w-5xl h-full rounded-2xl border border-white/10 bg-white"
                        title={anexo.nomeOriginal}
                    />
                ) : (
                    <img 
                        src={anexo.url} 
                        alt={anexo.nomeOriginal} 
                        className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white p-2"
                    />
                )}
            </div>
        </div>
    )
}
