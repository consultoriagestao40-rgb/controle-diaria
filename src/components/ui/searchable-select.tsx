"use client"

import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, Check, X, Loader2 } from "lucide-react"

export interface SearchableOption {
    value: string
    label: string
    sublabel?: string
    badge?: string
}

interface SearchableSelectProps {
    options: SearchableOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    loading?: boolean
    loadingText?: string
    className?: string
    required?: boolean
    id?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Selecione uma opção...",
    searchPlaceholder = "Digite para buscar...",
    emptyMessage = "Nenhum resultado encontrado",
    disabled = false,
    loading = false,
    loadingText = "Carregando...",
    className = "",
    required = false,
    id
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchTerm("")
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    // Focar no campo de busca ao abrir
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 50)
        }
    }, [isOpen])

    // Fechar ao pressionar ESC
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false)
                setSearchTerm("")
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen])

    // Opção selecionada atualmente
    const selectedOption = options.find((opt) => opt.value === value)

    // Filtragem dos itens por texto digitado
    const filteredOptions = options.filter((opt) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase().trim()
        const labelMatch = opt.label.toLowerCase().includes(term)
        const sublabelMatch = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false
        const badgeMatch = opt.badge ? opt.badge.toLowerCase().includes(term) : false
        return labelMatch || sublabelMatch || badgeMatch
    })

    return (
        <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
            {/* Input oculto para validação HTML nativa se required */}
            {required && (
                <input
                    type="text"
                    value={value}
                    required
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                    onChange={() => {}}
                />
            )}

            {/* BOTÃO PRINCIPAL (GATILHO DO DROPDOWN) */}
            <button
                type="button"
                disabled={disabled || loading}
                onClick={() => {
                    if (!disabled && !loading) {
                        setIsOpen(!isOpen)
                        if (!isOpen) setSearchTerm("")
                    }
                }}
                className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold text-left flex items-center justify-between gap-3 shadow-xs transition-all cursor-pointer ${
                    disabled
                        ? "bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed"
                        : isOpen
                        ? "border-indigo-600 ring-2 ring-indigo-100 shadow-sm text-slate-900"
                        : "border-slate-200 hover:border-slate-300 text-slate-900"
                }`}
            >
                <div className="truncate flex-1">
                    {loading ? (
                        <span className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            {loadingText}
                        </span>
                    ) : selectedOption ? (
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate text-slate-900 font-bold">{selectedOption.label}</span>
                            {selectedOption.sublabel && (
                                <span className="text-xs text-slate-400 font-normal truncate">
                                    ({selectedOption.sublabel})
                                </span>
                            )}
                            {selectedOption.badge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                                    {selectedOption.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 font-normal">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                    />
                </div>
            </button>

            {/* MENU SUSPENSO - SEMPRE ABERTO PARA BAIXO DO CAMPO */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ maxHeight: "380px" }}
                >
                    {/* CAMPO DE DIGITAR PARA PESQUISAR */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* LISTA SCROLLÁVEL DE ITENS */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 px-4 text-center text-xs text-slate-500 font-medium">
                                {emptyMessage}
                                {searchTerm && (
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Nenhum resultado para &quot;<span className="font-semibold">{searchTerm}</span>&quot;
                                    </p>
                                )}
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value)
                                            setIsOpen(false)
                                            setSearchTerm("")
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                            isSelected
                                                ? "bg-indigo-50 text-indigo-900 font-bold"
                                                : "text-slate-800 hover:bg-slate-50 hover:text-slate-950 font-medium"
                                        }`}
                                    >
                                        <div className="truncate flex-1">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="truncate">{opt.label}</span>
                                                {opt.badge && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 shrink-0">
                                                        {opt.badge}
                                                    </span>
                                                )}
                                            </div>
                                            {opt.sublabel && (
                                                <span className="text-[11px] text-slate-400 font-normal block truncate mt-0.5">
                                                    {opt.sublabel}
                                                </span>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <Check className="w-4 h-4 text-indigo-600 shrink-0 stroke-[2.5]" />
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
