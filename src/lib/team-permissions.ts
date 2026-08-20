export type TeamRole = "content-owner" | "team-admin";
export type MemberStatus = "active" | "new" | "handoff" | "scheduled-removal" | "inactive";
export type TransferStatus = "pending" | "approved" | "declined" | "cancelled";
export type HandoffChoice = "assign-now" | "co-owner" | "assign-later";

export type TeamMember = {
  id: string;
  contentOwnerKey: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  sectors: string[];
  knowledgeBases: string[];
  status: MemberStatus;
  teamAdminId: string;
  handoffEndsAt?: string;
  accessEndsAt?: string;
};

export type TeamAdmin = {
  id: string;
  name: string;
  team: string;
};

export type TransferRequest = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  senderAdminId: string;
  receiverAdminId: string;
  status: TransferStatus;
  requestedAt: string;
  updatedAt?: string;
  message?: string;
};

export type ArticleHandoff = {
  articleId: string;
  articleTitle: string;
  departingMemberId: string;
  choice: HandoffChoice;
  successorMemberId?: string;
  startedAt: string;
  deadline: string;
};

export type TransferLogEntry = {
  id: string;
  requestId: string;
  action: "requested" | "accepted" | "declined" | "cancelled";
  actorAdminId: string;
  occurredAt: string;
  note: string;
};

export type TeamPermissionsState = {
  members: TeamMember[];
  transfers: TransferRequest[];
  handoffs: ArticleHandoff[];
  transferLog: TransferLogEntry[];
};

export const CURRENT_TEAM_ADMIN_ID = "casey-morgan";
export const NEW_CONTENT_OWNER_KEY = "New Owner";

export const TEAM_ADMINS: TeamAdmin[] = [
  { id: CURRENT_TEAM_ADMIN_ID, name: "Casey Morgan", team: "Employee Services" },
  { id: "alexis-nguyen", name: "Alexis Nguyen", team: "People Operations" },
  { id: "cameron-reed", name: "Cameron Reed", team: "Finance Operations" },
  { id: "jamie-park", name: "Jamie Park", team: "Supply Chain Enablement" },
];

export const SECTOR_OPTIONS = [
  { id: "pfna", label: "PFNA" },
  { id: "pbna", label: "PBNA" },
  { id: "latam", label: "LATAM" },
  { id: "global", label: "Global" },
];

export const KNOWLEDGE_BASE_OPTIONS = [
  { id: "mypepsico", label: "myPepsiCo KB" },
  { id: "pfp", label: "PFP KB" },
  { id: "pepkm", label: "PepKM KB" },
];

// A Team Admin may only delegate permissions they already hold.
export const TEAM_ADMIN_SECTOR_ACCESS = SECTOR_OPTIONS.map((option) => option.id);
export const TEAM_ADMIN_KB_ACCESS = KNOWLEDGE_BASE_OPTIONS.map((option) => option.id);

export const OUTSIDE_TEAM_MEMBERS = [
  {
    id: "harper-singh",
    name: "Harper Singh",
    email: "harper.singh@pepsico.com",
    currentAdminId: "alexis-nguyen",
  },
  {
    id: "lena-torres",
    name: "Lena Torres",
    email: "lena.torres@pepsico.com",
    currentAdminId: "jamie-park",
  },
];

export const HANDOFF_ARTICLES_BY_MEMBER: Record<
  string,
  Array<{ articleId: string; articleTitle: string }>
> = {
  "jordan-lee": [
    { articleId: "ka-618766e0", articleTitle: "How to update banking details across regions" },
    { articleId: "ka-7f53e3ba", articleTitle: "Onboarding new guys to the team" },
  ],
  "avery-patel": [
    { articleId: "ka-e9c06de7", articleTitle: "How to refresh a driver login token" },
  ],
  "sofia-ramirez": [
    { articleId: "ka-fec0f30f", articleTitle: "How to request a corporate credit card" },
  ],
};

const STORAGE_KEY = "content-engine-team-permissions-v2";
const SEEN_OUTCOMES_STORAGE_KEY = "content-engine-team-permissions-seen-outcomes-v1";
const CHANGE_EVENT = "content-engine-team-permissions-change";

