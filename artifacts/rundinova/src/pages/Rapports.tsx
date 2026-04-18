import { useState } from "react";
import { useGenererRapport } from "@workspace/api-client-react";
import { getMoisCurrent, getMoisLabel, formatFBu } from "@/lib/format";
import { FileText, Download, FileSpreadsheet, FileJson, Loader2, CheckCircle2, Globe, TrendingUp, TrendingDown, ShoppingCart, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type RapportFormat = "pdf" | "excel" | "csv" | "json";

const formats: { key: RapportFormat; label: string; ext: string; icon: any; description: string; mime: string; badge: string }[] = [
  { key: "pdf", label: "HTML / PDF", ext: "html", icon: Globe, description: "Rapport visuel haute qualité, imprimable", mime: "text/html;charset=utf-8", badge: "Pro" },
  { key: "excel", label: "Excel", ext: "xlsx", icon: FileSpreadsheet, description: "4 feuilles : résumé, achats, catégories, journalier", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", badge: "Complet" },
  { key: "csv", label: "CSV", ext: "csv", icon: FileText, description: "Compatible tous les tableurs, UTF-8 avec BOM", mime: "text/csv;charset=utf-8;", badge: "Universel" },
  { key: "json", label: "JSON", ext: "json", icon: FileJson, description: "Données complètes structurées avec métadonnées", mime: "application/json", badge: "Dev" },
];

const monthOptions = Array.from({ length: 18 }, (_, i) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { val, label };
});

export default function Rapports() {
  const { toast } = useToast();
  const [mois, setMois] = useState(getMoisCurrent());
  const [selectedFormat, setSelectedFormat] = useState<RapportFormat>("pdf");
  const [loading, setLoading] = useState(false);
  const [lastKpi, setLastKpi] = useState<any>(null);
  const [lastTitre, setLastTitre] = useState<string>("");

  const genererRapportMut = useGenererRapport();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await genererRapportMut.mutateAsync({ data: { mois, format: selectedFormat } });
      const fmt = formats.find(f => f.key === selectedFormat)!;
      const res = result as any;

      if (!res?.success) throw new Error(res?.message ?? "Erreur inconnue lors de la génération");

      if (res?.kpi) {
        setLastKpi(res.kpi);
        setLastTitre(res.titre ?? "");
      }

      if (res?.contenu_base64) {
        const binary = atob(res.contenu_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: fmt.mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.nom_fichier ?? `rapport_rundinova_${mois}.${fmt.ext}`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: "Rapport téléchargé !", description: `${res.titre ?? fmt.label} — ${getMoisLabel(mois)}` });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Impossible de générer le rapport";
      toast({ title: "Erreur de génération", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedFmt = formats.find(f => f.key === selectedFormat)!;

  return (
    <motion.div className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Générez et exportez vos rapports de budget alimentaire</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <motion.div className="bg-card rounded-2xl shadow-sm p-5 space-y-5"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4, ease }}>

            <div className="text-sm font-semibold">Configuration du rapport</div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Période</label>
              <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all capitalize" value={mois} onChange={e => setMois(e.target.value)}>
                {monthOptions.map(m => <option key={m.val} value={m.val} className="capitalize">{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Format d'export</label>
              <div className="grid grid-cols-2 gap-2.5">
                {formats.map((f, i) => {
                  const Icon = f.icon;
                  const isSelected = selectedFormat === f.key;
                  return (
                    <motion.button key={f.key}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFormat(f.key)}
                      className={`relative flex items-start gap-3 p-4 rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                      }`}>
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSelected ? "text-primary" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{f.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {f.badge}
                          </span>
                        </div>
                        <div className="text-xs opacity-70 mt-0.5 leading-snug">{f.description}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary absolute top-3 right-3" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleGenerate} disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "Génération en cours..." : `Télécharger — ${selectedFmt.label} (${getMoisLabel(mois)})`}
            </motion.button>
          </motion.div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {lastKpi ? (
              <motion.div key="kpi" className="bg-card rounded-2xl shadow-sm p-5 space-y-4"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease }}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Rapport généré
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{lastTitre}</div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="w-3.5 h-3.5" /> Achats</div>
                    <span className="text-sm font-semibold tabular-nums">{lastKpi.nombre_achats}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" /> Budget</div>
                    <span className="text-sm font-semibold tabular-nums">{formatFBu(lastKpi.budget_total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="w-3.5 h-3.5" /> Dépensé</div>
                    <span className="text-sm font-semibold tabular-nums text-primary">{formatFBu(lastKpi.total_depense)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Restant</div>
                    <span className={`text-sm font-semibold tabular-nums ${lastKpi.restant >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatFBu(Math.abs(lastKpi.restant))}{lastKpi.restant < 0 ? " (dépassé)" : ""}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Consommation</span>
                    <span className="font-semibold">{lastKpi.pct_consomme}%</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2">
                    <motion.div
                      className={`h-full rounded-full ${lastKpi.pct_consomme >= 100 ? "bg-red-500" : lastKpi.pct_consomme >= 80 ? "bg-amber-500" : "bg-green-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(lastKpi.pct_consomme, 100)}%` }}
                      transition={{ duration: 1, ease }} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="info" className="bg-card rounded-2xl shadow-sm p-5 space-y-4"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease }}>
                <div className="text-sm font-semibold">Contenu inclus</div>
                <div className="text-sm text-muted-foreground capitalize font-medium">{getMoisLabel(mois)}</div>
                <div className="space-y-3">
                  {[
                    { label: "Résumé KPI", desc: "Budget, dépenses, projection" },
                    { label: "Répartition catégories", desc: "Pourcentages par catégorie" },
                    { label: "Dépenses journalières", desc: "Évolution sur le mois" },
                    { label: "Détail des achats", desc: "Toutes les lignes d'achat" },
                  ].map((item, i) => (
                    <motion.div key={i} className="flex items-start gap-3"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07, duration: 0.3 }}>
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground leading-relaxed">
                  {selectedFormat === "pdf"
                    ? "Rapport HTML professionnel. Ouvrez-le dans un navigateur et imprimez → Enregistrer en PDF."
                    : selectedFormat === "excel"
                    ? "4 feuilles de calcul : Résumé, Achats, Par catégorie, Par jour."
                    : selectedFormat === "csv"
                    ? "Encodage UTF-8 avec BOM, séparateur point-virgule."
                    : "Données structurées complètes avec métadonnées, KPI, et achats."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
