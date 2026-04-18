import { Router } from "express";
import { db } from "../db/sqlite.js";
import nodemailer from "nodemailer";
import * as zlib from "zlib";

const router = Router();

function getConfig(cle: string): string {
  const row = db.prepare("SELECT valeur FROM config WHERE cle = ?").get(cle) as { valeur: string } | undefined;
  return row?.valeur ?? "";
}

router.get("/backup/export", (req, res) => {
  const { mois } = req.query;

  let achatsQuery = "SELECT * FROM achats ORDER BY date_achat DESC";
  const params: unknown[] = [];

  if (mois) {
    achatsQuery = "SELECT * FROM achats WHERE strftime('%Y-%m', date_achat) = ? ORDER BY date_achat DESC";
    params.push(mois);
  }

  const backup = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    mois: mois || "all",
    data: {
      config: db.prepare("SELECT * FROM config").all(),
      categories: db.prepare("SELECT * FROM categories").all(),
      produits: db.prepare("SELECT * FROM produits").all(),
      budgets: db.prepare("SELECT * FROM budgets_mensuels").all(),
      budget_produits: db.prepare("SELECT * FROM budget_produits").all(),
      achats: db.prepare(achatsQuery).all(...params),
    },
  };

  db.prepare("INSERT INTO backups_historique (type, destination, statut, message) VALUES (?, ?, ?, ?)").run(
    "fichier", "export", "succes", `Export ${mois || "complet"} réussi`
  );

  res.json(backup);
});

router.post("/backup/import", (req, res) => {
  const backup = req.body;

  if (!backup?.data) {
    return res.status(400).json({ success: false, message: "Invalid backup format" });
  }

  try {
    const { config, categories, produits, budgets, budget_produits, achats } = backup.data;

    const doImport = db.transaction(() => {
      if (Array.isArray(config)) {
        const upsertConfig = db.prepare("INSERT OR REPLACE INTO config (cle, valeur, description) VALUES (?, ?, ?)");
        for (const c of config as Array<{ cle: string; valeur: string; description: string }>) {
          upsertConfig.run(c.cle, c.valeur, c.description ?? null);
        }
      }

      if (Array.isArray(categories)) {
        const upsertCat = db.prepare("INSERT OR REPLACE INTO categories (id, nom, emoji, couleur, ordre, actif) VALUES (?, ?, ?, ?, ?, ?)");
        for (const c of categories as Array<Record<string, unknown>>) {
          upsertCat.run(c.id, c.nom, c.emoji, c.couleur, c.ordre, c.actif);
        }
      }

      if (Array.isArray(produits)) {
        const upsertProd = db.prepare(`
          INSERT OR REPLACE INTO produits
          (id, code, nom, nom_local, categorie_id, emoji, unite, frequence, quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu, notes, actif, ordre)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of produits as Array<Record<string, unknown>>) {
          upsertProd.run(p.id, p.code, p.nom, p.nom_local, p.categorie_id, p.emoji, p.unite, p.frequence, p.quantite_prevue_mois, p.prix_unitaire, p.cout_mensuel_prevu, p.notes, p.actif, p.ordre);
        }
      }

      if (Array.isArray(budgets)) {
        const upsertBudget = db.prepare(`
          INSERT OR REPLACE INTO budgets_mensuels (id, mois, annee, budget_total_prevu, nombre_personnes, notes, statut)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of budgets as Array<Record<string, unknown>>) {
          upsertBudget.run(b.id, b.mois, b.annee, b.budget_total_prevu, b.nombre_personnes, b.notes, b.statut);
        }
      }

      if (Array.isArray(budget_produits)) {
        const upsertBP = db.prepare(`
          INSERT OR REPLACE INTO budget_produits (id, budget_mensuel_id, produit_id, quantite_prevue, cout_prevu, prix_unitaire_ref, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const bp of budget_produits as Array<Record<string, unknown>>) {
          upsertBP.run(bp.id, bp.budget_mensuel_id, bp.produit_id, bp.quantite_prevue, bp.cout_prevu, bp.prix_unitaire_ref, bp.notes);
        }
      }

      if (Array.isArray(achats)) {
        const upsertAchat = db.prepare(`
          INSERT OR REPLACE INTO achats (id, budget_mensuel_id, produit_id, date_achat, quantite, prix_paye, lieu_achat, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of achats as Array<Record<string, unknown>>) {
          upsertAchat.run(a.id, a.budget_mensuel_id, a.produit_id, a.date_achat, a.quantite, a.prix_paye, a.lieu_achat, a.notes);
        }
      }
    });

    doImport();

    db.prepare("INSERT INTO backups_historique (type, destination, statut, message) VALUES (?, ?, ?, ?)").run(
      "import", "local", "succes", "Import réussi"
    );

    res.json({ success: true, message: "Import successful" });
  } catch (err) {
    db.prepare("INSERT INTO backups_historique (type, destination, statut, message) VALUES (?, ?, ?, ?)").run(
      "import", "local", "echec", String(err)
    );
    res.status(500).json({ success: false, message: String(err) });
  }
});

router.post("/backup/email", async (req, res) => {
  const { destinataire } = req.body as { destinataire: string };

  const smtpHost = getConfig("smtp_host");
  const smtpPort = parseInt(getConfig("smtp_port") || "587", 10);
  const smtpUser = getConfig("smtp_user");
  const smtpPass = getConfig("smtp_pass");

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ success: false, message: "SMTP configuration incomplete" });
  }

  try {
    const backup = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      data: {
        config: db.prepare("SELECT * FROM config").all(),
        categories: db.prepare("SELECT * FROM categories").all(),
        produits: db.prepare("SELECT * FROM produits").all(),
        budgets: db.prepare("SELECT * FROM budgets_mensuels").all(),
        budget_produits: db.prepare("SELECT * FROM budget_produits").all(),
        achats: db.prepare("SELECT * FROM achats ORDER BY date_achat DESC").all(),
      },
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr));

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const date = new Date().toLocaleDateString("fr-FR");
    await transporter.sendMail({
      from: smtpUser,
      to: destinataire,
      subject: `Rundinova Budget - Backup du ${date}`,
      text: `Veuillez trouver en pièce jointe le backup de vos données budgétaires du ${date}.`,
      attachments: [{
        filename: `rundinova_backup_${date.replace(/\//g, "-")}.rba`,
        content: compressed,
        contentType: "application/gzip",
      }],
    });

    db.prepare("INSERT INTO backups_historique (type, destination, statut, message) VALUES (?, ?, ?, ?)").run(
      "gmail", destinataire, "succes", `Email envoyé à ${destinataire}`
    );

    res.json({ success: true, message: `Backup envoyé à ${destinataire}` });
  } catch (err) {
    db.prepare("INSERT INTO backups_historique (type, destination, statut, message) VALUES (?, ?, ?, ?)").run(
      "gmail", destinataire, "echec", String(err)
    );
    res.status(500).json({ success: false, message: String(err) });
  }
});

router.post("/backup/test-smtp", async (req, res) => {
  const smtpHost = getConfig("smtp_host");
  const smtpPort = parseInt(getConfig("smtp_port") || "587", 10);
  const smtpUser = getConfig("smtp_user");
  const smtpPass = getConfig("smtp_pass");

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ success: false, message: "SMTP configuration incomplete" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.verify();
    res.json({ success: true, message: "SMTP connection successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

router.get("/backup/historique", (_req, res) => {
  const rows = db.prepare("SELECT * FROM backups_historique ORDER BY effectue_le DESC LIMIT 50").all();
  res.json(rows);
});

export default router;
