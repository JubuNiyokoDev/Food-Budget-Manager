import { useGetDashboard } from "@workspace/api-client-react";
import { formatFBu, getProgressColor, getMoisCurrent, getMoisLabel } from "@/lib/format";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { ShoppingBag, AlertTriangle, CheckCircle, Info, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.07, ease } }),
};

function KpiCard({ label, value, sub, color, index }: { label: string; value: string; sub?: string; color?: string; index: number }) {
  return (
    <motion.div
      className="bg-card rounded-2xl shadow-sm p-5"
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-medium">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color || ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>}
    </motion.div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = getProgressColor(pct);
  return (
    <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 1.1, ease }}
      />
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

const alerteIcons: Record<string, any> = {
  danger: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
};

export default function Dashboard() {
  const mois = getMoisCurrent();
  const { data, isLoading } = useGetDashboard({ mois }) as any;

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-full text-muted-foreground">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
          Chargement...
        </motion.div>
      </div>
    );
  }

  const { kpi, evolution_journaliere, top_produits, derniers_achats, alertes } = data as any;
  const kpiPct = kpi?.pourcentage_depense ?? 0;
  const kpiColor = kpiPct >= 85 ? "text-red-500" : kpiPct >= 60 ? "text-amber-500" : "text-green-600";

  const evolutionData = (evolution_journaliere ?? []).map((d: any) => ({
    jour: d.jour, montant: d.montant, cumule: d.cumule,
  }));

  return (
    <motion.div className="p-6 space-y-6" initial="hidden" animate="show" variants={stagger}>
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{getMoisLabel(mois)}</p>
      </motion.div>

      <motion.div className="grid grid-cols-2 xl:grid-cols-4 gap-4" variants={stagger}>
        <KpiCard index={0} label="Budget total" value={formatFBu(kpi?.budget_total)} />
        <KpiCard index={1} label="Total dépensé" value={formatFBu(kpi?.total_depense)} color={kpiColor} />
        <KpiCard index={2} label="Restant" value={formatFBu(kpi?.restant)} sub={`${kpi?.jours_restants} jours restants`} color={(kpi?.restant ?? 0) < 0 ? "text-red-500" : ""} />
        <KpiCard index={3} label="Projection fin de mois" value={formatFBu(kpi?.projection_fin_mois)} sub={`${kpi?.nombre_achats} achat(s)`} />
      </motion.div>

      <motion.div className="bg-card rounded-2xl shadow-sm p-5" variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Consommation du budget</span>
          <span className={`text-sm font-bold tabular-nums ${kpiColor}`}>{kpiPct}%</span>
        </div>
        <ProgressBar pct={kpiPct} />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0 FBu</span>
          <span>{formatFBu(kpi?.budget_total)}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <motion.div className="bg-card rounded-2xl shadow-sm p-5" variants={fadeUp}>
          <div className="text-sm font-semibold mb-4">Évolution journalière</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={evolutionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCumule" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
              <XAxis dataKey="jour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(value: number, name: string) => [formatFBu(value), name === "cumule" ? "Cumulé" : "Journalier"]} labelFormatter={(l) => `Jour ${l}`} contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="cumule" stroke={CHART_GREEN} fill="url(#gradCumule)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="bg-card rounded-2xl shadow-sm p-5" variants={fadeUp}>
          <div className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Top produits
          </div>
          {(top_produits ?? []).length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucun achat ce mois</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top_produits} layout="vertical" margin={{ top: 4, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip formatter={(value: number) => [formatFBu(value), "Dépensé"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="total_depense" radius={[0, 4, 4, 0]}>
                  {(top_produits ?? []).map((entry: any, index: number) => (
                    <Cell key={index} fill={getBarColor((entry.total_depense / (kpi?.budget_total ?? 1)) * 100)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {(alertes ?? []).length > 0 && (
          <motion.div className="bg-card rounded-2xl shadow-sm p-5" variants={fadeUp}>
            <div className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertes ({(alertes ?? []).length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(alertes ?? []).slice(0, 5).map((a: any, i: number) => (
                <motion.div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-xl bg-muted/40"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  {alerteIcons[a.type] || alerteIcons.info}
                  <span>{a.message}</span>
                </motion.div>
              ))}
              {(alertes ?? []).length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">+ {(alertes ?? []).length - 5} autres</div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div className="bg-card rounded-2xl shadow-sm p-5" variants={fadeUp}>
          <div className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Derniers achats
          </div>
          {(derniers_achats ?? []).length === 0 ? (
            <div className="text-muted-foreground text-sm">Aucun achat récent ce mois</div>
          ) : (
            <div className="space-y-2.5">
              {(derniers_achats ?? []).slice(0, 8).map((a: any, i: number) => (
                <motion.div key={i} className="flex items-center justify-between text-sm"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div>
                    <span className="font-medium">{a.produit_nom}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{a.quantite} {a.unite}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-primary">{formatFBu(a.montant)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
