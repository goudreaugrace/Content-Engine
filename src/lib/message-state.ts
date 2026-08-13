import type { PersonaMode } from "./persona";
import { getViewingContentOwner } from "./content-owner-view";

const STORAGE_KEY = "content-engine-read-message-ids-v1";
const CHANGE_EVENT = "content-engine-message-read-change";

// Prototype inbox membership. When Messages is backed by an API, this moves
// to server-side recipient/read records rather than remaining in the client.
const UNREAD_MESSAGE_IDS: Record<Exclude<PersonaMode, "non-admin">, string[]> = {
  admin: ["msg-1", "msg-2", "msg-3"],
  "super-admin": ["msg-3"],
};

const CONTENT_OWNER_UNREAD_MESSAGES: Record<string, string[]> = {
  "Demo User": ["msg-1"],
  Test: ["msg-2"],
  Demo: [],
  "Test Author": [],
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
