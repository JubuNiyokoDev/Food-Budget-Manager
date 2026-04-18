import { useState } from "react";
import { useGetProduits, useGetBudgets, useCreateAchat } from "@workspace/api-client-react";
import { formatFBu, getMoisCurrent } from "@/lib/format";
import { Plus, Minus, ShoppingCart, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface ProduitItem {
  produit_id: number;
  nom: string;
  unite: string;
  quantite: number;
  prix_unitaire_saisi: number;
  note: string;
}

export default function NouvelAchat() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mois = getMoisCurrent();

  const { data: produits } = useGetProduits() as any;
  const { data: budgets } = useGetBudgets() as any;
  const createAchatMut = useCreateAchat();

  const budgetId = (budgets as any[])?.find((b: any) => b.mois === mois)?.id ?? null;

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lignes, setLignes] = useState<ProduitItem[]>([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const produitActifs = (produits ?? []).filter((p: any) => p.actif);
  const produitsFiltres = search
    ? produitActifs.filter((p: any) => p.nom.toLowerCase().includes(search.toLowerCase()) || p.nom_local?.toLowerCase().includes(search.toLowerCase()))
    : produitActifs;

  const totalMontant = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire_saisi, 0);

  const addProduit = (p: any) => {
    if (lignes.find(l => l.produit_id === p.id)) {
      toast({ title: "Produit déjà ajouté", description: "Modifiez la quantité dans la liste." });
      return;
    }
    setLignes(prev => [...prev, {
      produit_id: p.id,
      nom: p.nom,
      unite: p.unite,
      quantite: 1,
      prix_unitaire_saisi: p.prix_unitaire,
      note: "",
    }]);
    setSearch("");
  };

  const removeLigne = (id: number) => setLignes(prev => prev.filter(l => l.produit_id !== id));

  const updateLigne = (id: number, field: keyof ProduitItem, value: any) =>
    setLignes(prev => prev.map(l => l.produit_id === id ? { ...l, [field]: value } : l));

  const handleSubmit = async () => {
    if (lignes.length === 0) {
      toast({ title: "Aucun produit", description: "Ajoutez au moins un produit à l'achat.", variant: "destructive" });
      return;
    }
    if (!budgetId) {
      toast({ title: "Pas de budget", description: "Aucun budget trouvé pour ce mois.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      for (const l of lignes) {
        await createAchatMut.mutateAsync({
          data: {
            budget_id: budgetId,
            produit_id: l.produit_id,
            date: date,
            quantite: l.quantite,
            prix_unitaire: l.prix_unitaire_saisi,
            montant: l.quantite * l.prix_unitaire_saisi,
            note: l.note || undefined,
          }
        });
      }
      toast({ title: "Achats enregistrés !", description: `${lignes.length} achat(s) enregistré(s)` });
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/budgets"] });
      navigate("/historique");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div>
        <h1 className="text-xl font-bold">Nouvel Achat</h1>
        <p className="text-sm text-muted-foreground">Enregistrez vos achats alimentaires</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <motion.div
            className="bg-card border rounded-lg p-4 space-y-3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="text-sm font-medium">Date d'achat</div>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)}
            />
          </motion.div>

          <motion.div
            className="bg-card border rounded-lg p-4 space-y-3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="text-sm font-medium">Ajouter un produit</div>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {produitsFiltres.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Aucun résultat</div>
              ) : (
                produitsFiltres.slice(0, 25).map((p: any, i: number) => {
                  const isAdded = lignes.some(l => l.produit_id === p.id);
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.25 }}
                      onClick={() => addProduit(p)}
                      disabled={isAdded}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors ${
                        isAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50 hover:text-primary"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{p.emoji && <span className="mr-1">{p.emoji}</span>}{p.nom}</div>
                        <div className="text-xs text-muted-foreground">{formatFBu(p.prix_unitaire)} / {p.unite}</div>
                      </div>
                      {isAdded ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <motion.div
            className="bg-card border rounded-lg overflow-hidden"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Panier ({lignes.length})
              </div>
              <motion.div
                className="text-sm font-bold tabular-nums text-primary"
                key={totalMontant}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {formatFBu(totalMontant)}
              </motion.div>
            </div>

            {lignes.length === 0 ? (
              <motion.div
                className="py-16 text-center text-muted-foreground text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                Cliquez sur un produit à gauche pour l'ajouter
              </motion.div>
            ) : (
              <div className="divide-y">
                <AnimatePresence>
                  {lignes.map(l => (
                    <motion.div
                      key={l.produit_id}
                      className="p-4 space-y-3"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{l.nom}</div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => removeLigne(l.produit_id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Qté ({l.unite})</label>
                          <div className="flex items-center border rounded-md overflow-hidden">
                            <button
                              onClick={() => updateLigne(l.produit_id, "quantite", Math.max(0.1, +(l.quantite - (l.unite === "pièce" ? 1 : 0.1)).toFixed(2)))}
                              className="px-2 py-1.5 hover:bg-muted text-muted-foreground border-r"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step={l.unite === "pièce" ? 1 : 0.1}
                              min={0.1}
                              className="flex-1 text-center py-1.5 text-sm w-0 focus:outline-none bg-background"
                              value={l.quantite}
                              onChange={e => updateLigne(l.produit_id, "quantite", parseFloat(e.target.value) || 1)}
                            />
                            <button
                              onClick={() => updateLigne(l.produit_id, "quantite", +(l.quantite + (l.unite === "pièce" ? 1 : 0.1)).toFixed(2))}
                              className="px-2 py-1.5 hover:bg-muted text-muted-foreground border-l"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Prix unit. (FBu)</label>
                          <input
                            type="number"
                            className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            value={l.prix_unitaire_saisi}
                            onChange={e => updateLigne(l.produit_id, "prix_unitaire_saisi", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Total</label>
                          <div className="border rounded-md px-2 py-1.5 text-sm bg-muted/30 text-primary font-semibold tabular-nums">
                            {formatFBu(l.quantite * l.prix_unitaire_saisi)}
                          </div>
                        </div>
                      </div>
                      <input
                        className="w-full border rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary placeholder-muted-foreground"
                        placeholder="Note (facultatif)"
                        value={l.note}
                        onChange={e => updateLigne(l.produit_id, "note", e.target.value)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {lignes.length > 0 && (
              <motion.div
                className="bg-card border rounded-lg p-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between text-sm font-semibold mb-3">
                  <span>Total de l'achat</span>
                  <span className="text-xl text-primary tabular-nums">{formatFBu(totalMontant)}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Enregistrement..." : `Enregistrer ${lignes.length} achat(s)`}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
