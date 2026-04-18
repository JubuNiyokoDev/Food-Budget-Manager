import { useState } from "react";
import { useGetProduits, useGetBudgets, useCreateAchat } from "@workspace/api-client-react";
import { formatFBu, getMoisCurrent } from "@/lib/format";
import { Plus, Minus, ShoppingCart, X, Check, MapPin } from "lucide-react";
import { IconRenderer } from "@/components/IconRenderer";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface PanierItem {
  produit_id: number;
  nom: string;
  unite: string;
  icon: string;
  quantite: number;
  prix_unitaire_saisi: number;
  lieu_achat: string;
  notes: string;
}

const inputCls = "w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all placeholder-muted-foreground";

export default function NouvelAchat() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const mois = getMoisCurrent();

  const { data: produits } = useGetProduits() as any;
  const { data: budgets } = useGetBudgets() as any;
  const createAchatMut = useCreateAchat();

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lignes, setLignes] = useState<PanierItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCateg, setFilterCateg] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const produitActifs = (produits ?? []).filter((p: any) => p.actif);

  const categories = Array.from(
    new Map(produitActifs.map((p: any) => [p.categorie_id, { id: p.categorie_id, nom: p.categorie_nom, icon: p.categorie_emoji }])).values()
  );

  const produitsFiltres = produitActifs
    .filter((p: any) => filterCateg ? p.categorie_id === filterCateg : true)
    .filter((p: any) => search ? p.nom.toLowerCase().includes(search.toLowerCase()) : true);

  const totalMontant = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire_saisi, 0);

  const addProduit = (p: any) => {
    if (lignes.find(l => l.produit_id === p.id)) {
      toast({ title: "Déjà ajouté", description: "Modifiez la quantité dans le panier." });
      return;
    }
    setLignes(prev => [...prev, {
      produit_id: p.id,
      nom: p.nom,
      unite: p.unite,
      icon: p.emoji ?? "ShoppingCart",
      quantite: 1,
      prix_unitaire_saisi: p.prix_unitaire,
      lieu_achat: "",
      notes: "",
    }]);
    setSearch("");
  };

  const removeLigne = (id: number) => setLignes(prev => prev.filter(l => l.produit_id !== id));
  const updateLigne = (id: number, field: keyof PanierItem, value: any) =>
    setLignes(prev => prev.map(l => l.produit_id === id ? { ...l, [field]: value } : l));

  const handleSubmit = async () => {
    if (lignes.length === 0) {
      toast({ title: "Panier vide", description: "Ajoutez au moins un produit.", variant: "destructive" });
      return;
    }

    const moisDate = date.substring(0, 7);
    const budget = (budgets as any[])?.find((b: any) => b.mois === moisDate);
    if (!budget) {
      toast({ title: "Pas de budget", description: `Aucun budget trouvé pour ${moisDate}. Vérifiez vos paramètres.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      for (const l of lignes) {
        await createAchatMut.mutateAsync({
          data: {
            produit_id: l.produit_id,
            date_achat: date,
            quantite: l.quantite,
            prix_paye: +(l.quantite * l.prix_unitaire_saisi).toFixed(2),
            lieu_achat: l.lieu_achat || undefined,
            notes: l.notes || undefined,
          } as any,
        });
      }
      toast({ title: "Achats enregistrés !", description: `${lignes.length} achat(s) ajouté(s) avec succès` });
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/budgets"] });
      navigate("/alimentaire/historique");
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel Achat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Enregistrez vos achats alimentaires</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 space-y-4">
          <motion.div className="bg-card rounded-2xl shadow-sm p-5 space-y-3"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4, ease }}>
            <div className="text-sm font-semibold">Date d'achat</div>
            <input type="date" className={inputCls} value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)} />
          </motion.div>

          <motion.div className="bg-card rounded-2xl shadow-sm p-5 space-y-3"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4, ease }}>
            <div className="text-sm font-semibold">Ajouter un produit</div>

            <input className={inputCls} placeholder="Rechercher un produit..." value={search}
              onChange={e => setSearch(e.target.value)} />

            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilterCateg(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${!filterCateg ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}>
                Tous
              </button>
              {(categories as any[]).map((c: any) => (
                <button key={c.id} onClick={() => setFilterCateg(c.id === filterCateg ? null : c.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${filterCateg === c.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}>
                  <IconRenderer name={c.icon ?? "Package"} className="w-3 h-3" />
                  {c.nom}
                </button>
              ))}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {produitsFiltres.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">Aucun résultat</div>
              ) : (
                produitsFiltres.slice(0, 40).map((p: any, i: number) => {
                  const isAdded = lignes.some(l => l.produit_id === p.id);
                  return (
                    <motion.button key={p.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.012, duration: 0.2 }}
                      onClick={() => addProduit(p)} disabled={isAdded}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left transition-all ${isAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/60 hover:text-primary"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                          <IconRenderer name={p.emoji ?? "ShoppingCart"} className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium leading-tight">{p.nom}</div>
                          <div className="text-xs text-muted-foreground">{formatFBu(p.prix_unitaire)} / {p.unite}</div>
                        </div>
                      </div>
                      {isAdded
                        ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        : <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <motion.div className="bg-card rounded-2xl shadow-sm overflow-hidden"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4, ease }}>
            <div className="px-5 py-4 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Panier ({lignes.length})
              </div>
              <motion.div className="text-sm font-bold tabular-nums text-primary"
                key={totalMontant} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                {formatFBu(totalMontant)}
              </motion.div>
            </div>

            {lignes.length === 0 ? (
              <motion.div className="py-20 text-center text-muted-foreground text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}>
                Sélectionnez un produit à gauche pour commencer
              </motion.div>
            ) : (
              <div className="divide-y divide-border/20">
                <AnimatePresence>
                  {lignes.map(l => (
                    <motion.div key={l.produit_id} className="p-5 space-y-3"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <IconRenderer name={l.icon} className="w-4 h-4 text-primary" />
                          </div>
                          <div className="font-semibold text-sm">{l.nom}</div>
                        </div>
                        <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeLigne(l.produit_id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 font-medium uppercase tracking-wide">Qté ({l.unite})</label>
                          <div className="flex items-center bg-muted/50 rounded-xl overflow-hidden">
                            <button onClick={() => updateLigne(l.produit_id, "quantite", Math.max(0.1, +(l.quantite - (l.unite === "pièce" ? 1 : 0.1)).toFixed(2)))}
                              className="px-2.5 py-2 hover:bg-muted text-muted-foreground transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <input type="number" step={l.unite === "pièce" ? 1 : 0.1} min={0.1}
                              className="flex-1 text-center py-2 text-sm w-0 focus:outline-none bg-transparent"
                              value={l.quantite} onChange={e => updateLigne(l.produit_id, "quantite", parseFloat(e.target.value) || 1)} />
                            <button onClick={() => updateLigne(l.produit_id, "quantite", +(l.quantite + (l.unite === "pièce" ? 1 : 0.1)).toFixed(2))}
                              className="px-2.5 py-2 hover:bg-muted text-muted-foreground transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 font-medium uppercase tracking-wide">Prix unit. (FBu)</label>
                          <input type="number" className={inputCls} value={l.prix_unitaire_saisi}
                            onChange={e => updateLigne(l.produit_id, "prix_unitaire_saisi", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 font-medium uppercase tracking-wide">Sous-total</label>
                          <div className="bg-primary/10 rounded-xl px-3 py-2.5 text-sm text-primary font-bold tabular-nums">
                            {formatFBu(l.quantite * l.prix_unitaire_saisi)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input className={`${inputCls} pl-8`} placeholder="Lieu d'achat (optionnel)"
                            value={l.lieu_achat} onChange={e => updateLigne(l.produit_id, "lieu_achat", e.target.value)} />
                        </div>
                        <input className={inputCls} placeholder="Note (facultatif)"
                          value={l.notes} onChange={e => updateLigne(l.produit_id, "notes", e.target.value)} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {lignes.length > 0 && (
              <motion.div className="bg-card rounded-2xl shadow-sm p-5"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-muted-foreground">Total de l'achat</span>
                  <motion.span className="text-2xl font-bold text-primary tabular-nums"
                    key={totalMontant} initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                    {formatFBu(totalMontant)}
                  </motion.span>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
                  {submitting ? "Enregistrement..." : `Enregistrer ${lignes.length} achat(s) — ${formatFBu(totalMontant)}`}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
