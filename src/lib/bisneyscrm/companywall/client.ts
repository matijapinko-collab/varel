import "server-only";
import { getCompanyWallCreds } from "./connection";

/**
 * CompanyWall REST client (Company Intelligence Faza 3).
 *
 * IMPORTANT: CompanyWall's concrete endpoint paths + authorization scheme are
 * defined by the API contract they provide with the paid plan (brief §9: "Ne
 * izmišljati endpoint strukturu"). This client therefore does NOT fabricate a
 * request shape. All the surrounding plumbing (encrypted credentials, storage,
 * matching, manual entry, data card, refresh flow) is complete; wiring the real
 * fetch is a one-function change once the contract is known — replace the body
 * of `companyWallSearch` with the documented request.
 */

export type CompanyWallCompany = {
  externalId?: string;
  legalName?: string;
  shortName?: string;
  oib?: string;
  mbs?: string;
  status?: string;
  foundedAt?: string;
  legalForm?: string;
  vatStatus?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  nkd?: string;
  activity?: string;
  employeeCount?: number;
  revenue?: number;
  profit?: number;
  creditRating?: string;
  directors?: unknown;
  owners?: unknown;
  raw?: unknown;
};

export class CompanyWallNotConfiguredError extends Error {}
export class CompanyWallNotWiredError extends Error {}

/** Searches CompanyWall by OIB or name. Throws until the API contract is wired. */
export async function companyWallSearch(_query: { oib?: string; name?: string; country?: string | null }): Promise<CompanyWallCompany[]> {
  const creds = await getCompanyWallCreds();
  if (!creds) throw new CompanyWallNotConfiguredError("CompanyWall veza nije konfigurirana. Unesite API podatke u postavkama integracije.");

  // --- Real request goes here, per CompanyWall's REST API documentation. ---
  // e.g. const res = await fetch(`${creds.apiUrl}/<documented-path>?oib=${_query.oib}`,
  //   { headers: { Authorization: `Bearer ${creds.apiKey}` } });
  // return normalizeCompanyWallResponse(await res.json());
  throw new CompanyWallNotWiredError(
    "CompanyWall API poziv još nije aktiviran — potreban je službeni API ugovor (endpoint strukture i autorizacija). Do tada koristite ručno povezivanje.",
  );
}
