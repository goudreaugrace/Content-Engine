import { Router } from "express";
import { loadDEExRules, saveDEExRules } from "../lib/storage";
import type { DEExRules } from "../lib/types";

export const standardsRouter = Router();

standardsRouter.get("/", async (_req, res) => {
  const rules = await loadDEExRules();
  if (!rules) return res.status(404).json({ error: "Pep readiness standards not found" });
  res.json(rules);
});

standardsRouter.put("/", async (req, res) => {
  const rules = req.body as DEExRules;
  const errors = validateRules(rules);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join("; ") });
  }
  res.json(await saveDEExRules(rules));
});

function validateRules(rules: DEExRules): string[] {
  const errors: string[] = [];
  const groups: Array<keyof Pick<
    DEExRules,
    "toneRules" | "inclusivityRules" | "accessibilityRules" | "formattingRules"
  >> = ["toneRules", "inclusivityRules", "accessibilityRules", "formattingRules"];

  for (const group of groups) {
    const values = rules?.[group];
    if (
      !Array.isArray(values) ||
      values.length === 0 ||
      values.some((value) => typeof value !== "string" || !value.trim())
    ) {
      errors.push(`${group} must contain non-empty text rules`);
    }
  }

  const limits = rules?.characterLimits;
  for (const key of ["title", "summary", "metaDescription"] as const) {
    const value = limits?.[key];
    if (!Number.isInteger(value) || value <= 0 || value > 10000) {
      errors.push(`characterLimits.${key} must be a positive whole number`);
    }
  }
  return errors;
}
