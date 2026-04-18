import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY ordre, id").all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { nom, emoji = "📦", couleur = "#6B7280", ordre = 0, actif = 1 } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: "nom is required" });

  const result = db.prepare(`
    INSERT INTO categories (nom, emoji, couleur, ordre, actif)
    VALUES (?, ?, ?, ?, ?)
  `).run(nom, emoji, couleur, ordre, actif);

  const row = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nom, emoji, couleur, ordre, actif } = req.body;

  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ success: false, message: "Not found" });

  db.prepare(`
    UPDATE categories SET
      nom = COALESCE(?, nom),
      emoji = COALESCE(?, emoji),
      couleur = COALESCE(?, couleur),
      ordre = COALESCE(?, ordre),
      actif = COALESCE(?, actif)
    WHERE id = ?
  `).run(nom ?? null, emoji ?? null, couleur ?? null, ordre ?? null, actif ?? null, id);

  const updated = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.json({ success: true, message: "Deleted" });
});

export default router;
