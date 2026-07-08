import { Router } from "express";
import { loadCountryCatalog } from "../lib/storage";

/**
 * Read-only route serving the country catalog. The catalog is bundled JSON
 * (not user-editable in the POC), so there's no PUT/POST here. If the catalog
 * ever needs to be admin-editable we'd mirror the markets/audiences pattern.
 */
export const countriesRouter = Router();

countriesRouter.get("/", async (_req, res) => {
  const countries = await loadCountryCatalog();
  res.json(countries);
});
