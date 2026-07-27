export type ArticleStatus = "needs-review" | "approved" | "rejected";

export type Article = {
  id: string;
  title: string;
  contentType: "FAQ" | "Policy" | "Knowledge Article" | "Topic Page";
  market: "US" | "MX" | "Global";
  submittedBy: { name: string; email: string };
  submittedAt: string; // ISO date
  status: ArticleStatus;
  reviewedAt?: string;
  reviewer?: string;
  rejectionReason?: string;
};

// Realistic-ish seed data for the POC dashboard.
export const mockArticles: Article[] = [
  {
    id: "ka-001",
    title: "How to submit an expense report",
    contentType: "Knowledge Article",
    market: "US",
    submittedBy: { name: "Sarah Chen", email: "sarah.chen@pepsico.com" },
    submittedAt: "2026-05-12T14:23:00Z",
    status: "needs-review",
  },
  {
    id: "ka-002",
    title: "Cómo solicitar tiempo de vacaciones",
    contentType: "Knowledge Article",
    market: "MX",
    submittedBy: { name: "Carlos Ramírez", email: "carlos.ramirez@pepsico.com" },
    submittedAt: "2026-05-10T09:15:00Z",
    status: "needs-review",
  },
  {
    id: "ka-003",
    title: "Remote work policy — North America",
    contentType: "Policy",
    market: "Global",
    submittedBy: { name: "Priya Patel", email: "priya.patel@pepsico.com" },
    submittedAt: "2026-05-08T16:42:00Z",
    status: "approved",
    reviewedAt: "2026-05-15T11:00:00Z",
    reviewer: "M. Johnson",
  },
  {
    id: "ka-004",
    title: "FAQ: New hire onboarding checklist",
    contentType: "FAQ",
    market: "US",
    submittedBy: { name: "James O'Brien", email: "james.obrien@pepsico.com" },
    submittedAt: "2026-05-07T10:30:00Z",
    status: "approved",
    reviewedAt: "2026-05-14T15:20:00Z",
    reviewer: "M. Johnson",
  },
  {
    id: "ka-005",
    title: "Política de seguridad en planta",
    contentType: "Policy",
    market: "MX",
    submittedBy: { name: "Ana Gutiérrez", email: "ana.gutierrez@pepsico.com" },
    submittedAt: "2026-05-06T08:00:00Z",
    status: "rejected",
    reviewedAt: "2026-05-13T13:45:00Z",
    reviewer: "L. Hernández",
    rejectionReason: "Missing NOM-051 references — needs regulatory review.",
  },
  {
    id: "ka-006",
    title: "Benefits enrollment hub",
    contentType: "Topic Page",
    market: "US",
    submittedBy: { name: "Sarah Chen", email: "sarah.chen@pepsico.com" },
    submittedAt: "2026-05-15T13:10:00Z",
    status: "needs-review",
  },
  {
    id: "ka-007",
    title: "IT support: VPN troubleshooting",
    contentType: "Knowledge Article",
    market: "Global",
    submittedBy: { name: "Devon Williams", email: "devon.williams@pepsico.com" },
    submittedAt: "2026-05-04T11:05:00Z",
    status: "approved",
    reviewedAt: "2026-05-11T09:30:00Z",
    reviewer: "M. Johnson",
  },
  {
    id: "ka-008",
    title: "Preguntas frecuentes: nómina",
    contentType: "FAQ",
    market: "MX",
    submittedBy: { name: "Carlos Ramírez", email: "carlos.ramirez@pepsico.com" },
    submittedAt: "2026-05-16T15:50:00Z",
    status: "needs-review",
  },
  {
    id: "ka-009",
    title: "Code of conduct — annual refresh",
    contentType: "Policy",
    market: "Global",
    submittedBy: { name: "Priya Patel", email: "priya.patel@pepsico.com" },
    submittedAt: "2026-05-02T09:20:00Z",
    status: "rejected",
    reviewedAt: "2026-05-09T14:00:00Z",
    reviewer: "M. Johnson",
    rejectionReason: "Tone too informal for a Tier-1 policy document.",
  },
  {
    id: "ka-010",
    title: "Holiday schedule 2026",
    contentType: "FAQ",
    market: "US",
    submittedBy: { name: "James O'Brien", email: "james.obrien@pepsico.com" },
    submittedAt: "2026-05-17T08:45:00Z",
    status: "needs-review",
  },
  {
    id: "ka-011",
    title: "Guía de uso del portal MyPepsiCo",
    contentType: "Knowledge Article",
    market: "MX",
    submittedBy: { name: "Ana Gutiérrez", email: "ana.gutierrez@pepsico.com" },
    submittedAt: "2026-04-28T10:00:00Z",
    status: "approved",
    reviewedAt: "2026-05-05T16:00:00Z",
    reviewer: "L. Hernández",
  },
  {
    id: "ka-012",
    title: "Travel & expense policy update",
    contentType: "Policy",
    market: "US",
    submittedBy: { name: "Devon Williams", email: "devon.williams@pepsico.com" },
    submittedAt: "2026-05-18T11:30:00Z",
    status: "needs-review",
  },
];

// Monthly review cycle helper. Reviews happen on the 1st of each month
// — anything submitted before that cutoff is included.
export function getNextReviewDate(now = new Date()): Date {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next;
}
