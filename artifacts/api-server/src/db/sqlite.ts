import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "rundinova.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      cle TEXT PRIMARY KEY,
      valeur TEXT NOT NULL,
      description TEXT,
      modifie_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE,
      emoji TEXT DEFAULT 'Package',
      couleur TEXT DEFAULT '#6B7280',
      ordre INTEGER DEFAULT 0,
      actif BOOLEAN DEFAULT 1,
      cree_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      nom_local TEXT,
      categorie_id INTEGER REFERENCES categories(id),
      emoji TEXT DEFAULT 'ShoppingCart',
      unite TEXT NOT NULL DEFAULT 'unité',
      frequence TEXT DEFAULT 'mensuel',
      quantite_prevue_mois REAL DEFAULT 1,
      prix_unitaire REAL DEFAULT 0,
      cout_mensuel_prevu REAL DEFAULT 0,
      notes TEXT,
      actif BOOLEAN DEFAULT 1,
      ordre INTEGER DEFAULT 0,
      cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
      modifie_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets_mensuels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mois TEXT NOT NULL,
      annee INTEGER NOT NULL,
      budget_total_prevu REAL NOT NULL,
      nombre_personnes INTEGER DEFAULT 6,
      notes TEXT,
      statut TEXT DEFAULT 'actif',
      cree_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_produits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_mensuel_id INTEGER REFERENCES budgets_mensuels(id) ON DELETE CASCADE,
      produit_id INTEGER REFERENCES produits(id) ON DELETE CASCADE,
      quantite_prevue REAL,
      cout_prevu REAL,
      prix_unitaire_ref REAL,
      notes TEXT,
      UNIQUE(budget_mensuel_id, produit_id)
    );

    CREATE TABLE IF NOT EXISTS achats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_mensuel_id INTEGER REFERENCES budgets_mensuels(id),
      produit_id INTEGER REFERENCES produits(id),
      date_achat DATE NOT NULL,
      quantite REAL NOT NULL,
      prix_paye REAL NOT NULL,
      lieu_achat TEXT,
      notes TEXT,
      cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
      modifie_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rapports_historique (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      type TEXT NOT NULL,
      periode TEXT,
      chemin_fichier TEXT,
      format TEXT NOT NULL DEFAULT 'pdf',
      taille_octets INTEGER,
      genere_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backups_historique (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      destination TEXT,
      statut TEXT NOT NULL,
      message TEXT,
      effectue_le DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  runMigrations();
  seedInitialData();
}

function runMigrations() {
  const emojiToIcon: Record<string, string> = {
    "🌾": "Wheat", "🥔": "Leaf", "🥦": "Salad", "🫘": "Egg",
    "🥩": "Beef", "🧂": "Droplets", "📦": "Package", "🛒": "ShoppingCart",
    "🍚": "Utensils", "🍞": "Croissant", "🍝": "UtensilsCrossed",
    "🍌": "Banana", "🍠": "Leaf", "🍅": "Apple", "🥬": "Salad",
    "🌿": "Sprout", "🥕": "Carrot", "🧅": "Droplets", "🥒": "Leaf",
    "🍬": "Cookie",
  };

  const updateCat = db.prepare("UPDATE categories SET emoji = ? WHERE emoji = ?");
  const updateProd = db.prepare("UPDATE produits SET emoji = ? WHERE emoji = ?");

  const migrateAll = db.transaction(() => {
    for (const [emoji, icon] of Object.entries(emojiToIcon)) {
      updateCat.run(icon, emoji);
      updateProd.run(icon, emoji);
    }
  });
  migrateAll();
}

function seedInitialData() {
  const configCount = (db.prepare("SELECT COUNT(*) as count FROM config").get() as { count: number }).count;
  if (configCount > 0) return;

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO config (cle, valeur, description)
    VALUES (?, ?, ?)
  `);

  const configs = [
    ["app_nom", "Rundinova Budget Alimentaire", "Nom de l'application"],
    ["famille_nom", "Famille Rundinova", "Nom de la famille"],
    ["nombre_personnes", "6", "Nombre de personnes"],
    ["devise", "FBu", "Symbole monétaire"],
    ["pays", "Burundi", "Pays"],
    ["ville", "Bujumbura", "Ville"],
    ["langue", "fr", "Langue interface"],
    ["theme", "clair", "Thème visuel"],
    ["budget_mensuel_defaut", "1291500", "Budget mensuel de référence"],
    ["email_backup", "", "Email pour backup"],
    ["smtp_host", "", "Serveur SMTP"],
    ["smtp_port", "587", "Port SMTP"],
    ["smtp_user", "", "Utilisateur SMTP"],
    ["smtp_pass", "", "Mot de passe SMTP"],
    ["backup_auto", "false", "Backup automatique"],
    ["backup_frequence", "mensuel", "Fréquence backup auto"],
  ];

  const insertMany = db.transaction(() => {
    for (const [cle, valeur, description] of configs) {
      insertConfig.run(cle, valeur, description);
    }
  });
  insertMany();

  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (nom, emoji, couleur, ordre)
    VALUES (?, ?, ?, ?)
  `);

  const categories = [
    ["Céréales", "Wheat", "#F59E0B", 1],
    ["Féculents", "Leaf", "#D97706", 2],
    ["Légumes", "Salad", "#16A34A", 3],
    ["Protéines végétales", "Egg", "#7C3AED", 4],
    ["Protéines animales", "Beef", "#DC2626", 5],
    ["Condiments", "Droplets", "#0EA5E9", 6],
    ["Autres", "Package", "#6B7280", 7],
  ];

  const insertCats = db.transaction(() => {
    for (const [nom, emoji, couleur, ordre] of categories) {
      insertCat.run(nom, emoji, couleur, ordre);
    }
  });
  insertCats();

  const getCatId = db.prepare("SELECT id FROM categories WHERE nom = ?");

  const insertProduit = db.prepare(`
    INSERT OR IGNORE INTO produits
    (code, nom, nom_local, categorie_id, emoji, unite, frequence, quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu, ordre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const produits = [
    ["riz", "Riz", "Umuceri", "Céréales", "Utensils", "kg", "mensuel", 20, 9750, 195000, 1],
    ["pain", "Pain", "Uburodoka", "Céréales", "Croissant", "jour", "journalier", 30, 4000, 120000, 2],
    ["spaghetti", "Spaghetti", "Spaghetti", "Céréales", "UtensilsCrossed", "paquet", "mensuel", 3, 7000, 21000, 3],
    ["banane", "Banane plantain", "Igitoke", "Féculents", "Banana", "kg", "bi-mensuel", 24, 1000, 120000, 4],
    ["pomme_de_terre", "Pomme de terre", "Ikijumbu", "Féculents", "Leaf", "kg", "bi-mensuel", 30, 2000, 60000, 5],
    ["indore", "Patate douce", "Indore", "Féculents", "Leaf", "kg", "bi-mensuel", 30, 2000, 60000, 6],
    ["tomates", "Tomates", "Itomaati", "Légumes", "Apple", "lot", "mensuel", 1, 200000, 200000, 7],
    ["amahoro", "Légume Amahoro", "Amahoro", "Légumes", "Salad", "lot", "mensuel", 1, 60000, 60000, 8],
    ["amashu", "Amashu", "Amashu", "Légumes", "Sprout", "achat", "bi-mensuel", 15, 3000, 45000, 9],
    ["carottes", "Carottes", "Irengareepa", "Légumes", "Carrot", "achat", "bi-mensuel", 15, 3000, 45000, 10],
    ["oignons", "Oignons", "Ibitunguru", "Légumes", "Droplets", "kg", "bi-hebdo", 12, 5000, 60000, 11],
    ["ikarote", "Ikarote", "Ikarote", "Légumes", "Carrot", "unité", "mensuel", 1, 25000, 25000, 12],
    ["ibogaba", "Courge", "Ibogaba", "Légumes", "Leaf", "achat", "mensuel", 1, 3000, 3000, 13],
    ["haricot", "Haricot", "Ibiharage", "Protéines végétales", "Egg", "kg", "journalier", 45, 3100, 139500, 14],
    ["viande", "Viande", "Inyama", "Protéines animales", "Beef", "achat", "hebdomadaire", 4, 30000, 120000, 15],
    ["sel", "Sel", "Umunyu", "Condiments", "Droplets", "kg", "mensuel", 2, 7500, 15000, 16],
    ["sucre", "Sucre", "Isukari", "Condiments", "Cookie", "kg", "mensuel", 5, 600, 3000, 17],
  ];

  const insertProduits = db.transaction(() => {
    for (const [code, nom, nom_local, catNom, emoji, unite, frequence, qte, prix, cout, ordre] of produits) {
      const cat = getCatId.get(catNom) as { id: number } | undefined;
      if (cat) {
        insertProduit.run(code, nom, nom_local, cat.id, emoji, unite, frequence, qte, prix, cout, ordre);
      }
    }
  });
  insertProduits();

  const now = new Date();
  const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const annee = now.getFullYear();

  const existingBudget = db.prepare("SELECT id FROM budgets_mensuels WHERE mois = ?").get(mois) as { id: number } | undefined;
  if (!existingBudget) {
    const budgetResult = db.prepare(`
      INSERT INTO budgets_mensuels (mois, annee, budget_total_prevu, nombre_personnes, statut)
      VALUES (?, ?, 1291500, 6, 'actif')
    `).run(mois, annee);

    const budgetId = budgetResult.lastInsertRowid as number;

    const allProduits = db.prepare("SELECT id, cout_mensuel_prevu, prix_unitaire, quantite_prevue_mois FROM produits WHERE actif = 1").all() as Array<{
      id: number; cout_mensuel_prevu: number; prix_unitaire: number; quantite_prevue_mois: number;
    }>;

    const insertBP = db.prepare(`
      INSERT OR IGNORE INTO budget_produits (budget_mensuel_id, produit_id, quantite_prevue, cout_prevu, prix_unitaire_ref)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertBudgetProduits = db.transaction(() => {
      for (const p of allProduits) {
        insertBP.run(budgetId, p.id, p.quantite_prevue_mois, p.cout_mensuel_prevu, p.prix_unitaire);
      }
    });
    insertBudgetProduits();
  }
}
