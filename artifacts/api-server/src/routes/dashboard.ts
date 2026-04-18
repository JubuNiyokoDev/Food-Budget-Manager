import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/dashboard", (req, res) => {
  const { mois: queryMois } = req.query;
  const now = new Date();
  const mois = (queryMois as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [year, month] = mois.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = now.getDate();
  const joursRestants = month === now.getMonth() + 1 && year === now.getFullYear()
    ? daysInMonth - today
    : 0;

  const budget = db.prepare("SELECT * FROM budgets_mensuels WHERE mois = ? ORDER BY id DESC LIMIT 1").get(mois) as {
    id: number; budget_total_prevu: number;
  } | undefined;

  const budgetTotal = budget?.budget_total_prevu ?? 1291500;
  const budgetId = budget?.id ?? null;

  const totalDepenseRow = db.prepare(`
    SELECT COALESCE(SUM(prix_paye), 0) as total, COUNT(*) as count
    FROM achats
    WHERE strftime('%Y-%m', date_achat) = ?
  `).get(mois) as { total: number; count: number };

  const totalDepense = totalDepenseRow.total;
  const nombreAchats = totalDepenseRow.count;

  const joursPasses = Math.min(today, daysInMonth);
  const tauxJournalier = joursPasses > 0 ? totalDepense / joursPasses : 0;
  const projectionFinMois = totalDepense + (tauxJournalier * joursRestants);

  const evolutionRaw = db.prepare(`
    SELECT strftime('%d', date_achat) as jour_str,
           SUM(prix_paye) as montant
    FROM achats
    WHERE strftime('%Y-%m', date_achat) = ?
    GROUP BY strftime('%d', date_achat)
    ORDER BY jour_str
  `).all(mois) as Array<{ jour_str: string; montant: number }>;

  const evolutionMap = new Map<number, number>();
  for (const row of evolutionRaw) {
    evolutionMap.set(parseInt(row.jour_str, 10), row.montant);
  }

  const evolutionJournaliere = [];
  let cumule = 0;
  for (let j = 1; j <= daysInMonth; j++) {
    const montant = evolutionMap.get(j) || 0;
    cumule += montant;
    evolutionJournaliere.push({ jour: j, montant, cumule });
  }

  const topProduits = db.prepare(`
    SELECT a.produit_id,
      p.nom as produit_nom,
      p.emoji,
      SUM(a.prix_paye) as depense,
      COALESCE(bp.cout_prevu, p.cout_mensuel_prevu, 0) as budget_prevu
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN budget_produits bp ON bp.produit_id = a.produit_id AND bp.budget_mensuel_id = ?
    WHERE strftime('%Y-%m', a.date_achat) = ?
    GROUP BY a.produit_id
    ORDER BY depense DESC
    LIMIT 5
  `).all(budgetId, mois) as Array<{
    produit_id: number; produit_nom: string; emoji: string; depense: number; budget_prevu: number;
  }>;

  const topProduitsWithPct = topProduits.map(p => ({
    ...p,
    pourcentage: p.budget_prevu > 0 ? Math.round((p.depense / p.budget_prevu) * 100) : 0,
  }));

  const derniersAchats = db.prepare(`
    SELECT a.*,
      p.nom as produit_nom,
      p.emoji as produit_emoji,
      c.nom as categorie_nom,
      c.couleur as categorie_couleur,
      CASE WHEN a.quantite > 0 THEN ROUND(a.prix_paye / a.quantite, 2) ELSE 0 END as prix_par_unite
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE strftime('%Y-%m', a.date_achat) = ?
    ORDER BY a.date_achat DESC, a.id DESC
    LIMIT 5
  `).all(mois);

  const alertes = [];

  if (budgetId) {
    const depassements = db.prepare(`
      SELECT p.id, p.nom, SUM(a.prix_paye) as depense, bp.cout_prevu
      FROM produits p
      JOIN budget_produits bp ON bp.produit_id = p.id AND bp.budget_mensuel_id = ?
      LEFT JOIN achats a ON a.produit_id = p.id AND strftime('%Y-%m', a.date_achat) = ?
      WHERE bp.cout_prevu > 0
      GROUP BY p.id
      HAVING depense > bp.cout_prevu
    `).all(budgetId, mois) as Array<{ id: number; nom: string }>;

    for (const d of depassements) {
      alertes.push({ type: "warning", message: `Budget dépassé pour ${d.nom}`, produit_id: d.id, produit_nom: d.nom });
    }

    if (today > 10) {
      const nonCommences = db.prepare(`
        SELECT p.id, p.nom
        FROM produits p
        JOIN budget_produits bp ON bp.produit_id = p.id AND bp.budget_mensuel_id = ?
        WHERE p.actif = 1
          AND NOT EXISTS (
            SELECT 1 FROM achats a
            WHERE a.produit_id = p.id AND strftime('%Y-%m', a.date_achat) = ?
          )
        LIMIT 5
      `).all(budgetId, mois) as Array<{ id: number; nom: string }>;

      for (const p of nonCommences) {
        alertes.push({ type: "info", message: `Aucun achat enregistré pour ${p.nom}`, produit_id: p.id, produit_nom: p.nom });
      }
    }
  }

  if (totalDepense > budgetTotal) {
    alertes.unshift({ type: "error", message: "Le budget global du mois est dépassé !", produit_id: null, produit_nom: null });
  }

  res.json({
    kpi: {
      budget_total: budgetTotal,
      total_depense: totalDepense,
      restant: budgetTotal - totalDepense,
      projection_fin_mois: projectionFinMois,
      pourcentage_depense: budgetTotal > 0 ? Math.round((totalDepense / budgetTotal) * 100) : 0,
      jours_restants: joursRestants,
      nombre_achats: nombreAchats,
    },
    evolution_journaliere: evolutionJournaliere,
    top_produits: topProduitsWithPct,
    derniers_achats: derniersAchats,
    alertes,
    mois_actuel: mois,
    budget_id: budgetId,
  });
});

