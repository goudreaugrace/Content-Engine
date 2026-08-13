const STORAGE_KEY = "content-engine-poc-content-owner-v1";
const CHANGE_EVENT = "content-engine-poc-content-owner-change";

export const DEFAULT_CONTENT_OWNER = "Demo User";

/**
 * POC publishing permissions. A Team Admin will manage these in a later
 * iteration; for now they ensure a Content Owner only sees permitted sectors.
 */
export const CONTENT_OWNER_SECTOR_ACCESS: Record<string, string[]> = {
  "Demo User": ["pfna", "latam", "global"],
  Test: ["pfna", "pbna"],
  Demo: ["pbna"],
  "Test Author": ["pfna"],
};

export function sectorsForContentOwner(owner: string): string[] {
  return CONTENT_OWNER_SECTOR_ACCESS[owner] ?? [];
}

export function getViewingContentOwner(): string {
  if (typeof window === "undefined") return DEFAULT_CONTENT_OWNER;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONTENT_OWNER;
}

export function setViewingContentOwner(owner: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, owner);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToViewingContentOwner(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