const initialState: TeamPermissionsState = {
  members: [
    {
      id: "maya-johnson",
      contentOwnerKey: "Demo User",
      firstName: "Maya",
      lastName: "Johnson",
      email: "content-owner@pepsico.com",
      role: "content-owner",
      sectors: ["pfna", "latam", "global"],
      knowledgeBases: ["mypepsico", "pfp"],
      status: "active",
      teamAdminId: CURRENT_TEAM_ADMIN_ID,
    },
    {
      id: "jordan-lee",
      contentOwnerKey: "Test",
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan.lee@pepsico.com",
      role: "content-owner",
      sectors: ["pfna", "pbna"],
      knowledgeBases: ["mypepsico"],
      status: "active",
      teamAdminId: CURRENT_TEAM_ADMIN_ID,
    },
    {
      id: "avery-patel",
      contentOwnerKey: "Demo",
      firstName: "Avery",
      lastName: "Patel",
      email: "avery.patel@pepsico.com",
      role: "content-owner",
      sectors: ["pbna"],
      knowledgeBases: ["pfp"],
      status: "active",
      teamAdminId: CURRENT_TEAM_ADMIN_ID,
    },
    {
      id: "sofia-ramirez",
      contentOwnerKey: "Test Author",
      firstName: "Sofia",
      lastName: "Ramirez",
      email: "sofia.ramirez@pepsico.com",
      role: "content-owner",
      sectors: ["pfna"],
      knowledgeBases: ["mypepsico", "pepkm"],
      status: "handoff",
      teamAdminId: CURRENT_TEAM_ADMIN_ID,
      handoffEndsAt: "2026-08-30T17:00:00.000Z",
    },
    {
      id: "nia-williams",
      contentOwnerKey: NEW_CONTENT_OWNER_KEY,
      firstName: "Nia",
      lastName: "Williams",
      email: "nia.williams@pepsico.com",
      role: "content-owner",
      sectors: ["pfna"],
      knowledgeBases: ["mypepsico"],
      status: "new",
      teamAdminId: CURRENT_TEAM_ADMIN_ID,
    },
  ],
  transfers: [
    {
      id: "transfer-incoming-1",
      memberId: "avery-patel",
      memberName: "Avery Patel",
      memberEmail: "avery.patel@pepsico.com",
      senderAdminId: "cameron-reed",
      receiverAdminId: CURRENT_TEAM_ADMIN_ID,
      status: "pending",
      requestedAt: "2026-08-18T13:20:00.000Z",
    },
    {
      id: "transfer-outgoing-1",
      memberId: "harper-singh",
      memberName: "Harper Singh",
      memberEmail: "harper.singh@pepsico.com",
      senderAdminId: CURRENT_TEAM_ADMIN_ID,
      receiverAdminId: "alexis-nguyen",
      status: "pending",
      requestedAt: "2026-08-18T14:05:00.000Z",
    },
    {
      id: "transfer-cancelled-1",
      memberId: "jordan-lee",
      memberName: "Jordan Lee",
      memberEmail: "jordan.lee@pepsico.com",
      senderAdminId: "jamie-park",
      receiverAdminId: CURRENT_TEAM_ADMIN_ID,
      status: "cancelled",
      requestedAt: "2026-08-17T16:10:00.000Z",
      updatedAt: "2026-08-18T08:35:00.000Z",
    },
    {
      id: "transfer-approved-sofia",
      memberId: "sofia-ramirez",
      memberName: "Sofia Ramirez",
      memberEmail: "sofia.ramirez@pepsico.com",
      senderAdminId: "alexis-nguyen",
      receiverAdminId: CURRENT_TEAM_ADMIN_ID,
      status: "approved",
      requestedAt: "2026-07-31T14:00:00.000Z",
      updatedAt: "2026-07-31T17:00:00.000Z",
    },
  ],
  handoffs: [
    {
      articleId: "ka-fec0f30f",
      articleTitle: "How to request a corporate credit card",
      departingMemberId: "sofia-ramirez",
      choice: "assign-later",
      startedAt: "2026-07-31T17:00:00.000Z",
      deadline: "2026-08-30T17:00:00.000Z",
    },
  ],
  transferLog: [
    {
      id: "log-1",
      requestId: "transfer-incoming-1",
      action: "requested",
      actorAdminId: "cameron-reed",
      occurredAt: "2026-08-18T13:20:00.000Z",
      note: "Cameron Reed requested Avery Patel’s transfer from your team to Finance Operations.",
    },
    {
      id: "log-2",
      requestId: "transfer-outgoing-1",
      action: "requested",
      actorAdminId: CURRENT_TEAM_ADMIN_ID,
      occurredAt: "2026-08-18T14:05:00.000Z",
      note: "You requested Harper Singh’s transfer from People Operations to your team.",
    },
    {
      id: "log-3",
      requestId: "transfer-cancelled-1",
      action: "cancelled",
      actorAdminId: "jamie-park",
      occurredAt: "2026-08-18T08:35:00.000Z",
      note: "Jamie Park cancelled the transfer request for Jordan Lee.",
    },
    {
      id: "log-4",
      requestId: "transfer-approved-sofia",
      action: "requested",
      actorAdminId: "alexis-nguyen",
      occurredAt: "2026-07-31T14:00:00.000Z",
      note: "Alexis Nguyen requested Sofia Ramirez’s transfer from your team to People Operations.",
    },
    {
      id: "log-5",
      requestId: "transfer-approved-sofia",
      action: "accepted",
      actorAdminId: CURRENT_TEAM_ADMIN_ID,
      occurredAt: "2026-07-31T17:00:00.000Z",
      note: "You approved Sofia Ramirez’s transfer. The 30-day handoff ends Aug 30, 2026.",
    },
  ],
};

