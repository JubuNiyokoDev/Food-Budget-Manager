import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM budgets_mensuels ORDER BY mois DESC").all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { mois, annee, budget_total_prevu, nombre_personnes = 6, notes, statut = "actif" } = req.body;
  if (!mois || !annee || !budget_total_prevu) {
    return res.status(400).json({ success: false, message: "mois, annee, budget_total_prevu required" });
  }

  const result = db.prepare(`
    INSERT INTO budgets_mensuels (mois, annee, budget_total_prevu, nombre_personnes, notes, statut)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mois, annee, budget_total_prevu, nombre_personnes, notes ?? null, statut);

  const budgetId = result.lastInsertRowid as number;

  const allProduits = db.prepare("SELECT id, cout_mensuel_prevu, prix_unitaire, quantite_prevue_mois FROM produits WHERE actif = 1").all() as Array<{
    id: number; cout_mensuel_prevu: number; prix_unitaire: number; quantite_prevue_mois: number;
  }>;

  const insertBP = db.prepare(`
    INSERT OR IGNORE INTO budget_produits (budget_mensuel_id, produit_id, quantite_prevue, cout_prevu, prix_unitaire_ref)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const p of allProduits) {
      insertBP.run(budgetId, p.id, p.quantite_prevue_mois, p.cout_mensuel_prevu, p.prix_unitaire);
    }
  });
  insertAll();

  const row = db.prepare("SELECT * FROM budgets_mensuels WHERE id = ?").get(budgetId);
  res.status(201).json(row);
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const budget = db.prepare("SELECT * FROM budgets_mensuels WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!budget) return res.status(404).json({ success: false, message: "Not found" });

  const produits = db.prepare(`
    SELECT bp.*,
      p.nom as produit_nom,
      p.emoji as produit_emoji,
      p.nom_local,
      p.unite,
      c.nom as categorie_nom,
      c.couleur as categorie_couleur,
      COALESCE((
        SELECT SUM(a.prix_paye)
        FROM achats a
        WHERE a.produit_id = bp.produit_id
          AND a.budget_mensuel_id = bp.budget_mensuel_id
      ), 0) as montant_depense
    FROM budget_produits bp
    LEFT JOIN produits p ON bp.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE bp.budget_mensuel_id = ?
    ORDER BY p.ordre, p.id
  `).all(id);

  const totalDepense = (produits as Array<{ montant_depense: number }>).reduce((sum, p) => sum + (p.montant_depense || 0), 0);
  const totalPrevu = (produits as Array<{ cout_prevu: number }>).reduce((sum, p) => sum + (p.cout_prevu || 0), 0);

  res.json({ budget, produits, total_depense: totalDepense, total_prevu: totalPrevu });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { mois, annee, budget_total_prevu, nombre_personnes, notes, statut } = req.body;

  db.prepare(`
    UPDATE budgets_mensuels SET
      mois = COALESCE(?, mois),
      annee = COALESCE(?, annee),
      budget_total_prevu = COALESCE(?, budget_total_prevu),
      nombre_personnes = COALESCE(?, nombre_personnes),
      notes = COALESCE(?, notes),
      statut = COALESCE(?, statut)
    WHERE id = ?
  `).run(mois ?? null, annee ?? null, budget_total_prevu ?? null, nombre_personnes ?? null, notes ?? null, statut ?? null, id);

  const updated = db.prepare("SELECT * FROM budgets_mensuels WHERE id = ?").get(id);
  res.json(updated);
});

router.put("/:id/produits", (req, res) => {
  const { id } = req.params;
  const { produits } = req.body as {
    produits: Array<{ produit_id: number; quantite_prevue?: number; cout_prevu?: number; prix_unitaire_ref?: number; notes?: string }>;
  };

  const upsert = db.prepare(`
    INSERT INTO budget_produits (budget_mensuel_id, produit_id, quantite_prevue, cout_prevu, prix_unitaire_ref, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(budget_mensuel_id, produit_id) DO UPDATE SET
      quantite_prevue = excluded.quantite_prevue,
      cout_prevu = excluded.cout_prevu,
      prix_unitaire_ref = excluded.prix_unitaire_ref,
      notes = excluded.notes
  `);

  const runAll = db.transaction(() => {
    for (const p of produits) {
      upsert.run(id, p.produit_id, p.quantite_prevue ?? null, p.cout_prevu ?? null, p.prix_unitaire_ref ?? null, p.notes ?? null);
    }
  });
  runAll();

  res.json({ success: true, message: "Updated" });
});

export default router;
