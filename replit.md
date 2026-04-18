# Rundinova Platform

## Overview

**Rundinova** est une plateforme ERP modulaire pour la startup Rundinova (Bujumbura, Burundi). L'application est conçue pour accueillir plusieurs modules de gestion (Alimentation, RH, Comptabilité, Stocks, Ventes), chacun indépendant mais intégré dans la même application.

pnpm workspace monorepo avec TypeScript. Chaque package gère ses propres dépendances.

## Architecture modulaire

Les modules sont définis dans `artifacts/rundinova/src/lib/modules.ts`. Chaque module a :
- Un `id`, un `basePath` (ex: `/alimentaire`), des `navItems`
- Un statut : `actif`, `beta`, ou `bientot`
- La Hub page (`/`) liste tous les modules

### Modules actuels

| Module | Statut | Chemin | Description |
|--------|--------|--------|-------------|
| Gestion Alimentaire | ✅ Actif v1.0 | `/alimentaire` | Budget mensuel, achats, rapports famille |
| Ressources Humaines | 🔜 Bientôt | `/rh` | Employés, salaires, congés |
| Comptabilité | 🔜 Bientôt | `/comptabilite` | Bilan, trésorerie, factures |
| Gestion des Stocks | 🔜 Bientôt | `/stock` | Inventaire, mouvements |
| Ventes & CRM | 🔜 Bientôt | `/ventes` | Clients, devis, ventes |

### Ajouter un nouveau module

1. Ajouter une entrée dans `artifacts/rundinova/src/lib/modules.ts` (MODULES array)
2. Créer les pages du module dans `artifacts/rundinova/src/pages/<module>/`
3. Ajouter les routes dans `artifacts/rundinova/src/App.tsx`
4. Si le module a une API propre, créer les routes dans `artifacts/api-server/src/routes/`

## Stack technique

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + SQLite (better-sqlite3)
- **Icons**: Lucide React (pas d'emojis — tout icône Lucide)
- **Animations**: Framer Motion
- **Router**: Wouter
- **State**: TanStack Query
- **API codegen**: Orval (OpenAPI → React hooks)
- **Build**: esbuild

## Module Alimentation — Détails

### Pages et routes

| Route | Page | Description |
|-------|------|-------------|
| `/alimentaire` | Dashboard | KPI, graphiques, alertes |
| `/alimentaire/produits` | Produits | CMS catégories + produits, IconPicker |
| `/alimentaire/achats/nouveau` | NouvelAchat | Saisie multi-lignes |
| `/alimentaire/historique` | Historique | Liste + filtres |
| `/alimentaire/statistiques` | Statistiques | Graphiques par produit/catégorie/jour |
| `/alimentaire/rapports` | Rapports | HTML/PDF, Excel, CSV, JSON |
| `/alimentaire/parametres` | Parametres | Config, catégories CRUD, backup |

### Fichiers importants

- `artifacts/rundinova/src/lib/modules.ts` — Registre de tous les modules
- `artifacts/rundinova/src/lib/icons.ts` — Liste d'icônes Lucide + EMOJI_TO_ICON_MAP
- `artifacts/rundinova/src/components/IconRenderer.tsx` — Rendu icône dynamique
- `artifacts/rundinova/src/components/IconPicker.tsx` — Sélecteur d'icône (grille searchable)
- `artifacts/api-server/src/db/sqlite.ts` — Schéma SQLite + migration + seed
- `artifacts/api-server/src/routes/rapports.ts` — Génération rapports pro

### DB SQLite

- La colonne `emoji` stocke des noms d'icônes Lucide (ex: "Wheat", "ShoppingCart")
- Migration auto au démarrage : conversion anciens emojis → noms Lucide via EMOJI_TO_ICON_MAP
- Budget mensuel par défaut : 1 291 500 FBu (famille de 6 personnes)
- DB locale : `artifacts/api-server/data/rundinova.db`

### API — Field mapping important

Les achats utilisent : `date_achat`, `prix_paye`, `notes`, `lieu_achat` (pas `date`, `montant`, etc.)

## Commandes clés

```bash
pnpm --filter @workspace/api-server run dev    # API server (port 8080)
pnpm --filter @workspace/rundinova run dev      # Frontend (port 21078)
pnpm --filter @workspace/api-spec run codegen  # Régénérer hooks API depuis OpenAPI
```

## Workflows

- **Start application** : Lance API + Frontend ensemble
- **artifacts/api-server: API Server** : API seule
- **artifacts/rundinova: web** : Frontend seul