function cloneInitialState(): TeamPermissionsState {
  return JSON.parse(JSON.stringify(initialState)) as TeamPermissionsState;
}

export function getTeamPermissionsState(): TeamPermissionsState {
  if (typeof window === "undefined") return cloneInitialState();
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as TeamPermissionsState) : cloneInitialState();
  } catch {
    return cloneInitialState();
  }
}

export function saveTeamPermissionsState(state: TeamPermissionsState): TeamPermissionsState {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return state;
}

export function subscribeToTeamPermissions(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function outcomeKey(request: TransferRequest): string {
  return `${request.id}:${request.status}:${request.updatedAt ?? request.requestedAt}`;
}

function getSeenOutcomeKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_OUTCOMES_STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function getTeamPermissionsAlertCount(): number {
  const state = getTeamPermissionsState();
  const pendingIncoming = state.transfers.filter(
    (request) =>
      request.receiverAdminId === CURRENT_TEAM_ADMIN_ID && request.status === "pending",
  ).length;
  const seen = getSeenOutcomeKeys();
  const unseenOutgoingOutcomes = state.transfers.filter(
    (request) =>
      request.senderAdminId === CURRENT_TEAM_ADMIN_ID &&
      (request.status === "approved" || request.status === "declined") &&
      !seen.has(outcomeKey(request)),
  ).length;
  return pendingIncoming + unseenOutgoingOutcomes;
}

export function markTeamPermissionsOutcomesSeen(): void {
  if (typeof window === "undefined") return;
  const seen = getSeenOutcomeKeys();
  getTeamPermissionsState().transfers
    .filter(
      (request) =>
        request.senderAdminId === CURRENT_TEAM_ADMIN_ID &&
        (request.status === "approved" || request.status === "declined"),
    )
    .forEach((request) => seen.add(outcomeKey(request)));
  localStorage.setItem(SEEN_OUTCOMES_STORAGE_KEY, JSON.stringify([...seen]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function teamAdminName(id: string): string {
  return TEAM_ADMINS.find((admin) => admin.id === id)?.name ?? "Team Admin";
}

export function teamAdminTeam(id: string): string {
  return TEAM_ADMINS.find((admin) => admin.id === id)?.team ?? "another team";
}

export function teamMemberName(member: TeamMember): string {
  return `${member.firstName} ${member.lastName}`;
}

export function ownershipHandoffForArticle(articleId: string): ArticleHandoff | undefined {
  return getTeamPermissionsState().handoffs.find((handoff) => handoff.articleId === articleId);
}

export function ownershipHandoffUrgency(handoff: ArticleHandoff): "warning" | "urgent" {
  return new Date(handoff.deadline).getTime() <= Date.now() ? "urgent" : "warning";
}
