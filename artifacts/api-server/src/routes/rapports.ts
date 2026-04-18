import { Router } from "express";
import { db } from "../db/sqlite.js";
import * as XLSX from "xlsx";

const router = Router();

function formatFBu(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/,/g, " ") + " FBu";
}

function generateCSV(data: Record<string, unknown>[], headers: string[]): string {
  const lines = [headers.join(";")];
  for (const row of data) {
    lines.push(headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(";"));
  }
  return lines.join("\n");
}

function generateRapportMensuel(mois: string) {
  const budget = db.prepare("SELECT * FROM budgets_mensuels WHERE mois = ? ORDER BY id DESC LIMIT 1").get(mois) as Record<string, number> | undefined;

  const achats = db.prepare(`
    SELECT a.*, p.nom as produit_nom, p.emoji, c.nom as categorie_nom,
      bp.cout_prevu as budget_prevu_produit
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    LEFT JOIN budgets_mensuels bm ON bm.mois = ?
    LEFT JOIN budget_produits bp ON bp.produit_id = a.produit_id AND bp.budget_mensuel_id = bm.id
    WHERE strftime('%Y-%m', a.date_achat) = ?
    ORDER BY a.date_achat, p.nom
  `).all(mois, mois) as Array<Record<string, unknown>>;

  const totalDepense = (achats as Array<{ prix_paye: number }>).reduce((s, a) => s + a.prix_paye, 0);

  return { budget, achats, totalDepense, mois };
}

router.post("/rapports/generer", async (req, res) => {
  try {
    const body = req.body as Record<string, string | undefined>;

    const periodeEffective = body.periode || body.mois;
    if (!periodeEffective) {
      return res.status(400).json({ success: false, message: "Le champ 'mois' est requis (format YYYY-MM)." });
    }

    const typeEffectif = body.type || "mensuel";
    const formatEffectif = body.format || "json";
    const titreEffectif = body.titre || `Rapport ${typeEffectif} — ${periodeEffective}`;

    const data = generateRapportMensuel(periodeEffective);

    let contenuBase64 = "";
    let nomFichier = "";

    if (formatEffectif === "json") {
      contenuBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
      nomFichier = `rapport_${periodeEffective}.json`;

    } else if (formatEffectif === "csv") {
      const rows = (data.achats as Array<Record<string, unknown>>).map(a => ({
        date: a.date_achat as string,
        produit: a.produit_nom as string,
        categorie: a.categorie_nom as string,
        lieu: a.lieu_achat as string,
        quantite: a.quantite as number,
        prix_paye: a.prix_paye as number,
        notes: a.notes as string,
      }));
      contenuBase64 = Buffer.from(generateCSV(rows, ["date", "produit", "categorie", "lieu", "quantite", "prix_paye", "notes"])).toString("base64");
      nomFichier = `rapport_${periodeEffective}.csv`;

    } else if (formatEffectif === "excel") {
      const wsData = [
        ["Date", "Produit", "Catégorie", "Lieu", "Quantité", "Prix payé (FBu)", "Notes"],
        ...(data.achats as Array<Record<string, unknown>>).map(a => [
          a.date_achat, a.produit_nom, a.categorie_nom, a.lieu_achat,
          a.quantite, a.prix_paye, a.notes,
        ]),
        [],
        ["", "", "", "", "TOTAL", data.totalDepense, ""],
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Achats");
      const summaryData = [
        ["Rapport Mensuel Complet"],
        ["Période", periodeEffective],
        ["Budget prévu", data.budget?.budget_total_prevu ?? "N/A"],
        ["Total dépensé", data.totalDepense],
        ["Restant", (data.budget?.budget_total_prevu ?? 0) - data.totalDepense],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Résumé");
      contenuBase64 = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })).toString("base64");
      nomFichier = `rapport_${periodeEffective}.xlsx`;

    } else {
      const lines = [
        `RAPPORT MENSUEL — ${periodeEffective}`,
        "=".repeat(50),
        `Budget prévu  : ${formatFBu(data.budget?.budget_total_prevu ?? 0)}`,
        `Total dépensé : ${formatFBu(data.totalDepense)}`,
        `Restant       : ${formatFBu((data.budget?.budget_total_prevu ?? 0) - data.totalDepense)}`,
        "",
        "DÉTAIL DES ACHATS",
        "-".repeat(50),
        ...(data.achats as Array<Record<string, unknown>>).map(a =>
          `${a.date_achat} | ${a.produit_nom} | ${formatFBu(a.prix_paye as number)}`
        ),
        "",
        `TOTAL : ${formatFBu(data.totalDepense)}`,
      ];
      contenuBase64 = Buffer.from(lines.join("\n")).toString("base64");
      nomFichier = `rapport_${periodeEffective}.txt`;
    }

    const taille = Buffer.from(contenuBase64, "base64").length;
    const result = db.prepare(`
      INSERT INTO rapports_historique (titre, type, periode, format, taille_octets)
      VALUES (?, ?, ?, ?, ?)
    `).run(titreEffectif, typeEffectif, periodeEffective, formatEffectif, taille);

    return res.json({
      success: true,
      rapport_id: result.lastInsertRowid,
      nom_fichier: nomFichier,
      contenu_base64: contenuBase64,
      format: formatEffectif,
      titre: titreEffectif,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, message: `Erreur lors de la génération : ${message}` });
  }
});

router.get("/rapports/historique", (_req, res) => {
  const rows = db.prepare("SELECT * FROM rapports_historique ORDER BY genere_le DESC").all();
  res.json(rows);
});

export default router;
