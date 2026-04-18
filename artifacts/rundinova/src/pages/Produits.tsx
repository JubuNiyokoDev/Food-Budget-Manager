import { useState } from "react";
import {
  useGetProduits, useGetCategories, useCreateProduit, useUpdateProduit, useDeleteProduit,
  useGetBudgets, useGetBudget, useUpdateBudgetProduits
} from "@workspace/api-client-react";
import { formatFBu, getMoisCurrent, getProgressColor } from "@/lib/format";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface Produit {
  id: number;
  nom: string;
  categorie_id: number;
  categorie_nom?: string;
  unite: string;
  prix_unitaire: number;
  actif: boolean;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = getProgressColor(pct);
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.95, y: 6, transition: { duration: 0.18 } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export default function Produits() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const mois = getMoisCurrent();

  const { data: produits } = useGetProduits() as any;
  const { data: categories } = useGetCategories() as any;
  const { data: budgets } = useGetBudgets() as any;
  const budgetId = (budgets as any[])?.find((b: any) => b.mois === mois)?.id ?? null;
  const { data: budgetDetail } = useGetBudget(budgetId ?? 0, { query: { enabled: !!budgetId } }) as any;

  const createProduitMut = useCreateProduit();
  const updateProduitMut = useUpdateProduit();
  const deleteProduitMut = useDeleteProduit();
  const updateBudgetProduitsMut = useUpdateBudgetProduits();

  const [filterCateg, setFilterCateg] = useState<number | null>(null);
  const [showInactif, setShowInactif] = useState(false);
  const [modalProduit, setModalProduit] = useState<Partial<Produit> | null>(null);
  const [modalBudget, setModalBudget] = useState<{ produitId: number; current: number | null; nom: string } | null>(null);
  const [budgetInput, setBudgetInput] = useState("");

  const budgetProduits: any[] = budgetDetail?.produits ?? [];

  const filteredProduits = (produits ?? [])
    .filter((p: any) => showInactif ? true : p.actif)
    .filter((p: any) => filterCateg ? p.categorie_id === filterCateg : true);

  const grouped: Record<string, Produit[]> = {};
  filteredProduits.forEach((p: any) => {
    const k = p.categorie_nom ?? `Catégorie ${p.categorie_id}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  });

  const getBP = (produitId: number) => budgetProduits.find((b: any) => b.produit_id === produitId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/produits"] });
    qc.invalidateQueries({ queryKey: ["/api/budgets"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const handleSaveProduit = async () => {
    if (!modalProduit?.nom || !modalProduit.categorie_id) {
      toast({ title: "Champs requis", description: "Nom et catégorie sont obligatoires.", variant: "destructive" });
      return;
    }
    try {
      if (modalProduit.id) {
        await updateProduitMut.mutateAsync({ id: modalProduit.id, data: modalProduit as any });
        toast({ title: "Produit mis à jour" });
      } else {
        await createProduitMut.mutateAsync({ data: modalProduit as any });
        toast({ title: "Produit créé" });
      }
      setModalProduit(null);
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteProduit = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduitMut.mutateAsync({ id });
      toast({ title: "Produit supprimé" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveBudget = async () => {
    if (!modalBudget || !budgetId) return;
    const val = parseInt(budgetInput.replace(/\s/g, ""), 10);
    if (isNaN(val) || val < 0) return;
    try {
      await updateBudgetProduitsMut.mutateAsync({
        id: budgetId,
        data: { produit_id: modalBudget.produitId, budget_mensuel: val }
      });
      toast({ title: "Budget mis à jour" });
      setModalBudget(null);
      qc.invalidateQueries({ queryKey: ["/api/budgets"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      className="p-6 space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{(produits ?? []).length} produits enregistrés</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalProduit({ actif: true })}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nouveau produit
        </motion.button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCateg(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filterCateg ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"}`}
        >
          Toutes
        </button>
        {(categories ?? []).map((c: any) => (
          <motion.button
            key={c.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterCateg(c.id === filterCateg ? null : c.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCateg === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"}`}
          >
            {c.emoji} {c.nom}
          </motion.button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
          <input type="checkbox" checked={showInactif} onChange={e => setShowInactif(e.target.checked)} />
          Afficher inactifs
        </label>
      </div>

      {Object.entries(grouped).map(([catNom, items], gi) => (
        <motion.div
          key={catNom}
          className="bg-card border rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.06, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="px-4 py-2 bg-muted/40 border-b text-sm font-semibold flex items-center gap-2">
            <span>{catNom}</span>
            <span className="text-muted-foreground font-normal">({items.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Produit</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Unité</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Prix unit.</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Budget mois</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Dépensé</th>
                <th className="px-4 py-2 text-muted-foreground font-medium w-32">Progression</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p: any, ri: number) => {
                const bp = getBP(p.id);
                const budgetM = bp?.budget_mensuel ?? null;
                const depense = bp?.total_depense ?? 0;
                const pct = budgetM ? Math.round((depense / budgetM) * 100) : 0;

                return (
                  <motion.tr
                    key={p.id}
                    className={`border-b last:border-0 hover:bg-muted/20 ${!p.actif ? "opacity-50" : ""}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: p.actif ? 1 : 0.5, x: 0 }}
                    transition={{ delay: gi * 0.05 + ri * 0.03, duration: 0.3 }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.nom}</div>
                      {!p.actif && <div className="text-xs text-muted-foreground">Inactif</div>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.unite}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatFBu(p.prix_unitaire)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {budgetM != null ? (
                        <button
                          onClick={() => { setModalBudget({ produitId: p.id, current: budgetM, nom: p.nom }); setBudgetInput(String(budgetM)); }}
                          className="text-primary hover:underline tabular-nums"
                        >
                          {formatFBu(budgetM)}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setModalBudget({ produitId: p.id, current: null, nom: p.nom }); setBudgetInput(""); }}
                          className="text-muted-foreground hover:text-primary text-xs"
                        >
                          Définir
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-primary">{formatFBu(depense)}</td>
                    <td className="px-4 py-2.5">
                      {budgetM != null && (
                        <div className="space-y-1">
                          <ProgressBar pct={pct} />
                          <div className="text-xs text-muted-foreground text-right">{pct}%</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setModalProduit({ ...p })}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteProduit(p.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      ))}

      {filteredProduits.length === 0 && (
        <motion.div
          className="text-center py-12 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Aucun produit trouvé
        </motion.div>
      )}

      <AnimatePresence>
        {modalProduit !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            variants={overlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={() => setModalProduit(null)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              className="relative bg-card border rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4"
              variants={modalVariants}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{modalProduit.id ? "Modifier le produit" : "Nouveau produit"}</h2>
                <button onClick={() => setModalProduit(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Nom *</label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={modalProduit.nom ?? ""}
                    onChange={e => setModalProduit(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Riz, Pain..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Catégorie *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={modalProduit.categorie_id ?? ""}
                    onChange={e => setModalProduit(prev => ({ ...prev, categorie_id: parseInt(e.target.value) }))}
                  >
                    <option value="">Sélectionner...</option>
                    {(categories ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Unité</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={modalProduit.unite ?? "kg"}
                      onChange={e => setModalProduit(prev => ({ ...prev, unite: e.target.value }))}
                    >
                      {["kg", "g", "L", "mL", "pièce", "botte", "sac", "boîte", "paquet", "lot", "achat", "unité", "jour"].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Prix unitaire (FBu)</label>
                    <input
                      type="number"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={modalProduit.prix_unitaire ?? ""}
                      onChange={e => setModalProduit(prev => ({ ...prev, prix_unitaire: parseFloat(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                {modalProduit.id && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(modalProduit.actif)}
                      onChange={e => setModalProduit(prev => ({ ...prev, actif: e.target.checked }))}
                    />
                    Produit actif
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalProduit(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Annuler</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveProduit}
                  disabled={updateProduitMut.isPending || createProduitMut.isPending}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {(updateProduitMut.isPending || createProduitMut.isPending) ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalBudget !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            variants={overlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={() => setModalBudget(null)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              className="relative bg-card border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4"
              variants={modalVariants}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Budget mensuel — {modalBudget.nom}</h2>
                <button onClick={() => setModalBudget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Montant (FBu)</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Ex: 50000"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalBudget(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Annuler</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveBudget}
                  disabled={updateBudgetProduitsMut.isPending}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {updateBudgetProduitsMut.isPending ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
