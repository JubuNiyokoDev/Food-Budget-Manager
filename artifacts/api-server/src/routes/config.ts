import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM config ORDER BY cle").all();
  res.json(rows);
});

router.put("/", (req, res) => {
  const { updates } = req.body as { updates: Array<{ cle: string; valeur: string }> };
  if (!Array.isArray(updates)) {
    return res.status(400).json({ success: false, message: "updates must be an array" });
  }

  const updateStmt = db.prepare("UPDATE config SET valeur = ?, modifie_le = CURRENT_TIMESTAMP WHERE cle = ?");
  const insertStmt = db.prepare("INSERT OR REPLACE INTO config (cle, valeur) VALUES (?, ?)");

  const runAll = db.transaction(() => {
    for (const { cle, valeur } of updates) {
      const existing = db.prepare("SELECT cle FROM config WHERE cle = ?").get(cle);
      if (existing) {
        updateStmt.run(valeur, cle);
      } else {
        insertStmt.run(cle, valeur);
      }
    }
  });
  runAll();

  res.json({ success: true, message: "Config updated" });
});

export default router;
