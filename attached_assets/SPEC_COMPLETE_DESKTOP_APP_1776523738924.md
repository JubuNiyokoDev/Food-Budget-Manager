# 🏠 RUNDINOVA BUDGET ALIMENTAIRE
## Spécification Complète — Application Desktop Locale Hors-ligne
### Document à donner à un agent IA (Bolt, Lovable, v0, etc.)

---

> **IMPORTANT POUR L'AGENT :** Lis TOUT ce document avant d'écrire la moindre ligne de code. Cette spec est la source de vérité absolue. Ne fais aucune hypothèse — tout est défini ici.

---

## 🎯 RÉSUMÉ DU PROJET

Construis une **application desktop complète** de gestion de budget alimentaire mensuel pour la famille Rundinova (6 personnes, Bujumbura, Burundi).

**Contraintes absolues :**
- 🔴 **100% hors-ligne** — aucune connexion internet requise pour fonctionner
- 🔴 **Application desktop** — tourne sur Windows, Linux, macOS
- 🔴 **Zéro hébergement** — pas de serveur, pas de cloud requis
- 🟢 **Backup optionnel** vers Gmail, Outlook, Teams (uniquement quand l'utilisateur le demande)
- 🟢 **Import/Export** de données pour partage entre machines
- 🟢 **CMS intégré** — tout est modifiable sans toucher au code
- 🟢 **Rapports professionnels** en PDF, Excel, CSV, JSON
- 🟢 **Graphiques et tableaux de bord** complets

---

## 🔧 TECHNOLOGIE CHOISIE : ELECTRON + REACT

### Pourquoi Electron ?
- Crée de vraies applications desktop (.exe Windows, .AppImage Linux, .dmg macOS)
- Fonctionne 100% hors-ligne
- Accès au système de fichiers local (pour sauvegardes, exports)
- Compatible avec toutes les librairies React/JS
- Peut envoyer des emails via SMTP (Gmail, Outlook) sans navigateur

### Stack complète :
```
Framework Desktop : Electron 28+
Frontend : React 18 + TypeScript
Style : Tailwind CSS + shadcn/ui
Graphiques : Recharts + Chart.js
Base de données locale : SQLite (via better-sqlite3)
Rapports PDF : jsPDF + jspdf-autotable
Rapports Excel : xlsx (SheetJS)
Email backup : nodemailer (SMTP)
Gestion état : Zustand
Navigation : React Router
Icônes : Lucide React
Dates : date-fns
Build : electron-builder (génère .exe, .AppImage, .dmg)
```

### Structure du projet :
```
rundinova-budget/
├── electron/
│   ├── main.js              ← Processus principal Electron
│   ├── preload.js           ← Bridge sécurisé main↔renderer
│   └── ipc/
│       ├── database.js      ← Opérations SQLite
│       ├── export.js        ← Export PDF/Excel/CSV
│       ├── email.js         ← Envoi backup par email
│       └── backup.js        ← Import/Export fichiers
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Produits.tsx
│   │   ├── Achats.tsx
│   │   ├── Historique.tsx
│   │   ├── Rapports.tsx
│   │   ├── Statistiques.tsx
│   │   └── Parametres.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── cms/
│   │   │   ├── ProduitEditor.tsx
│   │   │   ├── CategorieEditor.tsx
│   │   │   ├── BudgetEditor.tsx
│   │   │   └── ParametresEditor.tsx
│   │   ├── charts/
│   │   │   ├── EvolutionChart.tsx
│   │   │   ├── RepartitionChart.tsx
│   │   │   ├── ComparaisonChart.tsx
│   │   │   └── TendanceChart.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── MoneyBadge.tsx
│   │       ├── ProgressBar.tsx
│   │       └── AlertBanner.tsx
│   ├── hooks/
│   │   ├── useDatabase.ts
│   │   ├── useExport.ts
│   │   └── useBackup.ts
│   └── store/
│       └── index.ts         ← Zustand store
├── package.json
└── electron-builder.yml     ← Config build multi-OS
```

---

## 🗄️ BASE DE DONNÉES SQLite

### Schéma complet :

```sql
-- Configuration générale de l'application
CREATE TABLE config (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  description TEXT,
  modifie_le DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Catégories de produits (CMS)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '📦',
  couleur TEXT DEFAULT '#6B7280',
  ordre INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT 1,
  cree_le DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produits alimentaires (CMS complet)
CREATE TABLE produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  nom_local TEXT,
  categorie_id INTEGER REFERENCES categories(id),
  emoji TEXT DEFAULT '🛒',
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

-- Budgets mensuels (un enregistrement par mois)
CREATE TABLE budgets_mensuels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mois TEXT NOT NULL,              -- Format : "2026-04"
  annee INTEGER NOT NULL,
  budget_total_prevu REAL NOT NULL,
  nombre_personnes INTEGER DEFAULT 6,
  notes TEXT,
  statut TEXT DEFAULT 'actif',    -- actif | archive | brouillon
  cree_le DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Budget par produit par mois (CMS)
CREATE TABLE budget_produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_mensuel_id INTEGER REFERENCES budgets_mensuels(id),
  produit_id INTEGER REFERENCES produits(id),
  quantite_prevue REAL,
  cout_prevu REAL,
  prix_unitaire_ref REAL,
  notes TEXT,
  UNIQUE(budget_mensuel_id, produit_id)
);

-- Achats enregistrés
CREATE TABLE achats (
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

-- Historique des rapports générés
CREATE TABLE rapports_historique (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  type TEXT NOT NULL,             -- pdf | excel | csv | json
  periode TEXT,
  chemin_fichier TEXT,
  taille_octets INTEGER,
  genere_le DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historique des backups
CREATE TABLE backups_historique (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,             -- fichier | gmail | outlook | teams
  destination TEXT,
  statut TEXT NOT NULL,           -- succes | echec
  message TEXT,
  effectue_le DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Données initiales à insérer :

```sql
-- Config par défaut
INSERT INTO config VALUES ('app_nom', 'Rundinova Budget Alimentaire', 'Nom de l''application', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('famille_nom', 'Famille Rundinova', 'Nom de la famille', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('nombre_personnes', '6', 'Nombre de personnes', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('devise', 'FBu', 'Symbole monétaire', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('pays', 'Burundi', 'Pays', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('ville', 'Bujumbura', 'Ville', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('langue', 'fr', 'Langue interface', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('theme', 'clair', 'Thème visuel', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('budget_mensuel_defaut', '1291500', 'Budget mensuel de référence', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('email_backup', '', 'Email pour backup', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('smtp_host', '', 'Serveur SMTP', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('smtp_port', '587', 'Port SMTP', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('smtp_user', '', 'Utilisateur SMTP', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('smtp_pass', '', 'Mot de passe SMTP (chiffré)', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('backup_auto', 'false', 'Backup automatique', CURRENT_TIMESTAMP);
INSERT INTO config VALUES ('backup_frequence', 'mensuel', 'Fréquence backup auto', CURRENT_TIMESTAMP);

-- Catégories
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Céréales', '🌾', '#F59E0B', 1);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Féculents', '🥔', '#D97706', 2);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Légumes', '🥦', '#16A34A', 3);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Protéines végétales', '🫘', '#7C3AED', 4);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Protéines animales', '🥩', '#DC2626', 5);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Condiments', '🧂', '#0EA5E9', 6);
INSERT INTO categories (nom, emoji, couleur, ordre) VALUES ('Autres', '📦', '#6B7280', 7);

-- Produits (17 produits famille Rundinova)
INSERT INTO produits (code, nom, nom_local, categorie_id, emoji, unite, frequence, quantite_prevue_mois, prix_unitaire, cout_mensuel_prevu, ordre)
VALUES
('riz', 'Riz', 'Umuceri', 1, '🍚', 'kg', 'mensuel', 20, 9750, 195000, 1),
('pain', 'Pain', 'Uburodoka', 1, '🍞', 'jour', 'journalier', 30, 4000, 120000, 2),
('spaghetti', 'Spaghetti', 'Spaghetti', 1, '🍝', 'paquet', 'mensuel', 3, 7000, 21000, 3),
('banane', 'Banane plantain', 'Igitoke', 2, '🍌', 'kg', 'bi-mensuel', 24, 1000, 120000, 4),
('pomme_de_terre', 'Pomme de terre', 'Ikijumbu', 2, '🥔', 'kg', 'bi-mensuel', 30, 2000, 60000, 5),
('indore', 'Patate douce', 'Indore', 2, '🍠', 'kg', 'bi-mensuel', 30, 2000, 60000, 6),
('tomates', 'Tomates', 'Itomaati', 3, '🍅', 'lot', 'mensuel', 1, 200000, 200000, 7),
('amahoro', 'Légume Amahoro', 'Amahoro', 3, '🥬', 'lot', 'mensuel', 1, 60000, 60000, 8),
('amashu', 'Amashu', 'Amashu', 3, '🌿', 'achat', 'bi-mensuel', 15, 3000, 45000, 9),
('carottes', 'Carottes', 'Irengareepa', 3, '🥕', 'achat', 'bi-mensuel', 15, 3000, 45000, 10),
('oignons', 'Oignons', 'Ibitunguru', 3, '🧅', 'kg', 'bi-hebdo', 12, 5000, 60000, 11),
('ikarote', 'Ikarote', 'Ikarote', 3, '🥕', 'unité', 'mensuel', 1, 25000, 25000, 12),
('ibogaba', 'Courge', 'Ibogaba', 3, '🥒', 'achat', 'mensuel', 1, 3000, 3000, 13),
('haricot', 'Haricot', 'Ibiharage', 4, '🫘', 'kg', 'journalier', 45, 3100, 139500, 14),
('viande', 'Viande', 'Inyama', 5, '🥩', 'achat', 'hebdomadaire', 4, 30000, 120000, 15),
('sel', 'Sel', 'Umunyu', 6, '🧂', 'kg', 'mensuel', 2, 7500, 15000, 16),
('sucre', 'Sucre', 'Isukari', 6, '🍬', 'kg', 'mensuel', 5, 600, 3000, 17);
```

---

## 📱 INTERFACE UTILISATEUR — PAGES COMPLÈTES

### LAYOUT GÉNÉRAL
- **Sidebar gauche** fixe (240px) avec navigation verticale
- **Header** en haut avec : mois actuel | budget restant | indicateur connexion | bouton backup
- **Zone contenu** principale à droite (scrollable)
- **Status bar** en bas : dernière sauvegarde | version | nombre d'achats ce mois
- **Thème** : clair par défaut, sombre disponible (toggle dans paramètres)

### SIDEBAR navigation :
```
🏠 Dashboard
🛒 Produits
➕ Nouvel Achat
📅 Historique des Achats
📊 Statistiques
📄 Rapports
⚙️ Paramètres CMS
   ├── Produits & Catégories
   ├── Budgets Mensuels
   ├── Configuration Générale
   └── Backup & Synchronisation
```

---

### PAGE 1 : 🏠 DASHBOARD

#### Zone 1 — KPI Cards (4 cartes en grille 2×2)
```
┌─────────────────────┐  ┌─────────────────────┐
│ 💰 BUDGET TOTAL     │  │ 🟢 DÉPENSÉ À CE JOUR│
│ 1 291 500 FBu       │  │ XXX XXX FBu         │
│ Avril 2026          │  │ XX% du budget       │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐
│ 💵 RESTANT          │  │ 📈 PROJECTION       │
│ XXX XXX FBu         │  │ XXX XXX FBu         │
│ XX jours restants   │  │ fin de mois estimée │
└─────────────────────┘  └─────────────────────┘
```

#### Zone 2 — Barre de progression globale
```
Budget consommé : ████████████░░░░░░░░ 62% (800 000 / 1 291 500 FBu)
Couleur : vert (0-60%) → orange (60-85%) → rouge (85%+)
```

#### Zone 3 — Graphique évolution (mini LineChart)
- Courbe des dépenses cumulées jour par jour
- Ligne pointillée = budget total
- Projection en pointillés orange si tendance dépasse le budget

#### Zone 4 — Top 5 produits les plus dépensés ce mois
Tableau compact : emoji | produit | dépensé | % du budget produit | statut

#### Zone 5 — Derniers achats (5 derniers)
Liste avec : date | produit | quantité | montant | bouton voir détail

#### Zone 6 — Alertes
- ⚠️ Produits dépassant 100% de leur budget
- ℹ️ Produits à 0% (pas encore achetés) après le 10 du mois
- 🔴 Budget global dépassé

---

### PAGE 2 : 🛒 PRODUITS (CMS Produits)

#### Barre d'actions :
```
[🔍 Rechercher...] [Catégorie ▼] [Statut ▼] [+ Nouveau Produit] [⚙️ Gérer Catégories]
```

#### Tableau des produits (colonnes) :
| Colonne | Description |
|---------|-------------|
| # | Ordre/rang |
| Emoji + Nom | Avec nom local en dessous en italique gris |
| Catégorie | Badge coloré |
| Fréquence | Journalier / Bi-mensuel / Mensuel / Hebdo |
| Quantité prévue | XX kg / mois |
| Prix unitaire | X XXX FBu |
| Budget mensuel prévu | XX XXX FBu |
| Dépensé ce mois | XX XXX FBu |
| Progression | Barre colorée + % |
| Statut | ✅ OK / ⚠️ Partiel / 🔴 Dépassé / ⬜ Pas commencé |
| Actions | ✏️ Modifier | ➕ Achat | 🗑️ Supprimer |

#### Modal "Modifier Produit" (CMS) :
Formulaire complet :
- Code (slug unique, non modifiable après création)
- Nom français
- Nom local (Kirundi)
- Catégorie (liste déroulante)
- Emoji (picker ou saisie)
- Unité (kg, litre, paquet, lot, achat, jour, unité)
- Fréquence d'achat (journalier, bi-hebdo, hebdo, bi-mensuel, mensuel)
- Quantité prévue par mois
- Prix unitaire de référence (FBu)
- Coût mensuel prévu (calculé auto ou saisi manuellement)
- Notes
- Actif / Inactif (toggle)

---

### PAGE 3 : ➕ NOUVEL ACHAT

Formulaire grand et clair :

```
┌──────────────────────────────────────────────────────┐
│  ENREGISTRER UN ACHAT                                │
│                                                      │
│  Produit *         [🍚 Riz (Umuceri)          ▼]    │
│  Date *            [📅 18 Avril 2026          ]     │
│  Lieu d'achat      [Marché central...         ]     │
│  Quantité *        [  10  ] kg                      │
│  Prix payé *       [97 500] FBu                     │
│  Prix/unité (auto) [9 750 FBu/kg]                   │
│  Notes             [Achat habituel du 1er...  ]     │
│                                                      │
│  📊 Après cet achat :                               │
│  Riz : 10/20 kg achetés ce mois (50%)               │
│  Budget riz : 97 500 / 195 000 FBu (50%)            │
│                                                      │
│            [Annuler]  [✅ Enregistrer]              │
└──────────────────────────────────────────────────────┘
```

**Validation :**
- Tous les champs marqués * sont obligatoires
- Avertissement si prix/unité très différent du prix de référence (±30%)
- Confirmation si le produit dépasse 100% après cet achat

---

### PAGE 4 : 📅 HISTORIQUE DES ACHATS

#### Filtres :
```
[Mois : Avril 2026 ◀▶] [Produit ▼] [Catégorie ▼] [Lieu ▼] [🔍 Rechercher]
```

#### Tableau historique (colonnes) :
| Date | Produit | Catégorie | Lieu | Quantité | Prix/unité | Prix total | Notes | Actions |
|------|---------|-----------|------|----------|------------|------------|-------|---------|

- Tri par toutes les colonnes (clic en-tête)
- Pagination : 25 / 50 / 100 lignes par page
- Ligne de total en bas (total FBu + total achats)
- Sélection multiple → suppression groupée
- Clic sur ligne → voir détail / modifier

#### Résumé mensuel (sous les filtres) :
```
📊 Avril 2026 | 23 achats enregistrés | Total : 843 200 FBu | Moyenne/jour : 28 107 FBu
```

#### Navigation entre mois :
- Boutons ◀ Mois précédent | Mois suivant ▶
- Sélecteur rapide mois/année
- Afficher "Comparer avec mois précédent" (optionnel)

---

### PAGE 5 : 📊 STATISTIQUES

#### Graphique 1 — Évolution mensuelle (LineChart)
- Axe X : jours du mois (1-30/31)
- Axe Y : montant cumulé (FBu)
- Courbe bleue : dépenses réelles cumulées
- Ligne pointillée rouge : budget total
- Courbe verte pointillée : projection si rythme continue
- Tooltip détaillé au survol

#### Graphique 2 — Répartition par catégorie (PieChart)
- Secteurs colorés par catégorie
- Légende avec montant et %
- Clic sur secteur → zoom avec liste des produits

#### Graphique 3 — Prévu vs Réel par produit (BarChart horizontal)
- Barre bleue = budget prévu
- Barre verte/rouge = réel (rouge si dépassement)
- Trié par écart (les plus dépassés en haut)

#### Graphique 4 — Tendance sur 6 mois glissants (LineChart multi-courbes)
- Une courbe par catégorie principale
- Comparer les évolutions mois par mois
- Sélecteur de période (3 mois / 6 mois / 12 mois)

#### Graphique 5 — Heatmap des achats (calendrier)
- Calendrier du mois avec intensité de couleur selon montant dépensé
- Vert clair = peu dépensé | Vert foncé = beaucoup dépensé

#### Tableau statistique détaillé :
| Produit | Budget prévu | Total dépensé | Nbr achats | Prix moy/kg | Écart | Écart % |
|---------|--------------|---------------|------------|-------------|-------|---------|
- Ligne totale en gras
- Export direct depuis ce tableau

---

### PAGE 6 : 📄 RAPPORTS

#### Types de rapports disponibles :

**1. Rapport Mensuel Complet**
- Résumé exécutif (budget, dépensé, restant, %)
- Tableau détaillé tous produits
- Graphiques intégrés
- Comparaison mois précédent
- Disponible en : PDF | Excel | CSV | JSON

**2. Rapport par Produit**
- Historique complet d'un produit sur période choisie
- Évolution du prix unitaire
- Fréquence d'achat
- Disponible en : PDF | Excel | CSV

**3. Rapport Annuel**
- Vue 12 mois côte à côte
- Totaux par catégorie par mois
- Graphique évolution annuelle
- Disponible en : PDF | Excel

**4. Rapport Comparatif**
- Comparer 2 mois ou plus
- Identifier hausses/baisses des prix
- Disponible en : PDF | Excel

**5. Export des données brutes**
- Tous les achats sur une période
- Format CSV ou JSON
- Pour partage entre machines

#### Interface de génération de rapport :
```
┌─────────────────────────────────────────────────────┐
│ 📄 GÉNÉRER UN RAPPORT                               │
│                                                     │
│ Type      : [Rapport Mensuel Complet        ▼]     │
│ Période   : [Avril 2026                    ▼]     │
│ Format    : ⚪ PDF  ⚪ Excel  ⚪ CSV  ⚪ JSON       │
│ Titre     : [Rapport Alimentaire - Avril 2026]     │
│ Logo/En-tête : ✅ Inclure logo famille              │
│ Graphiques   : ✅ Inclure les graphiques            │
│ Comparaison  : ✅ Comparer avec mois précédent      │
│                                                     │
│ [👁️ Aperçu]  [📥 Générer & Télécharger]           │
└─────────────────────────────────────────────────────┘
```

#### Historique des rapports générés :
Tableau : Date | Type | Période | Format | Taille | Actions (télécharger / supprimer)

---

### PAGE 7 : ⚙️ PARAMÈTRES CMS

**7 sections dans une navigation à onglets latéraux :**

#### 7.1 — Configuration Générale
- Nom de la famille
- Nombre de personnes (curseur 1-15)
- Ville / Pays
- Devise (FBu par défaut, modifiable)
- Langue de l'interface (Français)
- Thème (Clair / Sombre)
- Logo famille (upload image)
- Devise et formattage des nombres

#### 7.2 — Gestion des Catégories (CMS)
Tableau CRUD complet :
- Ajouter / Modifier / Supprimer catégorie
- Champs : Nom | Emoji | Couleur (color picker) | Ordre
- Réordonner par drag & drop

#### 7.3 — Gestion des Produits (CMS)
- Même interface que page Produits mais en mode admin complet
- Import produits depuis CSV
- Réordonner par drag & drop
- Activation/désactivation en lot

#### 7.4 — Gestion des Budgets Mensuels (CMS)
- Créer un nouveau mois budget
- Modifier les montants prévus par produit pour un mois donné
- Archiver les mois passés
- Copier le budget d'un mois vers un autre
- Ajuster le budget global (avec impact sur tous les produits proportionnellement)

```
Exemple interface ajustement :
Budget Avril 2026 : [1 291 500] FBu
Nombre personnes : [6]
[Recalculer proportionnellement depuis budget 7 personnes]
```

#### 7.5 — Backup & Synchronisation

**Backup local (fichier) :**
- Chemin de sauvegarde : [Parcourir...]
- Backup manuel : [💾 Sauvegarder maintenant]
- Dernier backup local : 15 Avril 2026 à 18h30

**Backup par email (Gmail / Outlook / autre SMTP) :**
```
Configuration SMTP :
Serveur SMTP     : [smtp.gmail.com          ]
Port             : [587]
Email            : [famille@gmail.com       ]
Mot de passe     : [••••••••••••••••        ]
Email destinataire: [admin@gmail.com        ]

[🔌 Tester la connexion]  [📧 Envoyer backup maintenant]

Backup automatique : ✅ Activer
Fréquence        : [Mensuel / Hebdomadaire / Manuel]
```

**Configurations prêtes (boutons rapides) :**
- 📧 Gmail → smtp.gmail.com:587 (TLS)
- 📧 Outlook/Hotmail → smtp.live.com:587
- 📧 Yahoo → smtp.mail.yahoo.com:587

#### 7.6 — Import / Export des Données

**Export (pour partage entre machines) :**
```
Exporter tout : [📥 Export complet .rba]   (format propriétaire = JSON zippé)
Exporter mois : [Choisir mois ▼] [📥 Export]
Exporter produits : [📥 Export CSV produits]
```

**Import (recevoir données d'une autre machine) :**
```
[📁 Choisir fichier .rba ou .csv ou .json]
Mode import : ⚪ Fusionner ⚪ Remplacer tout
[👁️ Aperçu avant import]  [✅ Importer]
```

#### 7.7 — Historique & Logs
- Journal de toutes les opérations (achats, modifications, backups)
- Filtrable par type et date
- Export du journal
- Bouton "Purger l'historique avant [date]"

---

## 📊 MODÈLE DE DONNÉES — STRUCTURE EXPORT .rba

```json
{
  "format": "rundinova-budget-v1",
  "exporte_le": "2026-04-18T10:30:00Z",
  "app_version": "1.0.0",
  "config": {
    "famille_nom": "Famille Rundinova",
    "nombre_personnes": 6,
    "devise": "FBu",
    "ville": "Bujumbura"
  },
  "categories": [...],
  "produits": [...],
  "budgets_mensuels": [
    {
      "mois": "2026-04",
      "budget_total_prevu": 1291500,
      "budget_produits": [...],
      "achats": [...]
    }
  ]
}
```

---

## 📄 SPÉCIFICATIONS DES RAPPORTS PDF

### Structure d'un rapport PDF mensuel :

**Page 1 — Couverture :**
```
[LOGO FAMILLE]

RAPPORT ALIMENTAIRE MENSUEL
Famille Rundinova — Bujumbura, Burundi

AVRIL 2026

Budget total prévu : 1 291 500 FBu
Nombre de personnes : 6
Généré le : 18 Avril 2026
```

**Page 2 — Résumé exécutif :**
- 4 indicateurs clés en grand
- Barre de progression globale
- Paragraphe de synthèse automatique

**Page 3 — Tableau détaillé par produit :**
Colonnes : Produit | Nom local | Catégorie | Qté prévue | Qté achetée | Budget prévu | Dépensé | Écart | %
- Total en bas en gras
- Lignes colorées selon statut (vert/orange/rouge)

**Page 4 — Graphiques :**
- Répartition par catégorie (pie chart)
- Évolution des dépenses (line chart)
- Comparaison prévu/réel (bar chart)

**Page 5 — Historique des achats :**
Tableau complet de tous les achats du mois triés par date

**Pied de page sur chaque page :**
`Famille Rundinova | Avril 2026 | Confidentiel | Page X/N`

### Spécifications Excel :

**Feuille 1 — Dashboard :**
- Cellules fusionnées avec KPI principaux
- Mise en forme conditionnelle (rouge si dépassé, vert si OK)
- Graphique intégré

**Feuille 2 — Produits :**
- Tableau avec toutes les colonnes
- Formules Excel actives (pas de valeurs hardcodées)
- Filtres activés

**Feuille 3 — Achats détaillés :**
- Liste brute de tous les achats
- Sous-totaux par catégorie

**Feuille 4 — Statistiques :**
- Tableaux croisés dynamiques
- Graphiques intégrés

---

## 🔧 CONFIGURATION BUILD MULTI-OS

### electron-builder.yml :
```yaml
appId: com.rundinova.budget-alimentaire
productName: Rundinova Budget Alimentaire
copyright: Famille Rundinova 2026

directories:
  output: dist

files:
  - "electron/**/*"
  - "src/**/*"
  - "node_modules/**/*"

win:
  target:
    - target: nsis
      arch: [x64, ia32]
  icon: assets/icon.ico
  artifactName: RundinovaBudget-${version}-Setup.exe

linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
  icon: assets/icon.png
  category: Finance
  artifactName: RundinovaBudget-${version}.AppImage

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: assets/icon.icns
  artifactName: RundinovaBudget-${version}.dmg

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: assets/icon.ico
  installerLanguages: [French]
```

### Scripts package.json :
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:react\" \"npm run dev:electron\"",
    "dev:react": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "build:linux": "vite build && electron-builder --linux",
    "build:mac": "vite build && electron-builder --mac",
    "package": "npm run build"
  }
}
```

---

## 🎨 DESIGN SYSTEM

### Palette de couleurs :
```css
:root {
  /* Thème clair */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-sidebar: #1E293B;
  --sidebar-text: #E2E8F0;
  --sidebar-active: #3B82F6;
  
  --color-primary: #2563EB;      /* Bleu principal */
  --color-success: #16A34A;      /* Vert */
  --color-warning: #D97706;      /* Orange */
  --color-danger: #DC2626;       /* Rouge */
  --color-info: #0EA5E9;         /* Cyan */
  
  --text-primary: #1E293B;
  --text-secondary: #64748B;
  --text-muted: #94A3B8;
  
  --border: #E2E8F0;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  
  /* Catégories */
  --cat-cereales: #F59E0B;
  --cat-feculents: #D97706;
  --cat-legumes: #16A34A;
  --cat-proteines-veg: #7C3AED;
  --cat-proteines-ani: #DC2626;
  --cat-condiments: #0EA5E9;
  --cat-autres: #6B7280;
}
```

### Typographie :
- Titres : Poppins Bold / Semi-bold
- Corps : Inter Regular
- Chiffres/Montants : JetBrains Mono (monospace pour alignement)
- Taille de base : 14px
- Responsive : application desktop (min 1024px)

### Composants UI requis :
- DataTable avec tri, filtre, pagination
- Modal avec overlay
- Toast/notification système
- Progress bar avec couleurs dynamiques
- Badge de statut coloré
- Card avec ombre
- Form inputs validés
- Color picker (pour catégories)
- Date picker
- Dropdown multi-select
- Drag & drop pour réordonnement

---

## ✅ CHECKLIST COMPLÈTE POUR L'AGENT

### Étape 1 — Setup projet
- [ ] Créer projet Electron + React + TypeScript + Vite
- [ ] Installer toutes les dépendances listées
- [ ] Configurer electron-builder.yml pour Win/Linux/Mac
- [ ] Configurer IPC (communication sécurisée Electron↔React)

### Étape 2 — Base de données
- [ ] Créer le schéma SQLite complet (7 tables)
- [ ] Insérer les données initiales (config, 7 catégories, 17 produits)
- [ ] Créer toutes les fonctions CRUD via IPC

### Étape 3 — Interface
- [ ] Layout avec sidebar + header + status bar
- [ ] Page Dashboard avec KPIs + graphiques + alertes
- [ ] Page Produits avec tableau + CRUD complet
- [ ] Page Nouvel Achat avec formulaire + preview
- [ ] Page Historique avec filtres + tri + pagination
- [ ] Page Statistiques avec 5 graphiques
- [ ] Page Rapports avec générateur
- [ ] Page Paramètres CMS complète (7 sections)

### Étape 4 — Rapports
- [ ] Générateur PDF (jsPDF) avec couverture + tableaux + graphiques
- [ ] Générateur Excel (SheetJS) avec formules + mise en forme
- [ ] Export CSV simple
- [ ] Export JSON (.rba)

### Étape 5 — Backup & Sync
- [ ] Backup fichier local
- [ ] Configuration SMTP (Gmail, Outlook, autres)
- [ ] Envoi email avec fichier .rba en pièce jointe
- [ ] Import fichier .rba
- [ ] Import/Export CSV pour produits

### Étape 6 — CMS
- [ ] CRUD Catégories avec drag & drop
- [ ] CRUD Produits complet
- [ ] Gestion budgets mensuels (créer, copier, archiver)
- [ ] Configuration générale modifiable
- [ ] Thème clair/sombre

### Étape 7 — Build
- [ ] Build Windows (.exe installeur NSIS)
- [ ] Build Linux (.AppImage)
- [ ] Build macOS (.dmg) si possible
- [ ] Instructions d'installation dans README

---

## 📋 DONNÉES DE TEST À GÉNÉRER

Pour valider l'application, générer automatiquement ces données de test :

```
Mois : Avril 2026
Achats simulés :
- 01/04 : Riz 10kg à 97 500 FBu (marché central)
- 01/04 : Sel 2kg à 15 000 FBu
- 02/04 : Pain (achat journalier) 4 000 FBu
- 03/04 : Pain 4 000 FBu
- 05/04 : Haricot 5kg à 15 500 FBu
- 07/04 : Viande 1 achat à 30 000 FBu (boucherie)
- 08/04 : Oignons 3kg à 15 000 FBu
- 10/04 : Banane 12kg à 12 000 FBu
- 10/04 : Pomme de terre 15kg à 30 000 FBu
- 12/04 : Tomates 1 lot à 200 000 FBu
- 14/04 : Viande 1 achat à 30 000 FBu
- 15/04 : Riz 10kg à 97 500 FBu (2e achat)
- 15/04 : Haricot 5kg à 15 500 FBu
- 15/04 : Amashu 15 achats à 3 000 FBu
- 16/04 : Carottes 10 achats à 3 000 FBu
- 17/04 : Pain 4 000 FBu
- 18/04 : Spaghetti 3 paquets à 21 000 FBu
```

---

## 🚀 COMMANDES POUR LANCER EN DÉVELOPPEMENT

```bash
git clone [repo]
cd rundinova-budget
npm install
npm run dev
```

## 🚀 COMMANDES POUR CRÉER LE FICHIER INSTALLABLE

```bash
# Windows (.exe)
npm run build:win

# Linux (.AppImage)
npm run build:linux

# Les deux
npm run build
```

Les fichiers installables sont dans le dossier `dist/`.

---

*Famille Rundinova — Bujumbura, Burundi — 6 personnes — Budget 2026*
*Document version 1.0 — Généré le 18 Avril 2026*
