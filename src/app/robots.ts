import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // robots.txt is only an additional instruction — never access control.
        disallow: [
          "/administracija",
          "/administracija/",
          "/admin",
          "/hvac/superadministracija",
          "/hvac/superadministracija/",
          "/hvac-b2b",
          "/bisneyscrm",
          "/bisneyscrm/",
          "/electro/administracija",
          "/electro/administracija/",
          "/electro/superadministracija",
          "/electro/superadministracija/",
          "/api",
          "/go/",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
