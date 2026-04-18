import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import {
  Moon, Sun, ChevronRight, AlertCircle, ArrowLeft, Layers
} from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { getMoisCurrent, formatFBu, getMoisLabel } from "@/lib/format";
import { MODULES, getModuleByPath } from "@/lib/modules";

import Dashboard from "@/pages/Dashboard";
import Produits from "@/pages/Produits";
import NouvelAchat from "@/pages/NouvelAchat";
import Historique from "@/pages/Historique";
import Statistiques from "@/pages/Statistiques";
import Rapports from "@/pages/Rapports";
import Parametres from "@/pages/Parametres";
import Hub from "@/pages/Hub";
import ModuleComingSoon from "@/pages/ModuleComingSoon";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function HubSidebar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full">
      <div className="h-14 border-b border-sidebar-border flex items-center px-4 gap-2">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
          <Layers className="w-4 h-4 text-sidebar-primary" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-sidebar-foreground">Rundinova</div>
          <div className="text-xs text-sidebar-foreground/50 leading-tight">Plateforme</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-2 py-1.5 mb-1">
          <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest">Modules</span>
        </div>
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isClickable = mod.statut !== "bientot";
          return isClickable ? (
            <Link
              key={mod.id}
              href={mod.basePath}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${mod.bgGradient} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="flex-1">{mod.nomCourt}</span>
              {mod.statut === "actif" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
              {mod.statut === "beta" && <span className="text-xs text-blue-500 font-semibold">β</span>}
            </Link>
          ) : (
            <div key={mod.id} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/30 cursor-default">
              <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
              <span className="flex-1">{mod.nomCourt}</span>
              <span className="text-xs text-muted-foreground/30">Bientôt</span>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
      </div>
    </aside>
  );
}

function ModuleSidebar({ moduleId, dark, toggleDark }: { moduleId: string; dark: boolean; toggleDark: () => void }) {
  const [location] = useLocation();
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return null;
  const ModIcon = mod.icon;

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full">
      <div className="h-14 border-b border-sidebar-border flex items-center px-3 gap-2">
        <Link
          href="/"
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-accent-foreground transition-colors flex-shrink-0"
          title="Tous les modules"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <div className="h-5 w-px bg-sidebar-border flex-shrink-0" />
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${mod.bgGradient} flex items-center justify-center flex-shrink-0`}>
          <ModIcon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm leading-tight text-sidebar-foreground truncate">Rundinova</div>
          <div className="text-xs text-sidebar-foreground/50 leading-tight truncate">{mod.nomCourt}</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {mod.navItems.map(({ path, label, icon: Icon, separator }) => {
          const isActive = path === mod.basePath
            ? location === mod.basePath || location === mod.basePath + "/"
            : location.startsWith(path);
          return (
            <div key={path}>
              {separator && <div className="h-px bg-sidebar-border/50 my-2" />}
              <Link
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
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
      </div>
    </aside>
  );
}

function AlimentaireHeader() {
  const mois = getMoisCurrent();
  const { data: dashboard } = useGetDashboard({ mois }) as any;
  const restant = dashboard?.kpi?.restant ?? 0;
  const pct = dashboard?.kpi?.pourcentage_depense ?? 0;
  const alertes = dashboard?.alertes ?? [];
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
        <div className="text-sm text-muted-foreground">{pct}% consommé</div>
      </div>
      {alertes.length > 0 && (
        <div className="flex items-center gap-1.5 text-amber-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{alertes.length} alerte{alertes.length > 1 ? "s" : ""}</span>
        </div>
      )}
    </header>
  );
}

function SimpleModuleHeader({ moduleId }: { moduleId: string }) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return null;
  const Icon = mod.icon;
  return (
    <header className="h-14 border-b bg-card flex items-center px-6 gap-3 flex-shrink-0">
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${mod.bgGradient} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="font-semibold text-sm">{mod.nom}</span>
      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">En développement</span>
    </header>
  );
}

function AlimentaireStatusBar() {
  const mois = getMoisCurrent();
  const { data } = useGetDashboard({ mois }) as any;
  const n = data?.kpi?.nombre_achats ?? 0;
  return (
    <footer className="h-7 border-t bg-card flex items-center px-4 gap-4 text-xs text-muted-foreground flex-shrink-0">
      <span>Rundinova · Alimentation v1.0</span>
      <span className="h-3 w-px bg-border" />
      <span>{n} achat{n > 1 ? "s" : ""} ce mois</span>
      <span className="h-3 w-px bg-border" />
      <span>SQLite · Hors-ligne</span>
    </footer>
  );
}

function PlatformStatusBar() {
  return (
    <footer className="h-7 border-t bg-card flex items-center px-4 gap-4 text-xs text-muted-foreground flex-shrink-0">
      <span>Rundinova Platform</span>
      <span className="h-3 w-px bg-border" />
      <span>Bujumbura, Burundi</span>
      <span className="h-3 w-px bg-border" />
      <span>SQLite · Hors-ligne</span>
    </footer>
  );
}

function AppLayout({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const [location] = useLocation();
  const currentModule = getModuleByPath(location);
  const isHub = !currentModule;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isHub
        ? <HubSidebar dark={dark} toggleDark={toggleDark} />
        : <ModuleSidebar moduleId={currentModule.id} dark={dark} toggleDark={toggleDark} />
      }

      <div className="flex-1 flex flex-col overflow-hidden">
        {!isHub && currentModule?.id === "alimentaire" && <AlimentaireHeader />}
        {!isHub && currentModule?.id !== "alimentaire" && <SimpleModuleHeader moduleId={currentModule!.id} />}

        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Hub} />

            <Route path="/alimentaire" component={Dashboard} />
            <Route path="/alimentaire/produits" component={Produits} />
            <Route path="/alimentaire/achats/nouveau" component={NouvelAchat} />
            <Route path="/alimentaire/historique" component={Historique} />
            <Route path="/alimentaire/statistiques" component={Statistiques} />
            <Route path="/alimentaire/rapports" component={Rapports} />
            <Route path="/alimentaire/parametres" component={Parametres} />

            <Route path="/rh">{() => <ModuleComingSoon moduleId="rh" />}</Route>
            <Route path="/comptabilite">{() => <ModuleComingSoon moduleId="comptabilite" />}</Route>
            <Route path="/stock">{() => <ModuleComingSoon moduleId="stock" />}</Route>
            <Route path="/ventes">{() => <ModuleComingSoon moduleId="ventes" />}</Route>

            <Route component={NotFound} />
          </Switch>
        </main>

        {isHub
          ? <PlatformStatusBar />
          : currentModule?.id === "alimentaire"
            ? <AlimentaireStatusBar />
            : <PlatformStatusBar />
        }
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
          <AppLayout dark={dark} toggleDark={toggleDark} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
