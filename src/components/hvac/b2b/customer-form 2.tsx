import { Field, Input, Select, Textarea, SubmitButton, FormSection } from "@/components/admin/ui";
import { SOURCE_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/hvac/b2b-config";
import type { HvacCustomer, HvacSource, HvacCustomerType } from "@/generated/prisma/client";

/** Shared create/edit form for a customer. `action` is a bound server action. */
export function CustomerForm({ customer, action, submitLabel }: {
  customer?: HvacCustomer | null;
  action: (form: FormData) => void;
  submitLabel: string;
}) {
  const c = customer;
  return (
    <form action={action}>
      <FormSection title="Osnovni podaci">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vrsta klijenta">
            <Select name="type" defaultValue={c?.type ?? "INDIVIDUAL"}>
              {(Object.keys(CUSTOMER_TYPE_LABELS) as HvacCustomerType[]).map((k) => <option key={k} value={k}>{CUSTOMER_TYPE_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Field label="Izvor">
            <Select name="source" defaultValue={c?.source ?? "MANUAL"}>
              {(Object.keys(SOURCE_LABELS) as HvacSource[]).map((k) => <option key={k} value={k}>{SOURCE_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Field label="Ime"><Input name="firstName" defaultValue={c?.firstName ?? ""} /></Field>
          <Field label="Prezime"><Input name="lastName" defaultValue={c?.lastName ?? ""} /></Field>
          <Field label="Naziv tvrtke" hint="Za pravne osobe"><Input name="companyName" defaultValue={c?.companyName ?? ""} /></Field>
          <Field label="OIB"><Input name="oib" defaultValue={c?.oib ?? ""} inputMode="numeric" maxLength={11} /></Field>
        </div>
      </FormSection>

      <FormSection title="Kontakt">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
          <Field label="Telefon"><Input name="phone" defaultValue={c?.phone ?? ""} /></Field>
          <Field label="Alternativni telefon"><Input name="altPhone" defaultValue={c?.altPhone ?? ""} /></Field>
          <Field label="Preferirani kontakt"><Input name="preferredContact" defaultValue={c?.preferredContact ?? ""} placeholder="telefon, e-mail…" /></Field>
        </div>
      </FormSection>

      <FormSection title="Adresa za račun">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adresa"><Input name="billingAddress" defaultValue={c?.billingAddress ?? ""} /></Field>
          <Field label="Grad"><Input name="billingCity" defaultValue={c?.billingCity ?? ""} /></Field>
          <Field label="Poštanski broj"><Input name="billingPostalCode" defaultValue={c?.billingPostalCode ?? ""} /></Field>
        </div>
        <Field label="Interne napomene"><Textarea name="notes" rows={2} defaultValue={c?.notes ?? ""} /></Field>
      </FormSection>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
