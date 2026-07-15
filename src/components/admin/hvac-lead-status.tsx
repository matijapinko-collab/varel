"use client";

/** Auto-submitting status select for an HVAC lead (server action passed in). */
export function HvacLeadStatusSelect({
  action,
  current,
  options,
}: {
  action: (form: FormData) => void;
  current: string;
  options: { value: string; label: string }[];
}) {
  return (
    <form action={action}>
      <select
        name="status"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-1 rounded border border-border bg-background px-1.5 py-1 text-xs"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </form>
  );
}
