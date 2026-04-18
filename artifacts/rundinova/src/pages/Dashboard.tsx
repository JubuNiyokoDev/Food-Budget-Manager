import { useGetDashboard } from "@workspace/api-client-react";
import { formatFBu, getProgressColor, getMoisCurrent, getMoisLabel } from "@/lib/format";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { ShoppingBag, AlertTriangle, CheckCircle, Info, Calendar } from "lucide-react";

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color || ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = getProgressColor(pct);
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

const CHART_GREEN = "#22c55e";
const CHART_AMBER = "#f59e0b";
const CHART_RED = "#ef4444";

function getBarColor(pct: number) {
  if (pct >= 85) return CHART_RED;
  if (pct >= 60) return CHART_AMBER;
  return CHART_GREEN;
}

export default function Dashboard() {
  const mois = getMoisCurrent();
  const { data, isLoading } = useGetDashboard({ mois }) as any;

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-muted-foreground">
        Chargement...
      </div>
    );
  }

  const { kpi, evolution_journaliere, top_produits, derniers_achats, alertes } = data as any;

  const kpiPct = kpi?.pourcentage_depense ?? 0;
  const kpiColor = kpiPct >= 85 ? "text-red-500" : kpiPct >= 60 ? "text-amber-500" : "text-green-600";

  const evolutionData = (evolution_journaliere ?? []).map((d: any) => ({
    jour: d.jour,
    montant: d.montant,
    cumule: d.cumule,
  }));

  const alerteIcons: Record<string, any> = {
    danger: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground capitalize">{getMoisLabel(mois)}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Budget total" value={formatFBu(kpi?.budget_total)} />
        <KpiCard label="Total dépensé" value={formatFBu(kpi?.total_depense)} color={kpiColor} />
        <KpiCard
          label="Restant"
          value={formatFBu(kpi?.restant)}
          sub={`${kpi?.jours_restants} jours restants`}
          color={(kpi?.restant ?? 0) < 0 ? "text-red-500" : ""}
        />
        <KpiCard
          label="Projection fin de mois"
          value={formatFBu(kpi?.projection_fin_mois)}
          sub={`${kpi?.nombre_achats} achat(s)`}
        />
      </div>

      {/* Progress bar */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Consommation du budget</span>
          <span className={`text-sm font-bold tabular-nums ${kpiColor}`}>{kpiPct}%</span>
        </div>
        <ProgressBar pct={kpiPct} />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0 FBu</span>
          <span>{formatFBu(kpi?.budget_total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Evolution chart */}
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium mb-3">Évolution journalière</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={evolutionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCumule" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="jour" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip
                formatter={(value: number, name: string) => [formatFBu(value), name === "cumule" ? "Cumulé" : "Journalier"]}
                labelFormatter={(label) => `Jour ${label}`}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Area type="monotone" dataKey="cumule" stroke={CHART_GREEN} fill="url(#gradCumule)" strokeWidth={2} name="cumule" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top produits */}
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Top produits
          </div>
          {(top_produits ?? []).length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Aucun achat enregistré ce mois
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top_produits} layout="vertical" margin={{ top: 4, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} tickLine={false} width={55} />
                <Tooltip
                  formatter={(value: number) => [formatFBu(value), "Dépensé"]}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Bar dataKey="total_depense" radius={[0, 3, 3, 0]}>
                  {(top_produits ?? []).map((entry: any, index: number) => (
                    <Cell key={index} fill={getBarColor((entry.total_depense / (kpi?.budget_total ?? 1)) * 100)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Alertes */}
        {(alertes ?? []).length > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertes ({(alertes ?? []).length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(alertes ?? []).slice(0, 5).map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50">
                  {alerteIcons[a.type] || alerteIcons.info}
                  <span>{a.message}</span>
                </div>
              ))}
              {(alertes ?? []).length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  + {(alertes ?? []).length - 5} autres alertes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Derniers achats */}
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Derniers achats
          </div>
          {(derniers_achats ?? []).length === 0 ? (
            <div className="text-muted-foreground text-sm">Aucun achat récent ce mois</div>
          ) : (
            <div className="space-y-2">
              {(derniers_achats ?? []).slice(0, 8).map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{a.produit_nom}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {a.quantite} {a.unite}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums text-primary">{formatFBu(a.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
