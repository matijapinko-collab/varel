import "server-only";

/**
 * Minimal Trello REST client (https://developer.atlassian.com/cloud/trello/rest/).
 * Server-side only — credentials (key + token) never reach the browser. Every
 * call is no-store; callers cache into the local DB (brief §14: the frontend
 * reads from our tables, not from Trello on each page view).
 */
const BASE = "https://api.trello.com/1";

export class TrelloError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "TrelloError";
  }
}

export type TrelloCreds = { key: string; token: string };

async function req(
  method: "GET" | "POST" | "DELETE",
  path: string,
  creds: TrelloCreds,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(BASE + path);
  url.searchParams.set("key", creds.key);
  url.searchParams.set("token", creds.token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, { method, headers: { Accept: "application/json" }, cache: "no-store" });
  } catch (e) {
    throw new TrelloError(`Mrežna pogreška pri pozivu Trella: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TrelloError(`Trello ${res.status}: ${body.slice(0, 200) || res.statusText}`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type TrelloMe = { id: string; fullName?: string; username?: string; idOrganizations?: string[] };
export type TrelloBoardDto = { id: string; name: string; closed?: boolean; idOrganization?: string; url?: string };
export type TrelloListDto = { id: string; name: string; pos?: number; closed?: boolean };
export type TrelloMemberDto = { id: string; fullName?: string; username?: string };
export type TrelloCardDto = {
  id: string; name: string; desc?: string; due?: string | null; idList?: string;
  closed?: boolean; labels?: { id: string; name: string; color: string }[];
  idMembers?: string[]; customFieldItems?: unknown[]; attachments?: unknown[]; checklists?: unknown[];
};
export type TrelloActionDto = {
  id: string; type: string; date: string;
  idMemberCreator?: string;
  memberCreator?: { id: string; fullName?: string; username?: string };
  data?: Record<string, unknown>;
};
export type TrelloWebhookDto = { id: string; idModel: string; callbackURL: string; active: boolean };

export const trello = {
  me: (c: TrelloCreds) => req("GET", "/members/me", c, { fields: "id,fullName,username,idOrganizations" }) as Promise<TrelloMe>,
  boards: (c: TrelloCreds) =>
    req("GET", "/members/me/boards", c, { fields: "id,name,closed,idOrganization,url", filter: "open" }) as Promise<TrelloBoardDto[]>,
  boardLists: (c: TrelloCreds, boardId: string) =>
    req("GET", `/boards/${boardId}/lists`, c, { fields: "id,name,pos,closed", filter: "open" }) as Promise<TrelloListDto[]>,
  boardMembers: (c: TrelloCreds, boardId: string) =>
    req("GET", `/boards/${boardId}/members`, c, { fields: "id,fullName,username" }) as Promise<TrelloMemberDto[]>,
  boardCards: (c: TrelloCreds, boardId: string) =>
    req("GET", `/boards/${boardId}/cards`, c, {
      fields: "id,name,desc,due,idList,closed,labels,idMembers",
      customFieldItems: "true",
      attachments: "true",
      checklists: "all",
    }) as Promise<TrelloCardDto[]>,
  boardCustomFields: (c: TrelloCreds, boardId: string) =>
    req("GET", `/boards/${boardId}/customFields`, c) as Promise<unknown[]>,
  /** Board action history for initial import / reconciliation. */
  boardActions: (c: TrelloCreds, boardId: string, since?: string, limit = 1000) =>
    req("GET", `/boards/${boardId}/actions`, c, { limit: String(Math.min(limit, 1000)), ...(since ? { since } : {}) }) as Promise<TrelloActionDto[]>,
  webhooksForToken: (c: TrelloCreds) =>
    req("GET", `/tokens/${c.token}/webhooks`, c) as Promise<TrelloWebhookDto[]>,
  createWebhook: (c: TrelloCreds, idModel: string, callbackURL: string) =>
    req("POST", "/webhooks", c, { idModel, callbackURL }) as Promise<TrelloWebhookDto>,
  deleteWebhook: (c: TrelloCreds, webhookId: string) =>
    req("DELETE", `/webhooks/${webhookId}`, c) as Promise<null>,
};
