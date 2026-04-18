import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/", (req, res) => {
  const { mois, produit_id, categorie_id, lieu_achat, page = "1", limit = "25" } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 25;
  const offset = (pageNum - 1) * limitNum;

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (mois) {
    where += " AND strftime('%Y-%m', a.date_achat) = ?";
    params.push(mois);
  }
  if (produit_id) {
    where += " AND a.produit_id = ?";
    params.push(produit_id);
  }
  if (categorie_id) {
    where += " AND p.categorie_id = ?";
    params.push(categorie_id);
  }
  if (lieu_achat) {
    where += " AND a.lieu_achat LIKE ?";
    params.push(`%${lieu_achat}%`);
  }

  const query = `
    SELECT a.*,
      p.nom as produit_nom,
      p.emoji as produit_emoji,
      p.unite,
      c.nom as categorie_nom,
      c.couleur as categorie_couleur,
      CASE WHEN a.quantite > 0 THEN ROUND(a.prix_paye / a.quantite, 2) ELSE 0 END as prix_par_unite
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    ${where}
    ORDER BY a.date_achat DESC, a.id DESC
  `;

  const totalRow = db.prepare(`SELECT COUNT(*) as count, SUM(a.prix_paye) as total FROM achats a LEFT JOIN produits p ON a.produit_id = p.id ${where}`).get(...params) as { count: number; total: number };
  const data = db.prepare(`${query} LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

  res.json({
    data,
    total: totalRow.count,
    page: pageNum,
    limit: limitNum,
    total_montant: totalRow.total || 0,
  });
});

router.post("/", (req, res) => {
  const { produit_id, date_achat, quantite, prix_paye, lieu_achat, notes } = req.body;
  if (!produit_id || !date_achat || quantite === undefined || prix_paye === undefined) {
    return res.status(400).json({ success: false, message: "produit_id, date_achat, quantite, prix_paye required" });
  }

  const mois = date_achat.substring(0, 7);
  const budget = db.prepare("SELECT id FROM budgets_mensuels WHERE mois = ? AND statut = 'actif'").get(mois) as { id: number } | undefined;

  const result = db.prepare(`
    INSERT INTO achats (budget_mensuel_id, produit_id, date_achat, quantite, prix_paye, lieu_achat, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(budget?.id ?? null, produit_id, date_achat, quantite, prix_paye, lieu_achat ?? null, notes ?? null);

  const row = db.prepare(`
    SELECT a.*,
      p.nom as produit_nom,
      p.emoji as produit_emoji,
      c.nom as categorie_nom,
      c.couleur as categorie_couleur,
      CASE WHEN a.quantite > 0 THEN ROUND(a.prix_paye / a.quantite, 2) ELSE 0 END as prix_par_unite
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { produit_id, date_achat, quantite, prix_paye, lieu_achat, notes } = req.body;

  const mois = date_achat?.substring(0, 7);
  let budgetId: number | null = null;
  if (mois) {
    const budget = db.prepare("SELECT id FROM budgets_mensuels WHERE mois = ?").get(mois) as { id: number } | undefined;
    budgetId = budget?.id ?? null;
  }

  db.prepare(`
    UPDATE achats SET
      produit_id = COALESCE(?, produit_id),
      date_achat = COALESCE(?, date_achat),
      quantite = COALESCE(?, quantite),
      prix_paye = COALESCE(?, prix_paye),
      lieu_achat = COALESCE(?, lieu_achat),
      notes = COALESCE(?, notes),
      budget_mensuel_id = COALESCE(?, budget_mensuel_id),
      modifie_le = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(produit_id ?? null, date_achat ?? null, quantite ?? null, prix_paye ?? null, lieu_achat ?? null, notes ?? null, budgetId, id);

  const updated = db.prepare(`
    SELECT a.*,
      p.nom as produit_nom, p.emoji as produit_emoji,
      c.nom as categorie_nom, c.couleur as categorie_couleur,
      CASE WHEN a.quantite > 0 THEN ROUND(a.prix_paye / a.quantite, 2) ELSE 0 END as prix_par_unite
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE a.id = ?
  `).get(id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM achats WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Deleted" });
});

router.post("/bulk-delete", (req, res) => {
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
  }

  const deleteStmt = db.prepare("DELETE FROM achats WHERE id = ?");
  const deleteAll = db.transaction(() => {
    for (const id of ids) deleteStmt.run(id);
  });
  deleteAll();

  res.json({ success: true, message: `Deleted ${ids.length} records` });
});

export default router;
