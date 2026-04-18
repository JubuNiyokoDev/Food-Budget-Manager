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

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const modalBg = "fixed inset-0 z-50 flex items-center justify-center";
const overlay = "absolute inset-0 bg-black/50 backdrop-blur-sm";
const modalCard = "relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4";

const modalV = {
  hidden: { opacity: 0, scale: 0.93, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease } },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.18 } },
};

const inputCls = "w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all placeholder-muted-foreground";
const selectCls = inputCls;

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

export default function Produits() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const mois = getMoisCurrent();

  const { data: produits } = useGetProduits() as any;
  const { data: categories } = useGetCategories() as any;
  const { data: budgets } = useGetBudgets() as any;
  const budgetId = (budgets as any[])?.find((b: any) => b.mois === mois)?.id ?? null;
  const { data: budgetDetail } = useGetBudget(budgetId ?? 0, { query: { enabled: !!budgetId } }) as any;

  const createMut = useCreateProduit();
  const updateMut = useUpdateProduit();
  const deleteMut = useDeleteProduit();
  const updateBudgetMut = useUpdateBudgetProduits();

  const [filterCateg, setFilterCateg] = useState<number | null>(null);
  const [showInactif, setShowInactif] = useState(false);
  const [modalProduit, setModalProduit] = useState<any | null>(null);
  const [modalBudget, setModalBudget] = useState<{ produitId: number; current: number | null; nom: string } | null>(null);
  const [budgetInput, setBudgetInput] = useState("");

  const budgetProduits: any[] = budgetDetail?.produits ?? [];

  const filteredProduits = (produits ?? [])
    .filter((p: any) => showInactif ? true : p.actif)
    .filter((p: any) => filterCateg ? p.categorie_id === filterCateg : true);

  const grouped: Record<string, any[]> = {};
  filteredProduits.forEach((p: any) => {
    const k = p.categorie_nom ?? `Catégorie ${p.categorie_id}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  });

  const getBP = (id: number) => budgetProduits.find((b: any) => b.produit_id === id);

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
        await updateMut.mutateAsync({ id: modalProduit.id, data: modalProduit });
        toast({ title: "Produit mis à jour" });
      } else {
        await createMut.mutateAsync({ data: modalProduit });
        toast({ title: "Produit créé" });
      }
      setModalProduit(null);
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteMut.mutateAsync({ id });
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
      await updateBudgetMut.mutateAsync({ id: budgetId, data: { produit_id: modalBudget.produitId, budget_mensuel: val } });
      toast({ title: "Budget mis à jour" });
      setModalBudget(null);
      qc.invalidateQueries({ queryKey: ["/api/budgets"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <motion.div className="p-6 space-y-5"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{(produits ?? []).length} produits enregistrés</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModalProduit({ actif: true })}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 shadow-sm transition-colors">
          <Plus className="w-4 h-4" />
          Nouveau produit
        </motion.button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => setFilterCateg(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${!filterCateg ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          Toutes
        </motion.button>
        {(categories ?? []).map((c: any) => (
          <motion.button key={c.id} whileTap={{ scale: 0.95 }}
            onClick={() => setFilterCateg(c.id === filterCateg ? null : c.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm ${filterCateg === c.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {c.emoji} {c.nom}
          </motion.button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
          <input type="checkbox" checked={showInactif} onChange={e => setShowInactif(e.target.checked)} />
          Afficher inactifs
        </label>
      </div>

      {Object.entries(grouped).map(([catNom, items], gi) => (
        <motion.div key={catNom} className="bg-card rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.06, duration: 0.38, ease }}>
          <div className="px-5 py-3 bg-muted/30 text-sm font-semibold flex items-center gap-2">
            <span>{catNom}</span>
            <span className="text-muted-foreground font-normal text-xs">({items.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/10">
                <th className="text-left px-5 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">Produit</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">Unité</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">Prix unit.</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">Budget</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide">Dépensé</th>
                <th className="px-4 py-2.5 text-muted-foreground font-medium text-xs uppercase tracking-wide w-32">Progression</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {items.map((p: any, ri: number) => {
                const bp = getBP(p.id);
                const budgetM = bp?.budget_mensuel ?? null;
                const depense = bp?.total_depense ?? 0;
                const pct = budgetM ? Math.round((depense / budgetM) * 100) : 0;
                return (
                  <motion.tr key={p.id}
                    className={`hover:bg-muted/20 transition-colors ${!p.actif ? "opacity-50" : ""}`}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: p.actif ? 1 : 0.5, x: 0 }}
                    transition={{ delay: gi * 0.05 + ri * 0.025, duration: 0.3 }}>
                    <td className="px-5 py-3">
                      <div className="font-medium">{p.nom}</div>
                      {!p.actif && <div className="text-xs text-muted-foreground">Inactif</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.unite}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatFBu(p.prix_unitaire)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {budgetM != null ? (
                        <button onClick={() => { setModalBudget({ produitId: p.id, current: budgetM, nom: p.nom }); setBudgetInput(String(budgetM)); }}
                          className="text-primary hover:underline tabular-nums">{formatFBu(budgetM)}</button>
                      ) : (
                        <button onClick={() => { setModalBudget({ produitId: p.id, current: null, nom: p.nom }); setBudgetInput(""); }}
                          className="text-muted-foreground hover:text-primary text-xs transition-colors">Définir</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary font-semibold">{formatFBu(depense)}</td>
                    <td className="px-4 py-3">
                      {budgetM != null && (
                        <div className="space-y-1">
                          <ProgressBar pct={pct} />
                          <div className="text-xs text-muted-foreground text-right">{pct}%</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setModalProduit({ ...p })}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
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
        <motion.div className="text-center py-16 text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Aucun produit trouvé
        </motion.div>
      )}

      <AnimatePresence>
        {modalProduit !== null && (
          <motion.div className={modalBg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setModalProduit(null)}>
            <div className={overlay} />
            <motion.div className={modalCard} variants={modalV} initial="hidden" animate="show" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{modalProduit.id ? "Modifier le produit" : "Nouveau produit"}</h2>
                <button onClick={() => setModalProduit(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Nom *</label>
                  <input className={inputCls} value={modalProduit.nom ?? ""} onChange={e => setModalProduit((p: any) => ({ ...p, nom: e.target.value }))} placeholder="Riz, Pain..." autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Catégorie *</label>
                  <select className={selectCls} value={modalProduit.categorie_id ?? ""} onChange={e => setModalProduit((p: any) => ({ ...p, categorie_id: parseInt(e.target.value) }))}>
                    <option value="">Sélectionner...</option>
                    {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.emoji} {c.nom}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Unité</label>
                    <select className={selectCls} value={modalProduit.unite ?? "kg"} onChange={e => setModalProduit((p: any) => ({ ...p, unite: e.target.value }))}>
                      {["kg", "g", "L", "mL", "pièce", "botte", "sac", "boîte", "paquet", "lot", "achat", "unité", "jour"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Prix unit. (FBu)</label>
                    <input type="number" className={inputCls} value={modalProduit.prix_unitaire ?? ""} onChange={e => setModalProduit((p: any) => ({ ...p, prix_unitaire: parseFloat(e.target.value) }))} placeholder="0" />
                  </div>
                </div>
                {modalProduit.id && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!modalProduit.actif} onChange={e => setModalProduit((p: any) => ({ ...p, actif: e.target.checked }))} />
                    Produit actif
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalProduit(null)} className="px-4 py-2.5 text-sm rounded-xl bg-muted/50 hover:bg-muted transition-colors">Annuler</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveProduit} disabled={updateMut.isPending || createMut.isPending}
                  className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {(updateMut.isPending || createMut.isPending) ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalBudget !== null && (
          <motion.div className={modalBg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setModalBudget(null)}>
            <div className={overlay} />
            <motion.div className="relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4" variants={modalV} initial="hidden" animate="show" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Budget mensuel</h2>
                <button onClick={() => setModalBudget(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground">{modalBudget.nom}</p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Montant (FBu)</label>
                <input type="number" className={inputCls} value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="Ex: 50000" autoFocus />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalBudget(null)} className="px-4 py-2.5 text-sm rounded-xl bg-muted/50 hover:bg-muted transition-colors">Annuler</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveBudget} disabled={updateBudgetMut.isPending}
                  className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {updateBudgetMut.isPending ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