router.get("/statistiques", (req, res) => {
  const { mois: queryMois, periode: queryPeriode } = req.query;
  const now = new Date();
  const mois = (queryMois as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const moisCount = parseInt((queryPeriode as string) || "6", 10);

  const parProduit = db.prepare(`
    SELECT p.id as produit_id, p.nom as produit_nom, p.emoji,
      c.nom as categorie_nom,
      COALESCE(bp.cout_prevu, p.cout_mensuel_prevu, 0) as budget_prevu,
      COALESCE(SUM(a.prix_paye), 0) as total_depense,
      COUNT(a.id) as nombre_achats,
      CASE WHEN SUM(a.quantite) > 0 THEN ROUND(SUM(a.prix_paye) / SUM(a.quantite), 2) ELSE 0 END as prix_moyen_unite
    FROM produits p
    LEFT JOIN categories c ON p.categorie_id = c.id
    LEFT JOIN budgets_mensuels bm ON bm.mois = ?
    LEFT JOIN budget_produits bp ON bp.produit_id = p.id AND bp.budget_mensuel_id = bm.id
    LEFT JOIN achats a ON a.produit_id = p.id AND strftime('%Y-%m', a.date_achat) = ?
    WHERE p.actif = 1
    GROUP BY p.id
    ORDER BY total_depense DESC
  `).all(mois, mois) as Array<{
    produit_id: number; produit_nom: string; emoji: string; categorie_nom: string;
    budget_prevu: number; total_depense: number; nombre_achats: number; prix_moyen_unite: number;
  }>;

  const parProduitsWithEcart = parProduit.map(p => ({
    ...p,
    ecart: p.total_depense - p.budget_prevu,
    ecart_pct: p.budget_prevu > 0 ? Math.round(((p.total_depense - p.budget_prevu) / p.budget_prevu) * 100) : 0,
  }));

  const parCategorie = db.prepare(`
    SELECT c.nom as categorie_nom, c.couleur,
      COALESCE(SUM(a.prix_paye), 0) as montant
    FROM categories c
    LEFT JOIN produits p ON p.categorie_id = c.id
    LEFT JOIN achats a ON a.produit_id = p.id AND strftime('%Y-%m', a.date_achat) = ?
    GROUP BY c.id
    HAVING montant > 0
    ORDER BY montant DESC
  `).all(mois) as Array<{ categorie_nom: string; couleur: string; montant: number }>;

  const totalParCat = parCategorie.reduce((s, c) => s + c.montant, 0);
  const parCategorieWithPct = parCategorie.map(c => ({
    ...c,
    pourcentage: totalParCat > 0 ? Math.round((c.montant / totalParCat) * 100) : 0,
  }));

  const evolutionMensuelle = db.prepare(`
    SELECT bm.mois,
      COALESCE(SUM(a.prix_paye), 0) as total,
      bm.budget_total_prevu as budget
    FROM budgets_mensuels bm
    LEFT JOIN achats a ON strftime('%Y-%m', a.date_achat) = bm.mois
    WHERE bm.mois <= ?
    GROUP BY bm.mois
    ORDER BY bm.mois DESC
    LIMIT ?
  `).all(mois, moisCount) as Array<{ mois: string; total: number; budget: number }>;

  const heatmapJours = db.prepare(`
    SELECT date_achat as date, SUM(prix_paye) as montant
    FROM achats
    WHERE strftime('%Y-%m', date_achat) = ?
    GROUP BY date_achat
    ORDER BY date_achat
  `).all(mois) as Array<{ date: string; montant: number }>;

  res.json({
    par_produit: parProduitsWithEcart,
    par_categorie: parCategorieWithPct,
    evolution_mensuelle: evolutionMensuelle.reverse(),
    heatmap_jours: heatmapJours,
  });
});

export default router;
