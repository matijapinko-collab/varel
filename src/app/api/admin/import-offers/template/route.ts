import { auth } from "@/lib/auth";
import { roleCan } from "@/lib/permissions";

/** Downloadable CSV template for the offer import. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !roleCan(session.user.role, "affiliate.manage")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const header =
    "tool_slug,partner_slug,affiliate_url,merchant_name,product_url,current_price,old_price,currency,coupon_code,coupon_description,shipping_cost,availability,sponsored,active";
  const example =
    'sample-robot-vacuum,sample-partner,https://example.com/product?ref=varel,Sample Partner,https://example.com/product,579.00,699.00,EUR,SAVE20,"€20 off with code",0,in_stock,false,true';
  return new Response([header, example].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="varel-offers-template.csv"',
    },
  });
}
