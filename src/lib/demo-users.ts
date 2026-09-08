import { useEffect, useState } from "react";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  knowledgeBases: string[];
  superAdmin: true;
  teamAdmin: boolean;
  contentOwner: boolean;
  teamAdminId?: string;
  contentOwnerKey?: string;
  managerId?: string;
};

export const ALFONSO_TEAM_ADMIN_ID = "alfonso-ibarra";

export const DEMO_USERS: DemoUser[] = [
  { id: "alfonso-ibarra", name: "Alfonso Ibarra", email: "alfonso.ibarra@pepsico.com", initials: "AI", knowledgeBases: ["mypepsico"], superAdmin: true, teamAdmin: true, contentOwner: false, teamAdminId: ALFONSO_TEAM_ADMIN_ID },
  { id: "alina-corral", name: "Alina Corral", email: "alina.corral@pepsico.com", initials: "AC", knowledgeBases: ["mypepsico"], superAdmin: true, teamAdmin: false, contentOwner: true, contentOwnerKey: "Alina Corral", managerId: ALFONSO_TEAM_ADMIN_ID },
  { id: "itzel-ayala-quezada", name: "Itzel Ayala Quezada", email: "itzel.ayala.quezada@pepsico.com", initials: "IA", knowledgeBases: ["mypepsico"], superAdmin: true, teamAdmin: false, contentOwner: true, contentOwnerKey: "Itzel Ayala Quezada", managerId: ALFONSO_TEAM_ADMIN_ID },
  { id: "marco-diaz", name: "Marco Diaz", email: "marco.diaz@pepsico.com", initials: "MD", knowledgeBases: ["mypepsico"], superAdmin: true, teamAdmin: false, contentOwner: true, contentOwnerKey: "Marco Diaz", managerId: ALFONSO_TEAM_ADMIN_ID },
  { id: "sofia-gonzalez", name: "Sofia Gonzalez", email: "sofia.gonzalez@pepsico.com", initials: "SG", knowledgeBases: ["mypepsico"], superAdmin: true, teamAdmin: false, contentOwner: true, contentOwnerKey: "Sofia Gonzalez", managerId: ALFONSO_TEAM_ADMIN_ID },
];

const USER_KEY = "content-engine-story-user-v1";
const USER_EVENT = "content-engine-story-user-change";

export function getDemoUser(): DemoUser {
  if (typeof window === "undefined") return DEMO_USERS[0];
  const id = localStorage.getItem(USER_KEY);
  return DEMO_USERS.find((user) => user.id === id) ?? DEMO_USERS[0];
}

export function setDemoUser(id: string): DemoUser {
  const next = DEMO_USERS.find((user) => user.id === id) ?? DEMO_USERS[0];
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, next.id);
    window.dispatchEvent(new CustomEvent(USER_EVENT, { detail: next.id }));
  }
  return next;
}

export function useDemoUser(): [DemoUser, (id: string) => void] {
  const [user, setUser] = useState(getDemoUser);
  useEffect(() => {
    const sync = () => setUser(getDemoUser());
    window.addEventListener(USER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(USER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [user, (id: string) => setUser(setDemoUser(id))];
}
