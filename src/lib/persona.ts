import { useEffect, useState } from "react";

export type PersonaMode = "admin" | "non-admin";

const PERSONA_KEY = "deex-persona-mode-v1";
const PERSONA_EVENT = "deex-persona-change";

export function getPersonaMode(): PersonaMode {
  if (typeof window === "undefined") return "admin";
  return localStorage.getItem(PERSONA_KEY) === "non-admin" ? "non-admin" : "admin";
}

export function setPersonaMode(mode: PersonaMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERSONA_KEY, mode);
  window.dispatchEvent(new CustomEvent(PERSONA_EVENT, { detail: mode }));
}

export function usePersonaMode(): [PersonaMode, (mode: PersonaMode) => void] {
  const [mode, setMode] = useState<PersonaMode>(() => getPersonaMode());

  useEffect(() => {
    const sync = () => setMode(getPersonaMode());
    window.addEventListener("storage", sync);
    window.addEventListener(PERSONA_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PERSONA_EVENT, sync);
    };
  }, []);

  const update = (next: PersonaMode) => {
    setPersonaMode(next);
    setMode(next);
  };

  return [mode, update];
}
