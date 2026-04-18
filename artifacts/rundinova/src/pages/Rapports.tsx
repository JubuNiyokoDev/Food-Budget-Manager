import { useState } from "react";
import { useGenererRapport } from "@workspace/api-client-react";
import { getMoisCurrent, getMoisLabel } from "@/lib/format";
import { FileText, Download, FileSpreadsheet, FileJson, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type RapportFormat = "pdf" | "excel" | "csv" | "json";

const formats: { key: RapportFormat; label: string; ext: string; icon: any; description: string; mime: string }[] = [
  { key: "pdf", label: "PDF", ext: "txt", icon: FileText, description: "Rapport texte complet", mime: "text/plain" },
  { key: "excel", label: "Excel", ext: "xlsx", icon: FileSpreadsheet, description: "Feuilles de calcul", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { key: "csv", label: "CSV", ext: "csv", icon: FileText, description: "Export pour tableur", mime: "text/csv;charset=utf-8;" },
  { key: "json", label: "JSON", ext: "json", icon: FileJson, description: "Données structurées", mime: "application/json" },
];

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { val, label };
});

const contenuRapport = [
  { label: "Résumé KPI", desc: "Budget, dépenses, projection fin de mois" },
  { label: "Détail par produit", desc: "Toutes les lignes d'achat avec quantités" },
  { label: "Répartition par catégorie", desc: "Pourcentages et totaux par catégorie" },
  { label: "Évolution journalière", desc: "Courbe des dépenses sur le mois" },
  { label: "Alertes et dépassements", desc: "Produits dépassant le budget alloué" },
];

export default function Rapports() {
  const { toast } = useToast();
  const [mois, setMois] = useState(getMoisCurrent());
  const [selectedFormat, setSelectedFormat] = useState<RapportFormat>("json");
  const [loading, setLoading] = useState(false);

  const genererRapportMut = useGenererRapport();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await genererRapportMut.mutateAsync({ data: { mois, format: selectedFormat } });
      const fmt = formats.find(f => f.key === selectedFormat)!;
      const res = result as any;

      if (!res?.success) {
        throw new Error(res?.message ?? "Erreur inconnue lors de la génération");
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
      } else if (res?.url) {
        const link = document.createElement("a");
        link.href = res.url;
        link.download = res.filename ?? `rapport_rundinova_${mois}.${fmt.ext}`;
        link.click();
      }

      toast({ title: "Rapport téléchargé !", description: `${res.titre ?? fmt.label} — ${getMoisLabel(mois)}` });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Impossible de générer le rapport";
      toast({ title: "Erreur de génération", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Générez et exportez vos rapports de budget</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="space-y-4">
          <motion.div className="bg-card rounded-2xl shadow-sm p-5 space-y-5"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4, ease }}>
            <div className="text-sm font-semibold">Configuration du rapport</div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Période</label>
              <select className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all" value={mois} onChange={e => setMois(e.target.value)}>
                {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Format d'export</label>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.button key={f.key}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFormat(f.key)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all ${
                        selectedFormat === f.key
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                          : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                      }`}>
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedFormat === f.key ? "text-primary" : ""}`} />
                      <div>
                        <div className="font-semibold text-sm">{f.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{f.description}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? "Génération en cours..." : `Télécharger le rapport ${formats.find(f => f.key === selectedFormat)?.label}`}
          </motion.button>
        </div>

        <motion.div className="bg-card rounded-2xl shadow-sm p-5 space-y-5"
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4, ease }}>
          <div className="text-sm font-semibold">Contenu du rapport</div>
          <div className="text-sm text-muted-foreground capitalize font-medium">{getMoisLabel(mois)}</div>

          <div className="space-y-3.5">
            {contenuRapport.map((item, i) => (
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

          <AnimatePresence mode="wait">
            {selectedFormat === "pdf" && (
              <motion.div key="pdf" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                Généré en format texte (.txt) avec mise en forme lisible. Idéal pour impression rapide.
              </motion.div>
            )}
            {selectedFormat === "excel" && (
              <motion.div key="excel" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                Fichier Excel avec feuilles Achats et Résumé. Compatible Excel, LibreOffice, Google Sheets.
              </motion.div>
            )}
            {selectedFormat === "csv" && (
              <motion.div key="csv" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                Encodage UTF-8, séparateur point-virgule. Compatible avec tous les tableurs.
              </motion.div>
            )}
            {selectedFormat === "json" && (
              <motion.div key="json" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3.5 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                Toutes les données structurées en JSON. Idéal pour intégration avec d'autres outils.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
