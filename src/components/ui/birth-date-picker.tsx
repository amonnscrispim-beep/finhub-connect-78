import * as React from "react";
import { format, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface BirthDatePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function BirthDatePicker({
  value,
  onChange,
  placeholder = "Selecione a data de nascimento",
  className,
  fromYear = 1920,
  toYear = new Date().getFullYear(),
}: BirthDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"calendar" | "yearMonth">("calendar");
  const [displayMonth, setDisplayMonth] = React.useState<Date>(value || new Date());
  const [yearInput, setYearInput] = React.useState("");

  // Generate year options
  const years = React.useMemo(() => {
    const yearsArray = [];
    for (let year = toYear; year >= fromYear; year--) {
      yearsArray.push(year);
    }
    return yearsArray;
  }, [fromYear, toYear]);

  const handleYearSelect = (year: string) => {
    const newDate = setYear(displayMonth, parseInt(year));
    setDisplayMonth(newDate);
  };

  const handleMonthSelect = (month: string) => {
    const newDate = setMonth(displayMonth, parseInt(month));
    setDisplayMonth(newDate);
    setViewMode("calendar");
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYearInput(val);
    
    if (val.length === 4) {
      const year = parseInt(val);
      if (year >= fromYear && year <= toYear) {
        const newDate = setYear(displayMonth, year);
        setDisplayMonth(newDate);
      }
    }
  };

  const handleYearInputBlur = () => {
    if (yearInput.length === 4) {
      const year = parseInt(yearInput);
      if (year >= fromYear && year <= toYear) {
        const newDate = setYear(displayMonth, year);
        setDisplayMonth(newDate);
      }
    }
    setYearInput("");
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date || null);
    if (date) {
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setViewMode("calendar");
      setDisplayMonth(value || new Date());
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {viewMode === "yearMonth" ? (
          <div className="p-4 space-y-4 pointer-events-auto">
            {/* Year Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Digite o ano ou selecione:
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 1985"
                value={yearInput}
                onChange={handleYearInputChange}
                onBlur={handleYearInputBlur}
                className="w-full"
                maxLength={4}
              />
            </div>

            {/* Year Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ano:</label>
              <Select
                value={getYear(displayMonth).toString()}
                onValueChange={handleYearSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mês:</label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => (
                  <Button
                    key={month}
                    variant={getMonth(displayMonth) === index ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMonthSelect(index.toString())}
                  >
                    {month.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setViewMode("calendar")}
            >
              Voltar ao calendário
            </Button>
          </div>
        ) : (
          <div className="pointer-events-auto">
            {/* Custom Header with clickable month/year */}
            <div className="flex items-center justify-between p-3 border-b">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newDate = new Date(displayMonth);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setDisplayMonth(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                className="font-medium text-sm hover:bg-accent"
                onClick={() => setViewMode("yearMonth")}
              >
                {format(displayMonth, "MMMM yyyy", { locale: ptBR })}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newDate = new Date(displayMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setDisplayMonth(newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <DayPicker
              mode="single"
              selected={value || undefined}
              onSelect={handleDateSelect}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              showOutsideDays
              className={cn("p-3")}
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
                day_range_end: "day-range-end",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside:
                  "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />

            <div className="p-2 border-t text-center">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setViewMode("yearMonth")}
              >
                Selecionar mês/ano rapidamente
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
