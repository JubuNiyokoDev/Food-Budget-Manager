import {
  ShoppingBasket, Users, Calculator, Package, TrendingUp,
  LayoutDashboard, ShoppingCart, Plus, History, BarChart3,
  FileText, Settings, type LucideIcon
} from "lucide-react";

export interface ModuleNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  separator?: boolean;
}

export interface AppModule {
  id: string;
  nom: string;
  nomCourt: string;
  description: string;
  icon: LucideIcon;
  couleur: string;
  bgGradient: string;
  textGradient: string;
  statut: "actif" | "beta" | "bientot";
  version?: string;
  basePath: string;
  navItems: ModuleNavItem[];
  stats?: string;
}

export const MODULES: AppModule[] = [
  {
    id: "alimentaire",
    nom: "Gestion Alimentaire",
    nomCourt: "Alimentation",
    description: "Budget mensuel, achats et suivi des dépenses alimentaires de la famille Rundinova.",
    icon: ShoppingBasket,
    couleur: "#22c55e",
    bgGradient: "from-green-500 to-emerald-600",
    textGradient: "from-green-600 to-emerald-700",
    statut: "actif",
    version: "1.0",
    basePath: "/alimentaire",
    navItems: [
      { path: "/alimentaire", label: "Tableau de bord", icon: LayoutDashboard },
      { path: "/alimentaire/produits", label: "Produits & CMS", icon: ShoppingCart },
      { path: "/alimentaire/achats/nouveau", label: "Nouvel Achat", icon: Plus },
      { path: "/alimentaire/historique", label: "Historique", icon: History },
      { path: "/alimentaire/statistiques", label: "Statistiques", icon: BarChart3 },
      { path: "/alimentaire/rapports", label: "Rapports", icon: FileText },
      { path: "/alimentaire/parametres", label: "Paramètres", icon: Settings, separator: true },
    ],
  },
  {
    id: "rh",
    nom: "Ressources Humaines",
    nomCourt: "RH",
    description: "Gestion des employés, salaires, contrats et congés de la startup.",
    icon: Users,
    couleur: "#3b82f6",
    bgGradient: "from-blue-500 to-indigo-600",
    textGradient: "from-blue-600 to-indigo-700",
    statut: "bientot",
    basePath: "/rh",
    navItems: [],
  },
  {
    id: "comptabilite",
    nom: "Comptabilité",
    nomCourt: "Comptabilité",
    description: "Bilan financier, trésorerie, factures et comptes de la startup Rundinova.",
    icon: Calculator,
    couleur: "#f59e0b",
    bgGradient: "from-amber-500 to-orange-600",
    textGradient: "from-amber-600 to-orange-700",
    statut: "bientot",
    basePath: "/comptabilite",
    navItems: [],
  },
  {
    id: "stock",
    nom: "Gestion des Stocks",
    nomCourt: "Stocks",
    description: "Inventaire, mouvements de stock et suivi des articles disponibles.",
    icon: Package,
    couleur: "#8b5cf6",
    bgGradient: "from-violet-500 to-purple-600",
    textGradient: "from-violet-600 to-purple-700",
    statut: "bientot",
    basePath: "/stock",
    navItems: [],
  },
  {
    id: "ventes",
    nom: "Ventes & CRM",
    nomCourt: "Ventes",
    description: "Suivi des ventes, clients, devis et relation commerciale.",
    icon: TrendingUp,
    couleur: "#ec4899",
    bgGradient: "from-pink-500 to-rose-600",
    textGradient: "from-pink-600 to-rose-700",
    statut: "bientot",
    basePath: "/ventes",
    navItems: [],
  },
];

export function getModuleByPath(location: string): AppModule | null {
  return MODULES.find(m => location === m.basePath || location.startsWith(m.basePath + "/")) ?? null;
}
