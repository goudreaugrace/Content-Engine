import type { PersonaMode } from "./persona";
import { getViewingContentOwner } from "./content-owner-view";

const STORAGE_KEY = "content-engine-read-message-ids-v1";
const TRASH_STORAGE_KEY = "content-engine-message-trash-v1";
const CHANGE_EVENT = "content-engine-message-read-change";
const TRASH_RETENTION_DAYS = 60;
const TRASH_MAX_MESSAGES = 100;

export type TrashedMessageRecord = {
  id: string;
  personaMode: PersonaMode;
  deletedAt: string;
};

function getAllTrashRecords(): TrashedMessageRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(TRASH_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const valid = (value as TrashedMessageRecord[])
      .filter((record) => record?.id && record?.personaMode && new Date(record.deletedAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
      .slice(0, TRASH_MAX_MESSAGES);
    if (valid.length !== value.length) localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(valid));
    return valid;
  } catch {
    return [];
  }
}

function saveTrashRecords(records: TrashedMessageRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(records.slice(0, TRASH_MAX_MESSAGES)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getTrashedMessageRecords(personaMode: PersonaMode): TrashedMessageRecord[] {
  return getAllTrashRecords().filter((record) => record.personaMode === personaMode);
}

export function trashMessages(ids: Iterable<string>, personaMode: PersonaMode): TrashedMessageRecord[] {
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const retained = getAllTrashRecords().filter(
    (record) => record.personaMode !== personaMode || !idSet.has(record.id),
  );
  const additions = [...idSet].map((id) => ({ id, personaMode, deletedAt: now }));
  saveTrashRecords([...additions, ...retained]);
  return getTrashedMessageRecords(personaMode);
}

export function restoreTrashedMessage(id: string, personaMode: PersonaMode): TrashedMessageRecord[] {
  saveTrashRecords(
    getAllTrashRecords().filter((record) => record.id !== id || record.personaMode !== personaMode),
  );
  return getTrashedMessageRecords(personaMode);
}

export function permanentlyDeleteTrashedMessage(id: string, personaMode: PersonaMode): TrashedMessageRecord[] {
  return restoreTrashedMessage(id, personaMode);
}

export function emptyMessageTrash(personaMode: PersonaMode): TrashedMessageRecord[] {
  saveTrashRecords(getAllTrashRecords().filter((record) => record.personaMode !== personaMode));
  return [];
}

export const MESSAGE_TRASH_POLICY = {
  retentionDays: TRASH_RETENTION_DAYS,
  maxMessages: TRASH_MAX_MESSAGES,
};

// Prototype inbox membership. When Messages is backed by an API, this moves
// to server-side recipient/read records rather than remaining in the client.
const UNREAD_MESSAGE_IDS: Record<Exclude<PersonaMode, "non-admin">, string[]> = {
  admin: ["msg-2", "msg-3", "owner-needed-sofia", "transfer-message-transfer-incoming-1"],
  "super-admin": ["msg-3"],
};

const CONTENT_OWNER_UNREAD_MESSAGES: Record<string, string[]> = {
  "Demo User": ["msg-1"],
  Test: ["msg-2"],
  Demo: [],
  "Test Author": [],
  "New Owner": ["welcome-new-owner"],
};

export function getReadMessageIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function markMessagesRead(ids: Iterable<string>): Set<string> {
  const next = getReadMessageIds();
  for (const id of ids) next.add(id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return next;
}

export function getUnreadMessageCount(personaMode: PersonaMode): number {
  const readIds = getReadMessageIds();
  const messageIds =
    personaMode === "non-admin"
      ? (CONTENT_OWNER_UNREAD_MESSAGES[getViewingContentOwner()] ?? [])
      : UNREAD_MESSAGE_IDS[personaMode];
  return messageIds.filter((id) => !readIds.has(id)).length;
}

export function subscribeToMessageReadChanges(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
