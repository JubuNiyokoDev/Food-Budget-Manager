import { Router } from "express";
import { db } from "../db/sqlite.js";
import * as XLSX from "xlsx";

const router = Router();

function formatFBu(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FBu";
}

function generateCSV(data: Record<string, unknown>[], keys: string[], headers: string[]): string {
  const BOM = "\uFEFF";
  const lines = [headers.join(";")];
  for (const row of data) {
    lines.push(keys.map(k => {
      const v = row[k];
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(";"));
  }
  return BOM + lines.join("\r\n");
}

function generateRapportMensuel(mois: string) {
  const budget = db.prepare("SELECT * FROM budgets_mensuels WHERE mois = ? ORDER BY id DESC LIMIT 1").get(mois) as Record<string, number> | undefined;

  const achats = db.prepare(`
    SELECT a.*, p.nom as produit_nom, p.emoji as produit_icon, c.nom as categorie_nom, c.couleur as categorie_couleur,
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
  const budgetTotal = (budget?.budget_total_prevu ?? 0) as number;
  const restant = budgetTotal - totalDepense;
  const pctConsomme = budgetTotal > 0 ? Math.round((totalDepense / budgetTotal) * 100) : 0;

  const parCategorie: Record<string, { total: number; count: number }> = {};
  for (const a of achats as Array<Record<string, unknown>>) {
    const cat = String(a.categorie_nom ?? "Autre");
    if (!parCategorie[cat]) parCategorie[cat] = { total: 0, count: 0 };
    parCategorie[cat].total += a.prix_paye as number;
    parCategorie[cat].count += 1;
  }

  const parJour: Record<string, number> = {};
  for (const a of achats as Array<Record<string, unknown>>) {
    const jour = String(a.date_achat).substring(0, 10);
    parJour[jour] = (parJour[jour] ?? 0) + (a.prix_paye as number);
  }

  return { budget, achats, totalDepense, mois, budgetTotal, restant, pctConsomme, parCategorie, parJour };
}

function generateHTMLRapport(data: ReturnType<typeof generateRapportMensuel>, titre: string): string {
  const { mois, achats, totalDepense, budgetTotal, restant, pctConsomme, parCategorie, parJour } = data;
  const dateGen = new Date().toLocaleDateString("fr-FR", { dateStyle: "full" });

  const rowsHTML = (achats as Array<Record<string, unknown>>).map((a, i) => `
    <tr class="${i % 2 === 0 ? "even" : "odd"}">
      <td>${a.date_achat}</td>
      <td>${a.produit_nom ?? "—"}</td>
      <td>${a.categorie_nom ?? "—"}</td>
      <td>${a.lieu_achat ?? "—"}</td>
      <td class="num">${a.quantite}</td>
      <td class="num amount">${formatFBu(a.prix_paye as number)}</td>
      <td>${a.notes ?? ""}</td>
    </tr>
  `).join("");

  const catRows = Object.entries(parCategorie).sort(([, a], [, b]) => b.total - a.total).map(([cat, v]) => {
    const pct = totalDepense > 0 ? Math.round((v.total / totalDepense) * 100) : 0;
    return `
      <tr>
        <td>${cat}</td>
        <td class="num">${v.count}</td>
        <td class="num amount">${formatFBu(v.total)}</td>
        <td class="num">${pct}%</td>
        <td><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div></td>
      </tr>
    `;
  }).join("");

  const jourRows = Object.entries(parJour).sort(([a], [b]) => a.localeCompare(b)).map(([jour, total]) => `
    <tr><td>${jour}</td><td class="num amount">${formatFBu(total)}</td></tr>
  `).join("");

  const moisLabel = new Date(mois + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const statusColor = pctConsomme >= 100 ? "#DC2626" : pctConsomme >= 80 ? "#D97706" : "#16A34A";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titre}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #f8fafc; }
  .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; border-radius: 16px; padding: 28px 32px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .header .subtitle { font-size: 13px; opacity: 0.85; margin-bottom: 4px; }
  .header .meta { font-size: 11px; opacity: 0.65; margin-top: 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .kpi-card { background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border-left: 4px solid transparent; }
  .kpi-card.blue { border-color: #2563eb; }
  .kpi-card.green { border-color: #16a34a; }
  .kpi-card.orange { border-color: #d97706; }
  .kpi-card.status { border-color: ${statusColor}; }
  .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px; }
  .kpi-value { font-size: 17px; font-weight: 700; color: #111827; }
  .kpi-sub { font-size: 10px; color: #9ca3af; margin-top: 3px; }
  .progress-bar { background: #e5e7eb; border-radius: 99px; height: 6px; margin-top: 8px; }
  .progress-fill { height: 100%; border-radius: 99px; background: ${statusColor}; width: ${Math.min(pctConsomme, 100)}%; }
  section { background: white; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 20px; overflow: hidden; }
  .section-header { padding: 14px 20px; background: #f1f5f9; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  td { padding: 9px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr.even td { background: white; }
  tr.odd td { background: #fafbfc; }
  tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .amount { font-weight: 600; color: #1e3a5f; }
  .bar-bg { background: #e5e7eb; border-radius: 99px; height: 6px; min-width: 80px; }
  .bar-fill { height: 100%; border-radius: 99px; background: #2563eb; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; padding: 16px; margin-top: 8px; }
  @media print {
    body { background: white; }
    .page { padding: 16px; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; break-inside: avoid; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${titre}</h1>
    <div class="subtitle">Période : <strong style="text-transform:capitalize">${moisLabel}</strong></div>
    <div class="subtitle">Famille Rundinova — Bujumbura, Burundi</div>
    <div class="meta">Rapport généré le ${dateGen} · ${achats.length} achat(s)</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card blue">
      <div class="kpi-label">Budget prévu</div>
      <div class="kpi-value">${formatFBu(budgetTotal)}</div>
      <div class="kpi-sub">Budget mensuel alloué</div>
    </div>
    <div class="kpi-card orange">
      <div class="kpi-label">Total dépensé</div>
      <div class="kpi-value">${formatFBu(totalDepense)}</div>
      <div class="kpi-sub">${achats.length} transaction(s)</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Restant</div>
      <div class="kpi-value" style="color:${restant >= 0 ? "#16a34a" : "#dc2626"}">${formatFBu(Math.abs(restant))}${restant < 0 ? " (dépassé)" : ""}</div>
      <div class="kpi-sub">${restant >= 0 ? "Disponible" : "Dépassement"}</div>
    </div>
    <div class="kpi-card status">
      <div class="kpi-label">Consommation</div>
      <div class="kpi-value" style="color:${statusColor}">${pctConsomme}%</div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
    </div>
  </div>

  ${Object.keys(parCategorie).length > 0 ? `
  <section>
    <div class="section-header">Répartition par catégorie</div>
    <table>
      <thead><tr>
        <th>Catégorie</th>
        <th class="num">Achats</th>
        <th class="num">Total dépensé</th>
        <th class="num">Part</th>
        <th>Répartition</th>
      </tr></thead>
      <tbody>${catRows}</tbody>
    </table>
  </section>` : ""}

  ${Object.keys(parJour).length > 0 ? `
  <section>
    <div class="section-header">Dépenses journalières</div>
    <table>
      <thead><tr><th>Date</th><th class="num">Montant</th></tr></thead>
      <tbody>${jourRows}</tbody>
    </table>
  </section>` : ""}

  ${achats.length > 0 ? `
  <section>
    <div class="section-header">Détail des achats (${achats.length})</div>
    <table>
      <thead><tr>
        <th>Date</th>
        <th>Produit</th>
        <th>Catégorie</th>
        <th>Lieu</th>
        <th class="num">Qté</th>
        <th class="num">Montant</th>
        <th>Notes</th>
      </tr></thead>
      <tbody>${rowsHTML}</tbody>
      <tfoot>
        <tr style="background:#f1f5f9">
          <td colspan="5" style="font-weight:700;padding:10px 14px">TOTAL</td>
          <td class="num amount" style="padding:10px 14px;font-weight:700">${formatFBu(totalDepense)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </section>` : `<section><div style="padding:32px;text-align:center;color:#9ca3af">Aucun achat enregistré pour cette période.</div></section>`}

  <div class="footer">Rundinova Budget Alimentaire · Rapport confidentiel · ${dateGen}</div>
</div>
</body>
</html>`;
}

router.post("/rapports/generer", async (req, res) => {
  try {
    const body = req.body as Record<string, string | undefined>;
    const periodeEffective = body.periode || body.mois;
    if (!periodeEffective) {
      return res.status(400).json({ success: false, message: "Le champ 'mois' est requis (format YYYY-MM)." });
    }

    const formatEffectif = body.format || "json";
    const moisLabel = new Date(periodeEffective + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const titreEffectif = body.titre || `Rapport mensuel — ${moisLabel}`;

    const data = generateRapportMensuel(periodeEffective);

    let contenuBase64 = "";
    let nomFichier = "";

    if (formatEffectif === "pdf") {
      const html = generateHTMLRapport(data, titreEffectif);
      contenuBase64 = Buffer.from(html, "utf-8").toString("base64");
      nomFichier = `rapport_${periodeEffective}.html`;

    } else if (formatEffectif === "csv") {
      const keys = ["date_achat", "produit_nom", "categorie_nom", "lieu_achat", "quantite", "prix_paye", "notes"];
      const headers = ["Date", "Produit", "Catégorie", "Lieu d'achat", "Quantité", "Prix payé (FBu)", "Notes"];
      const rows = (data.achats as Array<Record<string, unknown>>).map(a => ({
        date_achat: a.date_achat as string,
        produit_nom: a.produit_nom as string,
        categorie_nom: a.categorie_nom as string,
        lieu_achat: a.lieu_achat as string,
        quantite: a.quantite as number,
        prix_paye: a.prix_paye as number,
        notes: a.notes as string,
      }));
      contenuBase64 = Buffer.from(generateCSV(rows, keys, headers), "utf-8").toString("base64");
      nomFichier = `rapport_${periodeEffective}.csv`;

    } else if (formatEffectif === "excel") {
      const wb = XLSX.utils.book_new();

      const resumeData = [
        ["RAPPORT MENSUEL — RUNDINOVA BUDGET ALIMENTAIRE"],
        [],
        ["Période", moisLabel],
        ["Date de génération", new Date().toLocaleDateString("fr-FR")],
        ["Budget prévu (FBu)", data.budgetTotal],
        ["Total dépensé (FBu)", data.totalDepense],
        ["Restant (FBu)", data.restant],
        ["Consommation (%)", data.pctConsomme],
        ["Nombre d'achats", data.achats.length],
      ];
      const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
      wsResume["!cols"] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResume, "Résumé");

      const achatsData = [
        ["Date", "Produit", "Catégorie", "Lieu d'achat", "Quantité", "Prix payé (FBu)", "Notes"],
        ...(data.achats as Array<Record<string, unknown>>).map(a => [
          a.date_achat, a.produit_nom, a.categorie_nom, a.lieu_achat,
          a.quantite, a.prix_paye, a.notes,
        ]),
        [],
        ["", "", "", "", "TOTAL (FBu)", data.totalDepense, ""],
      ];
      const wsAchats = XLSX.utils.aoa_to_sheet(achatsData);
      wsAchats["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsAchats, "Achats");

      const catEntries = Object.entries(data.parCategorie).sort(([, a], [, b]) => b.total - a.total);
      const catData = [
        ["Catégorie", "Nombre d'achats", "Total dépensé (FBu)", "Part (%)"],
        ...catEntries.map(([cat, v]) => [
          cat, v.count, v.total,
          data.totalDepense > 0 ? Math.round((v.total / data.totalDepense) * 100) : 0,
        ]),
      ];
      const wsCat = XLSX.utils.aoa_to_sheet(catData);
      wsCat["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsCat, "Par catégorie");

      const jourEntries = Object.entries(data.parJour).sort(([a], [b]) => a.localeCompare(b));
      const jourData = [
        ["Date", "Total dépensé (FBu)"],
        ...jourEntries.map(([jour, total]) => [jour, total]),
      ];
      const wsJour = XLSX.utils.aoa_to_sheet(jourData);
      wsJour["!cols"] = [{ wch: 14 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsJour, "Par jour");

      contenuBase64 = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })).toString("base64");
      nomFichier = `rapport_${periodeEffective}.xlsx`;

    } else {
      const jsonData = {
        meta: {
          titre: titreEffectif,
          periode: periodeEffective,
          mois_label: moisLabel,
          genere_le: new Date().toISOString(),
          application: "Rundinova Budget Alimentaire",
        },
        kpi: {
          budget_total: data.budgetTotal,
          total_depense: data.totalDepense,
          restant: data.restant,
          pct_consomme: data.pctConsomme,
          nombre_achats: data.achats.length,
        },
        par_categorie: data.parCategorie,
        par_jour: data.parJour,
        achats: data.achats,
      };
      contenuBase64 = Buffer.from(JSON.stringify(jsonData, null, 2), "utf-8").toString("base64");
      nomFichier = `rapport_${periodeEffective}.json`;
    }

    const taille = Buffer.from(contenuBase64, "base64").length;
    const result = db.prepare(`
      INSERT INTO rapports_historique (titre, type, periode, format, taille_octets)
      VALUES (?, ?, ?, ?, ?)
    `).run(titreEffectif, "mensuel", periodeEffective, formatEffectif, taille);

    return res.json({
      success: true,
      rapport_id: result.lastInsertRowid,
      nom_fichier: nomFichier,
      contenu_base64: contenuBase64,
      format: formatEffectif,
      titre: titreEffectif,
      kpi: {
        budget_total: data.budgetTotal,
        total_depense: data.totalDepense,
        restant: data.restant,
        pct_consomme: data.pctConsomme,
        nombre_achats: data.achats.length,
        nombre_categories: Object.keys(data.parCategorie).length,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, message: `Erreur lors de la génération : ${message}` });
  }
});

router.get("/rapports/historique", (_req, res) => {
  const rows = db.prepare("SELECT * FROM rapports_historique ORDER BY genere_le DESC LIMIT 50").all();
  res.json(rows);
});

export default router;
