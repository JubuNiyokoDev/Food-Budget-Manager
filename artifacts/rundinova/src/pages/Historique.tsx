import { useState } from "react";
import { useGetAchats, useGetProduits, useGetCategories, useDeleteAchat, useBulkDeleteAchats } from "@workspace/api-client-react";
import { formatFBu, formatDate, getMoisCurrent } from "@/lib/format";
import { Trash2, Search, Filter, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { IconRenderer } from "@/components/IconRenderer";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function Historique() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [moisFilter, setMoisFilter] = useState(getMoisCurrent());
  const [produitFilter, setProduitFilter] = useState<number | null>(null);
  const [categorieFilter, setCategorieFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const params: any = { mois: moisFilter };
  if (produitFilter) params.produit_id = produitFilter;
  if (categorieFilter) params.categorie_id = categorieFilter;

  const { data: achatsResp } = useGetAchats(params) as any;
  const { data: produits } = useGetProduits() as any;
  const { data: categories } = useGetCategories() as any;
  const deleteAchatMut = useDeleteAchat();
  const bulkDeleteMut = useBulkDeleteAchats();

  const achatsList: any[] = achatsResp?.data ?? achatsResp ?? [];

  const filtered = achatsList.filter((a: any) => {
    if (!search) return true;
    return a.produit_nom?.toLowerCase().includes(search.toLowerCase()) ||
           a.notes?.toLowerCase().includes(search.toLowerCase()) ||
           a.lieu_achat?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalMontant = filtered.reduce((s: number, a: any) => s + (a.prix_paye ?? 0), 0);

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(selected.length === paginated.length && paginated.length > 0 ? [] : paginated.map((a: any) => a.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/achats"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/budgets"] });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet achat ?")) return;
    try {
      await deleteAchatMut.mutateAsync({ id });
      toast({ title: "Achat supprimé" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selected.length} achat(s) ?`)) return;
    try {
      await bulkDeleteMut.mutateAsync({ data: { ids: selected } });
      toast({ title: `${selected.length} achat(s) supprimé(s)` });
      setSelected([]);
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const monthOptions = Array.from({ length: 18 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { val, label };
  });

  const inputCls = "bg-muted/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all";

  return (
    <motion.div className="p-6 space-y-5"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique des achats</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} achat(s) — Total : <span className="font-semibold text-primary">{formatFBu(totalMontant)}</span>
          </p>
        </div>
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2 }}
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors shadow-sm">
              <Trash2 className="w-4 h-4" />
              Supprimer ({selected.length})
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <select className={inputCls} value={moisFilter} onChange={e => { setMoisFilter(e.target.value); setPage(1); setSelected([]); }}>
          {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select className={inputCls} value={categorieFilter ?? ""} onChange={e => { setCategorieFilter(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}>
          <option value="">Toutes les catégories</option>
          {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className={inputCls} value={produitFilter ?? ""} onChange={e => { setProduitFilter(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}>
          <option value="">Tous les produits</option>
          {(produits ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto bg-muted/50 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            className="bg-transparent text-sm focus:outline-none w-44 placeholder-muted-foreground"
            placeholder="Rechercher..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selected.length === paginated.length && paginated.length > 0} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Produit</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Catégorie</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Lieu</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Qté</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Prix payé</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Notes</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-muted-foreground">Aucun achat trouvé pour cette période</td>
              </tr>
            ) : (
              paginated.map((a: any, i: number) => (
                <motion.tr
                  key={a.id}
                  className={`hover:bg-muted/20 transition-colors ${selected.includes(a.id) ? "bg-primary/5" : ""}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.3, ease }}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">{formatDate(a.date_achat)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                        <IconRenderer name={a.produit_emoji ?? "ShoppingCart"} className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{a.produit_nom ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.categorie_nom ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: (a.categorie_couleur ?? "#6B7280") + "20", color: a.categorie_couleur ?? "#6B7280" }}>
                        {a.categorie_nom}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {a.lieu_achat ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {a.lieu_achat}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{a.quantite} {a.unite}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">{formatFBu(a.prix_paye)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-32 truncate">{a.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages} — {filtered.length} résultats</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
