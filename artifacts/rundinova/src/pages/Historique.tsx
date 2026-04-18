import { useState } from "react";
import { useGetAchats, useGetProduits, useDeleteAchat, useBulkDeleteAchats } from "@workspace/api-client-react";
import { formatFBu, formatDate, getMoisCurrent } from "@/lib/format";
import { Trash2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Historique() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [moisFilter, setMoisFilter] = useState(getMoisCurrent());
  const [produitFilter, setProduitFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params: any = { mois: moisFilter };
  if (produitFilter) params.produit_id = produitFilter;

  const { data: achats } = useGetAchats(params) as any;
  const { data: produits } = useGetProduits() as any;
  const deleteAchatMut = useDeleteAchat();
  const bulkDeleteMut = useBulkDeleteAchats();

  const filtered = (achats ?? []).filter((a: any) => {
    if (!search) return true;
    return a.produit_nom?.toLowerCase().includes(search.toLowerCase()) ||
           a.note?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalMontant = filtered.reduce((s: number, a: any) => s + (a.montant ?? 0), 0);

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(selected.length === paginated.length && paginated.length > 0 ? [] : paginated.map((a: any) => a.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["getAchats"] });
    qc.invalidateQueries({ queryKey: ["getDashboard"] });
    qc.invalidateQueries({ queryKey: ["getBudget"] });
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

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Historique des achats</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} achat(s) — Total : {formatFBu(totalMontant)}</p>
        </div>
        {selected.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer ({selected.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={moisFilter}
            onChange={e => { setMoisFilter(e.target.value); setPage(1); setSelected([]); }}
          >
            {monthOptions.map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>

        <select
          className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          value={produitFilter ?? ""}
          onChange={e => { setProduitFilter(e.target.value ? parseInt(e.target.value) : null); setPage(1); }}
        >
          <option value="">Tous les produits</option>
          {(produits ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary w-48"
            placeholder="Rechercher..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.length === paginated.length && paginated.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Produit</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Qté</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Prix unit.</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Montant</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Note</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">Aucun achat trouvé</td>
              </tr>
            ) : (
              paginated.map((a: any) => (
                <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/20 ${selected.includes(a.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(a.date)}</td>
                  <td className="px-4 py-2.5 font-medium">{a.produit_nom}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.quantite} {a.unite}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatFBu(a.prix_unitaire)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">{formatFBu(a.montant)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-32 truncate">{a.note ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages} — {filtered.length} résultats
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-40"
              >
                Préc.
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-40"
              >
                Suiv.
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
