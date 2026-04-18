import { useState } from "react";
import { useGetStatistiques } from "@workspace/api-client-react";
import { formatFBu, getMoisCurrent, getProgressColor } from "@/lib/format";
import { IconRenderer } from "@/components/IconRenderer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#06b6d4", "#f97316"];

const tooltipStyle = { fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" };

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = getProgressColor(pct);
  return (
    <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
      <motion.div className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }} animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease }} />
    </div>
  );
}

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { val, label };
});

const tabs = [
  { key: "produit", label: "Par produit" },
  { key: "categorie", label: "Par catégorie" },
  { key: "evolution", label: "Évolution" },
  { key: "heatmap", label: "Heatmap" },
] as const;

export default function Statistiques() {
  const [mois, setMois] = useState(getMoisCurrent());
  const [activeTab, setActiveTab] = useState<"produit" | "categorie" | "evolution" | "heatmap">("produit");
  const { data: stats } = useGetStatistiques({ mois }) as any;

  const parProduit: any[] = stats?.par_produit ?? [];
  const parCategorie: any[] = stats?.par_categorie ?? [];
  const evolutionMensuelle: any[] = stats?.evolution_mensuelle ?? [];
  const heatmapJours: any[] = stats?.heatmap_jours ?? [];

  const renderContent = () => {
    if (activeTab === "produit") return (
      <motion.div key="produit" className="space-y-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                {["Produit", "Catégorie", "Achats", "Budget", "Dépensé", "Écart", "Progression"].map(h => (
                  <th key={h} className={`px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide ${["Achats", "Budget", "Dépensé", "Écart"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {parProduit.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">Aucune donnée</td></tr>
              ) : (
                parProduit.map((d: any, i: number) => {
                  const pct = d.budget_prevu ? Math.round((d.total_depense / d.budget_prevu) * 100) : 0;
                  return (
                    <motion.tr key={i} className="hover:bg-muted/20 transition-colors"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025, duration: 0.3 }}>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {d.emoji && <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center flex-shrink-0"><IconRenderer name={d.emoji} className="w-3 h-3 text-muted-foreground" /></div>}
                          {d.produit_nom}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{d.categorie_nom}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.nombre_achats}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.budget_prevu ? formatFBu(d.budget_prevu) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">{formatFBu(d.total_depense)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums text-xs ${d.ecart >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {d.ecart >= 0 ? "+" : ""}{formatFBu(d.ecart)}
                      </td>
                      <td className="px-4 py-3 w-36">
                        {d.budget_prevu ? (
                          <div className="space-y-1"><ProgressBar pct={pct} /><div className="text-xs text-muted-foreground text-right">{pct}%</div></div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {parProduit.filter(d => d.total_depense > 0).length > 0 && (
          <motion.div className="bg-card rounded-2xl shadow-sm p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <div className="text-sm font-semibold mb-4">Dépenses réelles par produit</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={parProduit.filter(d => d.total_depense > 0).slice(0, 10)} margin={{ top: 4, right: 20, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
                <XAxis dataKey="produit_nom" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [formatFBu(v), "Dépensé"]} contentStyle={tooltipStyle} />
                <Bar dataKey="total_depense" radius={[4, 4, 0, 0]}>
                  {parProduit.filter(d => d.total_depense > 0).slice(0, 10).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </motion.div>
    );

    if (activeTab === "categorie") {
      const withData = parCategorie.filter((d: any) => d.total_depense > 0);
      return (
        <motion.div key="categorie" className="grid grid-cols-1 xl:grid-cols-2 gap-5"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
          <div className="bg-card rounded-2xl shadow-sm p-5">
            <div className="text-sm font-semibold mb-4">Répartition par catégorie</div>
            {withData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Aucune dépense ce mois</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={withData} dataKey="total_depense" nameKey="categorie_nom" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {withData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatFBu(v), "Dépensé"]} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Catégorie</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Dépensé</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {parCategorie.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">Aucune donnée</td></tr>
                ) : (
                  parCategorie.map((d: any, i: number) => (
                    <motion.tr key={i} className="hover:bg-muted/20 transition-colors"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {d.categorie_nom}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">{formatFBu(d.total_depense)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{d.budget_prevu ? formatFBu(d.budget_prevu) : "—"}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      );
    }

    if (activeTab === "evolution") return (
      <motion.div key="evolution" className="bg-card rounded-2xl shadow-sm p-5"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
        <div className="text-sm font-semibold mb-4">Évolution mensuelle des dépenses</div>
        {evolutionMensuelle.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolutionMensuelle} margin={{ top: 4, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEvol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.08)" />
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [formatFBu(v), ""]} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="budget" stroke="#f59e0b" fill="url(#gradBudget)" strokeWidth={1.5} strokeDasharray="4 4" name="Budget" dot={false} />
              <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#gradEvol)" strokeWidth={2} name="Dépenses" dot />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    );

    if (activeTab === "heatmap") {
      const maxVal = heatmapJours.reduce((m: number, d: any) => Math.max(m, d.montant ?? 0), 1);
      const getHeatColor = (v: number) => {
        const r = v / maxVal;
        if (r === 0) return "rgba(34,197,94,0.06)";
        if (r < 0.2) return "rgba(34,197,94,0.25)";
        if (r < 0.5) return "rgba(245,158,11,0.45)";
        if (r < 0.8) return "rgba(245,158,11,0.75)";
        return "rgba(239,68,68,0.85)";
      };
      const grid: Record<string, number> = {};
      heatmapJours.forEach((d: any) => { grid[`${d.produit_id}-${d.jour}`] = d.montant; });
      const produitIds: number[] = [...new Set(heatmapJours.map((d: any) => d.produit_id))] as number[];
      const produitNoms: Record<number, string> = {};
      heatmapJours.forEach((d: any) => { produitNoms[d.produit_id] = d.produit_nom; });
      const days = Array.from({ length: 30 }, (_, i) => i + 1);

      return (
        <motion.div key="heatmap" className="bg-card rounded-2xl shadow-sm p-5 overflow-auto"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
          <div className="text-sm font-semibold mb-4">Heatmap des achats — Jours × Produits</div>
          {produitIds.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Aucune donnée d'achat ce mois</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="text-xs border-separate border-spacing-0.5">
                  <thead>
                    <tr>
                      <th className="text-left pr-3 text-muted-foreground font-medium whitespace-nowrap">Produit</th>
                      {days.map(d => <th key={d} className="text-center w-7 text-muted-foreground font-medium">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {produitIds.map((pid, ri) => (
                      <motion.tr key={pid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.03, duration: 0.3 }}>
                        <td className="pr-3 text-right whitespace-nowrap text-muted-foreground py-0.5">{produitNoms[pid]}</td>
                        {days.map(d => {
                          const val = grid[`${pid}-${d}`] ?? 0;
                          return (
                            <td key={d} title={val > 0 ? formatFBu(val) : "Aucun achat"}>
                              <motion.div className="w-6 h-6 rounded-sm cursor-default" style={{ background: getHeatColor(val) }}
                                whileHover={{ scale: 1.35, zIndex: 10 }} transition={{ duration: 0.15 }} />
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                <span>Faible</span>
                {["rgba(34,197,94,0.25)", "rgba(245,158,11,0.45)", "rgba(245,158,11,0.75)", "rgba(239,68,68,0.85)"].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-sm" style={{ background: c }} />
                ))}
                <span>Élevé</span>
              </div>
            </>
          )}
        </motion.div>
      );
    }
  };

  return (
    <motion.div className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analyse de vos dépenses alimentaires</p>
        </div>
        <select className="bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all" value={mois} onChange={e => setMois(e.target.value)}>
          {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      <div className="flex gap-1 relative">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative z-10 ${activeTab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
            {activeTab === t.key && (
              <motion.div layoutId="statsTab" className="absolute inset-0 bg-primary/10 rounded-lg -z-10" transition={{ duration: 0.25, ease }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
    </motion.div>
  );
}
