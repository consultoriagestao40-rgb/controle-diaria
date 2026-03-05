"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, Save, ArrowLeft, Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

// Validation Schema
const formSchema = z.object({
    data: z.date(),
    postoId: z.string().min(1, "Posto é obrigatório."),
    diaristaId: z.string().min(1, "Diarista é obrigatória."),
    reservaId: z.string().min(1, "Colaborador é obrigatório."),
    motivoId: z.string().min(1, "Motivo é obrigatório."),
    cargaHorariaId: z.string().min(1, "Carga horária é obrigatória."),
    valor: z.string().min(1, "Valor é obrigatório."),
    meioPagamentoSolicitadoId: z.string().min(1, "Meio de pagamento é obrigatório."),
    horaInicio: z.string().optional(),
    horaFim: z.string().optional(),
    observacao: z.string().optional(),
    empresaId: z.string().optional(),
})

export default function NovaDiariaPage() {
    const router = useRouter()
    const [loadingOptions, setLoadingOptions] = useState(true)
    const [options, setOptions] = useState<any>({
        postos: [],
        diaristas: [],
        motivos: [],
        reservas: [],
        cargas: [],
        meios: [],
        empresas: []
    })

    const [openPosto, setOpenPosto] = useState(false)
    const [openDiarista, setOpenDiarista] = useState(false)
    const [openReserva, setOpenReserva] = useState(false)
    const [openDate, setOpenDate] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            valor: "0",
        },
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        try {
            const res = await fetch("/api/supervisor/options")
            if (!res.ok) throw new Error()
            const data = await res.json()
            setOptions(data)
        } catch {
            toast.error("Erro ao carregar opções")
        } finally {
            setLoadingOptions(false)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const toastId = toast.loading("Registrando diária no sistema...")
        try {
            const res = await fetch("/api/supervisor/lancamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const text = await res.text()
                toast.error(`Falha no registro: ${text}`, { id: toastId })
                return
            }

            toast.success("Diária lançada com sucesso!", { id: toastId })
            router.push("/dashboard/supervisor")
        } catch (error: any) {
            console.error(error)
            toast.error("Erro técnico ao enviar lançamento", { id: toastId })
        }
    }

    if (loadingOptions) {
        return (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Carregando Protocolos...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-32 relative">
            {/* Background Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
                <Link href="/dashboard/supervisor">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/50 border-white hover:bg-white transition-all">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Novo <span className="text-primary italic text-4xl">Lançamento</span>
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Protocolo de registro de plantão</p>
                </div>
            </div>

            <Card className="glass-card border-none premium-shadow relative z-10">
                <CardContent className="p-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                            console.log("Validation Errors:", errors)
                            toast.error("Verifique os campos obrigatórios em vermelho.")
                        })} className="space-y-6">

                            {/* Section: Identificação */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-5 w-1 bg-primary rounded-full" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identificação do Plantão</h2>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* DATA */}
                                    <FormField
                                        control={form.control}
                                        name="data"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Data do Plantão</FormLabel>
                                                <Popover open={openDate} onOpenChange={setOpenDate}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-left font-medium hover:bg-white hover:border-primary/20",
                                                                    !field.value && "text-slate-400"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP", { locale: ptBR })
                                                                ) : (
                                                                    <span>Selecione a data</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 text-primary opacity-40" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={(e) => {
                                                                field.onChange(e)
                                                                setOpenDate(false)
                                                            }}
                                                            disabled={(date) =>
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                            className="p-3"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* POSTO COMBOBOX */}
                                    <FormField
                                        control={form.control}
                                        name="postoId"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Posto de Trabalho</FormLabel>
                                                <Popover open={openPosto} onOpenChange={setOpenPosto}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-left font-medium hover:bg-white hover:border-primary/20 justify-between",
                                                                    !field.value && "text-slate-400"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? options.postos.find((item: any) => item.id === field.value)?.nome
                                                                    : "Selecione o posto"}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-primary opacity-40" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0 rounded-2xl border-none shadow-2xl">
                                                        <Command className="rounded-2xl">
                                                            <CommandInput placeholder="Buscar posto..." />
                                                            <CommandList>
                                                                <CommandEmpty>Nenhum posto encontrado.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {options.postos.map((item: any) => (
                                                                        <CommandItem
                                                                            value={item.nome}
                                                                            key={item.id}
                                                                            onSelect={() => {
                                                                                form.setValue("postoId", item.id)
                                                                                setOpenPosto(false)
                                                                            }}
                                                                            className="py-3 px-4"
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4 text-primary", item.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            {item.nome}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section: Equipe */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-5 w-1 bg-orange-400 rounded-full" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Atribuição de Equipe</h2>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* DIARISTA */}
                                    <FormField
                                        control={form.control}
                                        name="diaristaId"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Quem Cobriu? (Diarista)</FormLabel>
                                                <Popover open={openDiarista} onOpenChange={setOpenDiarista}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-left font-medium hover:bg-white hover:border-primary/20 justify-between",
                                                                    !field.value && "text-slate-400"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? options.diaristas.find((item: any) => item.id === field.value)?.nome
                                                                    : "Diarista substituto"}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-orange-400 opacity-40" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0 rounded-2xl border-none shadow-2xl">
                                                        <Command className="rounded-2xl">
                                                            <CommandInput placeholder="Buscar diarista..." />
                                                            <CommandList>
                                                                <CommandEmpty>Nenhuma diarista encontrada.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {options.diaristas.map((item: any) => (
                                                                        <CommandItem
                                                                            value={item.nome}
                                                                            key={item.id}
                                                                            onSelect={() => {
                                                                                form.setValue("diaristaId", item.id)
                                                                                setOpenDiarista(false)
                                                                            }}
                                                                            className="py-3 px-4"
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4 text-orange-500", item.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            {item.nome}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* RESERVA */}
                                    <FormField
                                        control={form.control}
                                        name="reservaId"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Quem Faltou? (Colaborador)</FormLabel>
                                                <Popover open={openReserva} onOpenChange={setOpenReserva}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 text-left font-medium hover:bg-white hover:border-primary/20 justify-between",
                                                                    !field.value && "text-slate-400"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? options.reservas.find((item: any) => item.id === field.value)?.nome
                                                                    : "Colaborador ausente"}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-purple-400 opacity-40" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0 rounded-2xl border-none shadow-2xl">
                                                        <Command className="rounded-2xl">
                                                            <CommandInput placeholder="Buscar colaborador..." />
                                                            <CommandList>
                                                                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {options.reservas.map((item: any) => (
                                                                        <CommandItem
                                                                            value={item.nome}
                                                                            key={item.id}
                                                                            onSelect={() => {
                                                                                form.setValue("reservaId", item.id)
                                                                                setOpenReserva(false)
                                                                            }}
                                                                            className="py-3 px-4"
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4 text-purple-500", item.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            {item.nome}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section: Horários e Motivo */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-5 w-1 bg-green-400 rounded-full" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Logística e Valores</h2>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="horaInicio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Início</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 focus:bg-white focus:border-primary/20 transition-all font-medium" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="horaFim"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Término</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 focus:bg-white focus:border-primary/20 transition-all font-medium" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="motivoId"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2 md:col-span-1">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Motivo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 font-medium">
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                        {options.motivos.map((i: any) => (
                                                            <SelectItem key={i.id} value={i.id} className="py-2.5">{i.descricao}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cargaHorariaId"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2 md:col-span-1">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Carga</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 font-medium">
                                                            <SelectValue placeholder="Hrs" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                        {options.cargas.map((i: any) => (
                                                            <SelectItem key={i.id} value={i.id} className="py-2.5">{i.descricao}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="valor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Valor do Plantão (R$)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                                        <Input type="number" step="0.01" {...field} className="h-12 pl-10 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-primary/20 transition-all font-black text-lg text-slate-900 tracking-tighter" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="meioPagamentoSolicitadoId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Meio de Pagamento</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 font-medium">
                                                            <SelectValue placeholder="Tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                        {options.meios.map((i: any) => (
                                                            <SelectItem key={i.id} value={i.id} className="py-2.5">{i.descricao}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section: Empresa e Observações */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-5 w-1 bg-slate-400 rounded-full" />
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dados Corporativos</h2>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="empresaId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Empresa do Grupo</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl px-4 font-medium">
                                                        <SelectValue placeholder="Selecione a empresa correlata" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    {options.empresas.map((i: any) => (
                                                        <SelectItem key={i.id} value={i.id} className="py-2.5">{i.nome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="observacao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Observações Adicionais</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Descreva aqui qualquer detalhe relevante sobre este lançamento..."
                                                    className="min-h-[100px] bg-slate-50/50 border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-primary/20 transition-all font-medium resize-none shadow-inner"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-16 bg-slate-900 hover:bg-primary shadow-2xl shadow-primary/20 transition-all duration-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] group"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Sincronizando...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                            <span>Finalizar Lançamento</span>
                                        </div>
                                    )}
                                </Button>
                                <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Protocolo JVS-v2.5 &bull; Segurança de Dados ponta-a-ponta</p>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
