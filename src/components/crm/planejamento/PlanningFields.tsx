import { type ReactNode, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { type PlanningEvent } from "./calculations";
export function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="planning-step">
      <div className="planning-step-title">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          {hint && <p>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
export function Field({
  label,
  value,
  onChange,
  kind = "money",
  suffix,
  ai = false,
}: {
  label: string;
  value: string | number | null;
  onChange: (value: any) => void;
  kind?: "money" | "age" | "percent" | "text" | "date";
  suffix?: string;
  ai?: boolean;
}) {
  const id = useId();
  const display =
    kind === "money" && typeof value === "number"
      ? value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
      : (value ?? "");
  return (
    <div className="planning-field">
      <label htmlFor={id}>{label}</label>
      <div
        className={`planning-field-box ${kind === "money" ? "has-prefix" : ""} ${suffix ? "has-suffix" : ""} ${ai ? "ai" : ""}`}
      >
        {kind === "money" && <span className="prefix">R$</span>}
        <Input
          id={id}
          aria-label={label}
          type={kind === "date" ? "date" : "text"}
          inputMode={
            kind === "money" || kind === "age"
              ? "numeric"
              : kind === "percent"
                ? "decimal"
                : undefined
          }
          value={display}
          onChange={(e) => {
            const v = e.target.value;
            if (kind === "money")
              onChange(Number(v.replace(/\D/g, "").slice(0, 13)));
            else if (kind === "age")
              onChange(
                v === "" ? null : Number(v.replace(/\D/g, "").slice(0, 3)),
              );
            else if (kind === "percent") {
              const clean = v.replace(/[^\d.,]/g, "").replace(",", ".");
              onChange(Number(clean) || 0);
            } else onChange(v);
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
        {ai && <span className="planning-ai-label">IA</span>}
      </div>
    </div>
  );
}
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="planning-field">
      <label htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="h-[50px] bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="patrimonial-planning">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function Events({
  events,
  onChange,
  output = false,
}: {
  events: PlanningEvent[];
  onChange: (events: PlanningEvent[]) => void;
  output?: boolean;
}) {
  const update = (id: string, key: keyof PlanningEvent, v: unknown) =>
    onChange(events.map((e) => (e.id === id ? { ...e, [key]: v } : e)));
  return (
    <div className="mt-5">
      {events.map((e) => (
        <div className="planning-event" key={e.id}>
          <Field
            label="Descrição"
            kind="text"
            value={e.descricao}
            onChange={(v) => update(e.id, "descricao", v)}
          />
          <Choice
            label="Recorrência"
            value={e.recorrencia}
            onChange={(v) => update(e.id, "recorrencia", v)}
            options={[
              { value: "unica", label: "Uma vez" },
              {
                value: "mensal",
                label: output ? "Todo mês" : "Todo mês (extra)",
              },
              ...(!output
                ? [{ value: "novo_aporte", label: "Muda o aporte mensal" }]
                : []),
            ]}
          />
          <Field
            label={e.recorrencia === "novo_aporte" ? "A partir dos" : "Idade"}
            kind="age"
            value={e.idade}
            onChange={(v) => update(e.id, "idade", v ?? 0)}
          />
          <div className={e.recorrencia !== "mensal" ? "invisible" : ""}>
            <Field
              label="Até"
              kind="age"
              value={e.idadeFim}
              onChange={(v) => update(e.id, "idadeFim", v)}
            />
          </div>
          <Field
            label={
              e.recorrencia === "novo_aporte" ? "Novo aporte /mês" : "Valor"
            }
            value={e.valor}
            onChange={(v) => update(e.id, "valor", v)}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remover ${e.descricao || "evento"}`}
            title="Remover evento"
            onClick={() => onChange(events.filter((v) => v.id !== e.id))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed text-accent bg-card hover:bg-secondary"
        onClick={() =>
          onChange([
            ...events,
            {
              id: crypto.randomUUID(),
              descricao: "",
              recorrencia: "unica",
              idade: 0,
              idadeFim: null,
              valor: 0,
            },
          ])
        }
      >
        <Plus className="w-4 h-4 mr-2" />
        {output ? "Adicionar saída" : "Adicionar entrada ou mudança de aporte"}
      </Button>
    </div>
  );
}
