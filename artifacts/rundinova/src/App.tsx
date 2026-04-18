import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Plus, History, BarChart3, FileText, Settings, Moon, Sun, Database, ChevronRight, AlertCircle
} from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { getMoisCurrent, formatFBu, getMoisLabel } from "@/lib/format";
import Dashboard from "@/pages/Dashboard";
import Produits from "@/pages/Produits";
import NouvelAchat from "@/pages/NouvelAchat";
import Historique from "@/pages/Historique";
import Statistiques from "@/pages/Statistiques";
import Rapports from "@/pages/Rapports";
import Parametres from "@/pages/Parametres";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

const navItems = [
  { path: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/produits", label: "Produits", icon: ShoppingCart },
  { path: "/achats/nouveau", label: "Nouvel Achat", icon: Plus },
  { path: "/historique", label: "Historique", icon: History },
  { path: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { path: "/rapports", label: "Rapports", icon: FileText },
  { path: "/parametres", label: "Paramètres", icon: Settings },
];

function Sidebar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const [location] = useLocation();

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full">
      <div className="h-14 border-b border-sidebar-border flex items-center px-4 gap-2">
        <Database className="w-5 h-5 text-sidebar-primary" />
        <div>
          <div className="font-bold text-sm leading-tight text-sidebar-foreground">Rundinova</div>
          <div className="text-xs text-sidebar-foreground/50 leading-tight">Budget Alimentaire</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          data-testid="button-toggle-theme"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
      </div>
    </aside>
  );
}

function Header() {
  const mois = getMoisCurrent();
  const { data: dashboard } = useGetDashboard({ mois }) as any;

  const restant = dashboard?.kpi?.restant ?? 0;
  const budgetTotal = dashboard?.kpi?.budget_total ?? 0;
  const pct = dashboard?.kpi?.pourcentage_depense ?? 0;

  const alertes = dashboard?.alertes ?? [];
  const hasAlerts = alertes.length > 0;

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Période : </span>
          <span className="font-semibold capitalize">{getMoisLabel(mois)}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-sm">
          <span className="text-muted-foreground">Budget restant : </span>
          <span className={`font-semibold ${restant < 0 ? "text-red-500" : pct >= 85 ? "text-red-500" : pct >= 60 ? "text-amber-500" : "text-green-600"}`}>
            {formatFBu(restant)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {pct}% consommé
        </div>
      </div>
      {hasAlerts && (
        <div className="flex items-center gap-1.5 text-amber-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{alertes.length} alerte{alertes.length > 1 ? "s" : ""}</span>
        </div>
      )}
    </header>
  );
}

function StatusBar() {
  const mois = getMoisCurrent();
  const { data: dashboardStatus } = useGetDashboard({ mois }) as any;
  const nombreAchats = dashboardStatus?.kpi?.nombre_achats ?? 0;

  return (
    <footer className="h-7 border-t bg-card flex items-center px-4 gap-4 text-xs text-muted-foreground flex-shrink-0">
      <span>Rundinova Budget Alimentaire v1.0</span>
      <span className="h-3 w-px bg-border" />
      <span>{nombreAchats} achat{nombreAchats > 1 ? "s" : ""} ce mois</span>
      <span className="h-3 w-px bg-border" />
      <span>SQLite · Hors-ligne</span>
    </footer>
  );
}

function Layout({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar dark={dark} toggleDark={toggleDark} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/produits" component={Produits} />
            <Route path="/achats/nouveau" component={NouvelAchat} />
            <Route path="/historique" component={Historique} />
            <Route path="/statistiques" component={Statistiques} />
            <Route path="/rapports" component={Rapports} />
            <Route path="/parametres" component={Parametres} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const toggleDark = () => setDark(d => !d);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout dark={dark} toggleDark={toggleDark} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
