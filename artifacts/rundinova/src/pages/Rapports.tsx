import { useState } from "react";
import { useGenererRapport } from "@workspace/api-client-react";
import { getMoisCurrent, getMoisLabel } from "@/lib/format";
import { FileText, Download, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type RapportFormat = "pdf" | "excel" | "csv" | "json";

const formats: { key: RapportFormat; label: string; ext: string; icon: any; description: string }[] = [
  { key: "pdf", label: "PDF", ext: "pdf", icon: FileText, description: "Rapport complet avec graphiques" },
  { key: "excel", label: "Excel", ext: "xlsx", icon: FileSpreadsheet, description: "Données dans des feuilles de calcul" },
  { key: "csv", label: "CSV", ext: "csv", icon: FileText, description: "Export texte pour analyse" },
  { key: "json", label: "JSON", ext: "json", icon: FileJson, description: "Format de données structurées" },
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

      if (res?.url) {
        const link = document.createElement("a");
        link.href = res.url;
        link.download = res.filename ?? `rapport_rundinova_${mois}.${fmt.ext}`;
        link.click();
      } else if (res?.data) {
        const content = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
        const mimeTypes: Record<RapportFormat, string> = {
          pdf: "application/pdf",
          excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          csv: "text/csv;charset=utf-8;",
          json: "application/json",
        };
        const blob = new Blob([content], { type: mimeTypes[selectedFormat] });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `rapport_rundinova_${mois}.${fmt.ext}`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (res) {
        const content = JSON.stringify(res, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `rapport_rundinova_${mois}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "Rapport généré !", description: `Téléchargement du rapport ${fmt.label}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? "Impossible de générer le rapport", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <h1 className="text-xl font-bold">Rapports</h1>
        <p className="text-sm text-muted-foreground">Générez et exportez vos rapports de budget</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <motion.div
            className="bg-card border rounded-lg p-4 space-y-4"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="text-sm font-medium">Configuration du rapport</div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Période</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={mois}
                onChange={e => setMois(e.target.value)}
              >
                {monthOptions.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Format d'export</label>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.button
                      key={f.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFormat(f.key)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedFormat === f.key
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedFormat === f.key ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className="font-medium text-sm">{f.label}</div>
                        <div className="text-xs text-muted-foreground">{f.description}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? "Génération en cours..." : `Télécharger le rapport ${formats.find(f => f.key === selectedFormat)?.label}`}
          </motion.button>
        </div>

        <motion.div
          className="bg-card border rounded-lg p-4 space-y-4"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="text-sm font-medium">Contenu du rapport</div>
          <div className="text-sm text-muted-foreground capitalize font-medium">{getMoisLabel(mois)}</div>

          <div className="space-y-3">
            {contenuRapport.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.3 }}
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {selectedFormat === "pdf" && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground"
            >
              Le PDF inclut les graphiques et le logo Rundinova. Idéal pour l'impression et le partage.
            </motion.div>
          )}
          {selectedFormat === "excel" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
              Le fichier Excel contient plusieurs feuilles : Résumé, Achats, Produits, Catégories.
            </motion.div>
          )}
          {selectedFormat === "csv" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
              Encodage UTF-8 avec séparateur virgule. Compatible avec tous les tableurs.
            </motion.div>
          )}
          {selectedFormat === "json" && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
              Toutes les données au format JSON structuré. Idéal pour l'intégration avec d'autres outils.
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
