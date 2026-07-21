import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import {
  savePageSettings,
  addBlock,
  saveBlockFields,
  moveBlock,
  toggleBlockHidden,
  duplicateBlock,
  deleteBlock,
} from "@/server/actions/pages";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
  StatusBadge,
} from "@/components/admin/ui";
import { SeoFields } from "@/components/admin/seo-fields";
import { BLOCK_SCHEMAS, getBlockSchema, type BlockField } from "@/lib/blocks-schema";

function fieldDefault(field: BlockField, content: Record<string, unknown>, settings: Record<string, unknown>): string {
  const bucket = field.target === "content" ? content : settings;
  const v = bucket[field.key];
  if (v == null) return "";
  switch (field.kind) {
    case "lines":
      return Array.isArray(v) ? (v as string[]).join("\n") : "";
    case "faq":
      return Array.isArray(v)
        ? (v as { question: string; answer: string }[])
            .map((f) => `${f.question} | ${f.answer}`)
            .join("\n")
        : "";
    case "pairs":
      return Array.isArray(v)
        ? (v as { value: string; label: string }[])
            .map((p) => `${p.value} | ${p.label}`)
            .join("\n")
        : "";
    case "boolean":
      return v === true || v === "true" ? "true" : "false";
    default:
      return String(v);
  }
}

export default async function PageBuilderPage(props: PageProps<"/administracija/pages/[id]">) {
  const { id } = await props.params;
  const page = await db.page.findUnique({
    where: { id },
    include: {
      language: true,
      blocks: {
        where: { parentBlockId: null },
        orderBy: { position: "asc" },
        include: { globalSection: true },
      },
    },
  });
  if (!page) notFound();

  const globalSections = await db.globalSection.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const previewUrl = page.isHomepage
    ? `/${page.language.code}`
    : `/${page.language.code}/${page.slug}`;

  return (
    <div>
      <PageHeader title={`Page builder: ${page.title}`}>
        <StatusBadge status={page.status} />
        <Link
          href={previewUrl}
          target="_blank"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Preview ↗
        </Link>
      </PageHeader>

      {/* Page settings */}
      <details className="mb-6 rounded-card border border-border bg-card">
        <summary className="cursor-pointer px-6 py-4 font-semibold">Page settings & SEO</summary>
        <form action={savePageSettings.bind(null, page.id)} className="space-y-4 border-t border-border p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Title">
              <Input name="title" defaultValue={page.title} required />
            </Field>
            <Field label="Slug">
              <Input name="slug" defaultValue={page.slug} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={page.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox
            name="isHomepage"
            label={`Use as homepage for ${page.language.nativeName}`}
            defaultChecked={page.isHomepage}
          />
          <SeoFields
            entityType="PAGE"
            entityId={page.id}
            languageId={page.languageId}
            title={page.title}
            slug={page.slug}
            publicPath={previewUrl}
          />
          <SubmitButton label="Save page settings" />
        </form>
      </details>

      {/* Blocks */}
      <h2 className="mb-3 text-lg font-semibold">Sections</h2>
      <div className="space-y-3">
        {page.blocks.length === 0 && (
          <div className="rounded-card border border-dashed border-border px-6 py-8 text-center text-sm text-muted">
            No sections yet — add your first one below.
          </div>
        )}
        {page.blocks.map((block, index) => {
          const schema = getBlockSchema(block.type);
          const content = (block.contentJson ?? {}) as Record<string, unknown>;
          const settings = (block.settingsJson ?? {}) as Record<string, unknown>;
          return (
            <details
              key={block.id}
              className={`rounded-card border bg-card ${block.isHidden ? "border-dashed border-border opacity-60" : "border-border"}`}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5">
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-soft text-xs text-primary">
                    {index + 1}
                  </span>
                  {block.type === "global_section"
                    ? `Global: ${block.globalSection?.name ?? "?"}`
                    : (schema?.label ?? block.type)}
                  {block.isHidden && <span className="text-xs font-normal text-muted">(hidden)</span>}
                </span>
                <span className="flex items-center gap-1">
                  <form action={moveBlock.bind(null, block.id, "up")} className="inline">
                    <IconBtn title="Move up"><ArrowUp size={13} /></IconBtn>
                  </form>
                  <form action={moveBlock.bind(null, block.id, "down")} className="inline">
                    <IconBtn title="Move down"><ArrowDown size={13} /></IconBtn>
                  </form>
                  <form action={duplicateBlock.bind(null, block.id)} className="inline">
                    <IconBtn title="Duplicate"><Copy size={13} /></IconBtn>
                  </form>
                  <form action={toggleBlockHidden.bind(null, block.id)} className="inline">
                    <IconBtn title={block.isHidden ? "Show" : "Hide"}>
                      {block.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                    </IconBtn>
                  </form>
                  <form action={deleteBlock.bind(null, block.id)} className="inline">
                    <IconBtn title="Delete" danger><Trash2 size={13} /></IconBtn>
                  </form>
                </span>
              </summary>

              {schema && schema.fields.length > 0 && (
                <form
                  action={saveBlockFields.bind(null, block.id)}
                  className="space-y-4 border-t border-border p-5"
                >
                  <p className="text-xs text-muted">{schema.description}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {schema.fields.map((field) => {
                      const value = fieldDefault(field, content, settings);
                      const full =
                        field.kind === "textarea" || field.kind === "html" ||
                        field.kind === "lines" || field.kind === "faq" || field.kind === "pairs";
                      return (
                        <div key={field.key} className={full ? "sm:col-span-2" : ""}>
                          <Field label={field.label} hint={field.hint}>
                            {field.kind === "boolean" ? (
                              <Select name={field.key} defaultValue={value || "false"}>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </Select>
                            ) : field.kind === "number" ? (
                              <Input name={field.key} type="number" defaultValue={value} />
                            ) : field.kind === "text" ? (
                              <Input name={field.key} defaultValue={value} />
                            ) : (
                              <Textarea
                                name={field.key}
                                defaultValue={value}
                                rows={field.kind === "html" ? 8 : 3}
                              />
                            )}
                          </Field>
                        </div>
                      );
                    })}
                  </div>
                  <SubmitButton label="Save section" />
                </form>
              )}
            </details>
          );
        })}
      </div>

      {/* Add block */}
      <div className="mt-6 rounded-card border border-border bg-card p-5">
        <h3 className="font-semibold">Add section</h3>
        <form action={addBlock.bind(null, page.id)} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Field label="Section type">
              <Select name="type" defaultValue="rich_text">
                {BLOCK_SCHEMAS.map((s) => (
                  <option key={s.type} value={s.type}>{s.label}</option>
                ))}
                {globalSections.length > 0 && (
                  <option value="global_section">— Global section —</option>
                )}
              </Select>
            </Field>
          </div>
          {globalSections.length > 0 && (
            <div className="w-64">
              <Field label="Global section (if selected above)">
                <Select name="globalSectionId" defaultValue="">
                  <option value="">— none —</option>
                  {globalSections.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <SubmitButton label="+ Add section" />
        </form>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  danger,
  children,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors ${
        danger ? "text-red-500 hover:border-red-500" : "text-muted hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
