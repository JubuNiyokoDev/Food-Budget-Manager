import { Router } from "express";
import { db } from "../db/sqlite.js";

const router = Router();

router.get("/", (req, res) => {
  const { actif, categorie_id } = req.query;
  let query = `
    SELECT p.*,
      c.nom as categorie_nom,
      c.emoji as categorie_emoji,
      c.couleur as categorie_couleur
    FROM produits p
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (actif !== undefined) {
    query += " AND p.actif = ?";
    params.push(actif === "true" ? 1 : 0);
  }
  if (categorie_id) {
    query += " AND p.categorie_id = ?";
    params.push(categorie_id);
  }

  query += " ORDER BY p.ordre, p.id";
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

router.post("/", (req, res) => {
  const {
    code, nom, nom_local, categorie_id, emoji = "🛒",
    unite = "unité", frequence = "mensuel",
    quantite_prevue_mois = 1, prix_unitaire = 0,
    cout_mensuel_prevu = 0, notes, actif = 1, ordre = 0,
  } = req.body;

  if (!nom) return res.status(400).json({ success: false, message: "nom is required" });

  const slug = code || nom.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const result = db.prepare(`
    INSERT INTO produits
    (code, nom, nom_local, categorie_id, emoji, unite, frequence, quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu, notes, actif, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, nom, nom_local ?? null, categorie_id ?? null, emoji, unite, frequence,
    quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu, notes ?? null, actif, ordre);

  const row = db.prepare(`
    SELECT p.*, c.nom as categorie_nom, c.emoji as categorie_emoji, c.couleur as categorie_couleur
    FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM produits WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ success: false, message: "Not found" });

  const {
    nom, nom_local, categorie_id, emoji, unite, frequence,
    quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu,
    notes, actif, ordre,
  } = req.body;

  db.prepare(`
    UPDATE produits SET
      nom = COALESCE(?, nom),
      nom_local = COALESCE(?, nom_local),
      categorie_id = COALESCE(?, categorie_id),
      emoji = COALESCE(?, emoji),
      unite = COALESCE(?, unite),
      frequence = COALESCE(?, frequence),
      quantite_prevue_mois = COALESCE(?, quantite_prevue_mois),
      prix_unitaire = COALESCE(?, prix_unitaire),
      cout_mensuel_prevu = COALESCE(?, cout_mensuel_prevu),
      notes = COALESCE(?, notes),
      actif = COALESCE(?, actif),
      ordre = COALESCE(?, ordre),
      modifie_le = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    nom ?? null, nom_local ?? null, categorie_id ?? null, emoji ?? null,
    unite ?? null, frequence ?? null, quantite_prevue_mois ?? null,
    prix_unitaire ?? null, cout_mensuel_prevu ?? null, notes ?? null,
    actif ?? null, ordre ?? null, id
  );

  const updated = db.prepare(`
    SELECT p.*, c.nom as categorie_nom, c.emoji as categorie_emoji, c.couleur as categorie_couleur
    FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE p.id = ?
  `).get(id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM produits WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Deleted" });
});

export default router;
