"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function parseISODate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined
  const parts = dateStr.split("T")[0].split("-").map(Number)
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return undefined
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
}

export function formatToISODate(date?: Date): string {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export interface DatePickerProps {
  value?: string
  onChange?: (dateStr: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  align?: "start" | "center" | "end"
  variant?: "default" | "filter" | "compact"
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  disabled,
  align = "start",
  variant = "default",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = React.useMemo(() => parseISODate(value), [value])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(formatToISODate(date))
    } else {
      onChange?.("")
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.("")
  }

  const displayDate = selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""

  if (variant === "compact") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 flex items-center justify-between gap-1.5 transition-all shadow-xs outline-none focus:ring-2 focus:ring-primary/20",
              !value && "text-slate-400 font-normal",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <span className="truncate">{displayDate || placeholder}</span>
            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl border border-slate-200 shadow-xl z-50 bg-white" align={align}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={disabled}
          className={cn(
            "h-10 md:h-12 w-full bg-white border border-slate-200 hover:border-slate-300 shadow-xs rounded-xl px-3 md:px-4 flex items-center justify-between cursor-pointer transition-all font-semibold text-xs md:text-sm text-slate-700 select-none group focus:ring-2 focus:ring-primary/10 focus:border-primary",
            !value && "text-slate-400 font-normal",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
          )}
        >
          <span className="truncate">{displayDate || placeholder}</span>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <CalendarIcon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border border-slate-200 shadow-2xl z-50 bg-white" align={align}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
