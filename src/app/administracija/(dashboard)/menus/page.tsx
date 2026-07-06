import { db } from "@/lib/db";
import { PageHeader, Field, Textarea, SubmitButton } from "@/components/admin/ui";
import { saveMenu, ensureMenus } from "@/server/actions/menus";

export default async function AdminMenusPage() {
  const menus = await db.menu.findMany({
    include: {
      language: true,
      items: { orderBy: { position: "asc" } },
    },
    orderBy: [{ location: "asc" }, { language: { position: "asc" } }],
  });

  return (
    <div>
      <PageHeader title="Menus">
        <form action={ensureMenus}>
          <button
            type="submit"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Create missing menus
          </button>
        </form>
      </PageHeader>
      <p className="mb-6 -mt-2 text-sm text-muted">
        One item per line in the format <code>Label | URL</code>. Use locale-prefixed URLs
        (e.g. <code>/en/tools</code>) or full external URLs.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {menus.map((menu) => (
          <details key={menu.id} className="rounded-card border border-border bg-card" open={menu.language.code === "en"}>
            <summary className="cursor-pointer px-5 py-3.5 font-semibold">
              {menu.location === "HEADER" ? "Header" : menu.location === "FOOTER" ? "Footer" : "Secondary"}{" "}
              — {menu.language.nativeName}
              <span className="ml-2 text-xs font-normal text-muted">({menu.items.length} items)</span>
            </summary>
            <form action={saveMenu.bind(null, menu.id)} className="border-t border-border p-5">
              <Field label="Items">
                <Textarea
                  name="items"
                  rows={Math.max(6, menu.items.length + 1)}
                  defaultValue={menu.items.map((i) => `${i.label} | ${i.url}`).join("\n")}
                />
              </Field>
              <div className="mt-3">
                <SubmitButton label="Save menu" />
              </div>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
