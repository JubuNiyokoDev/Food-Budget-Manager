import { useState } from "react";
import {
  useGetProduits, useGetCategories, useCreateProduit, useUpdateProduit, useDeleteProduit,
  useGetBudgets, useGetBudget, useUpdateBudgetProduits
} from "@workspace/api-client-react";
import { formatFBu, getMoisCurrent, getProgressColor } from "@/lib/format";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
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
    .filter(p => showInactif ? true : p.actif)
    .filter(p => filterCateg ? p.categorie_id === filterCateg : true);

  const grouped: Record<string, Produit[]> = {};
  filteredProduits.forEach(p => {
    const k = p.categorie_nom ?? `Catégorie ${p.categorie_id}`;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(p);
  });

  const getBP = (produitId: number) => budgetProduits.find((b: any) => b.produit_id === produitId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["getProduits"] });
    qc.invalidateQueries({ queryKey: ["getBudget"] });
    qc.invalidateQueries({ queryKey: ["getDashboard"] });
  };

  const handleSaveProduit = async () => {
    if (!modalProduit?.nom || !modalProduit.categorie_id) return;
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
      qc.invalidateQueries({ queryKey: ["getBudget"] });
      qc.invalidateQueries({ queryKey: ["getDashboard"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground">{(produits ?? []).length} produits enregistrés</p>
        </div>
        <button
          onClick={() => setModalProduit({ actif: true })}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nouveau produit
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCateg(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filterCateg ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"}`}
        >
          Toutes
        </button>
        {(categories ?? []).map((c: any) => (
          <button
            key={c.id}
            onClick={() => setFilterCateg(c.id === filterCateg ? null : c.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterCateg === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"}`}
          >
            {c.icone} {c.nom}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
          <input type="checkbox" checked={showInactif} onChange={e => setShowInactif(e.target.checked)} />
          Afficher inactifs
        </label>
      </div>

      {/* Table by category */}
      {Object.entries(grouped).map(([catNom, items]) => (
        <div key={catNom} className="bg-card border rounded-lg overflow-hidden">
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
              {items.map(p => {
                const bp = getBP(p.id);
                const budgetM = bp?.budget_mensuel ?? null;
                const depense = bp?.total_depense ?? 0;
                const pct = budgetM ? Math.round((depense / budgetM) * 100) : 0;

                return (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${!p.actif ? "opacity-50" : ""}`}>
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
                        <button
                          onClick={() => setModalProduit({ ...p })}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduit(p.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {filteredProduits.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Aucun produit trouvé</div>
      )}

      {/* Modal Produit */}
      {modalProduit !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalProduit(null)}>
          <div className="bg-card border rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
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
                    <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
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
                    {["kg", "g", "L", "mL", "pièce", "botte", "sac", "boîte", "paquet"].map(u => (
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
                    checked={modalProduit.actif ?? true}
                    onChange={e => setModalProduit(prev => ({ ...prev, actif: e.target.checked }))}
                  />
                  Produit actif
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalProduit(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Annuler</button>
              <button onClick={handleSaveProduit} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Budget */}
      {modalBudget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalBudget(null)}>
          <div className="bg-card border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
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
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalBudget(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Annuler</button>
              <button onClick={handleSaveBudget} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
