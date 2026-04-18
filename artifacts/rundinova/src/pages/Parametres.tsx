import { useState, useEffect } from "react";
import {
  useGetConfig, useUpdateConfig, useGetCategories, useCreateCategorie, useUpdateCategorie, useDeleteCategorie,
  useExportBackup, useImportBackup, useSendEmailBackup
} from "@workspace/api-client-react";
import { Save, Loader2, Upload, Download, Mail, Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const configFields = [
  { key: "famille_nom", label: "Nom de la famille", type: "text", placeholder: "Rundinova", section: "general" },
  { key: "nombre_personnes", label: "Nombre de personnes", type: "number", placeholder: "6", section: "general" },
  { key: "devise", label: "Devise", type: "select", options: ["FBu", "USD", "EUR"], section: "general" },
  { key: "langue", label: "Langue", type: "select", options: ["fr", "en"], section: "general" },
  { key: "smtp_host", label: "Serveur SMTP", type: "text", placeholder: "smtp.gmail.com", section: "smtp" },
  { key: "smtp_port", label: "Port SMTP", type: "number", placeholder: "587", section: "smtp" },
  { key: "smtp_user", label: "Email (expéditeur)", type: "email", placeholder: "rundinova@gmail.com", section: "smtp" },
  { key: "smtp_pass", label: "Mot de passe SMTP", type: "password", placeholder: "••••••••••••", section: "smtp" },
  { key: "email_backup", label: "Email de sauvegarde", type: "email", placeholder: "backup@gmail.com", section: "smtp" },
] as const;

export default function Parametres() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: configData } = useGetConfig() as any;
  const updateConfigMut = useUpdateConfig();
  const importBackupMut = useImportBackup();
  const sendEmailMut = useSendEmailBackup();

  const { data: categories } = useGetCategories() as any;
  const createCategorieMut = useCreateCategorie();
  const updateCategorieMut = useUpdateCategorie();
  const deleteCategorieMut = useDeleteCategorie();

  const [form, setForm] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [modalCateg, setModalCateg] = useState<{ id?: number; nom: string; couleur: string; icone: string } | null>(null);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    if (configData) {
      const f: Record<string, string> = {};
      if (Array.isArray(configData)) {
        configData.forEach((item: any) => { f[item.cle] = item.valeur ?? ""; });
      } else if (typeof configData === "object") {
        Object.entries(configData).forEach(([k, v]) => { f[k] = String(v ?? ""); });
      }
      setForm(f);
    }
  }, [configData]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await updateConfigMut.mutateAsync({ data: form });
      toast({ title: "Configuration sauvegardée !" });
      qc.invalidateQueries({ queryKey: ["getConfig"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExport = async () => {
    try {
      const link = document.createElement("a");
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      link.href = `${base}/api/backup/export`;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `rundinova_backup_${dateStr}.rba`;
      link.click();
      toast({ title: "Téléchargement démarré !" });
    } catch (e: any) {
      toast({ title: "Erreur export", description: e.message, variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      await importBackupMut.mutateAsync({ data: formData as any });
      toast({ title: "Sauvegarde importée !", description: "Rechargez la page pour voir les données." });
      qc.invalidateQueries();
    } catch (e: any) {
      toast({ title: "Erreur import", description: e.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await sendEmailMut.mutateAsync({ data: {} });
      toast({ title: "Email envoyé !", description: "La sauvegarde a été envoyée par email." });
    } catch (e: any) {
      toast({ title: "Erreur email", description: e.message ?? "Vérifiez la config SMTP", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveCategorie = async () => {
    if (!modalCateg?.nom) return;
    try {
      if (modalCateg.id) {
        await updateCategorieMut.mutateAsync({ id: modalCateg.id, data: modalCateg });
        toast({ title: "Catégorie mise à jour" });
      } else {
        await createCategorieMut.mutateAsync({ data: modalCateg });
        toast({ title: "Catégorie créée" });
      }
      setModalCateg(null);
      qc.invalidateQueries({ queryKey: ["getCategories"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCategorie = async (id: number) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await deleteCategorieMut.mutateAsync({ id });
      toast({ title: "Catégorie supprimée" });
      qc.invalidateQueries({ queryKey: ["getCategories"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const sections = [
    { key: "general", label: "Général" },
    { key: "smtp", label: "SMTP & Email" },
    { key: "categories", label: "Catégories" },
    { key: "backup", label: "Export / Import" },
  ];

  const sectionFields = configFields.filter(f => f.section === activeSection);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration de l'application</p>
      </div>

      <div className="flex gap-1 border-b">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {(activeSection === "general" || activeSection === "smtp") && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-card border rounded-lg p-5 space-y-4">
            {sectionFields.map(f => (
              <div key={f.key}>
                <label className="block text-sm text-muted-foreground mb-1.5">{f.label}</label>
                {f.type === "select" ? (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form[f.key] ?? ""}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  >
                    {(f as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          {activeSection === "smtp" && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 w-full justify-center border border-primary text-primary px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sendingEmail ? "Envoi en cours..." : "Tester l'envoi d'email"}
            </button>
          )}

          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingConfig ? "Sauvegarde..." : "Enregistrer la configuration"}
          </button>
        </div>
      )}

      {activeSection === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setModalCateg({ nom: "", couleur: "#22c55e", icone: "🛒" })}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nouvelle catégorie
            </button>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Icône</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Nom</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Couleur</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Aucune catégorie</td></tr>
                ) : (
                  (categories ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-lg">{c.icone}</td>
                      <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ background: c.couleur }} />
                          <span className="text-xs text-muted-foreground font-mono">{c.couleur}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setModalCateg({ id: c.id, nom: c.nom, couleur: c.couleur, icone: c.icone })}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategorie(c.id)}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "backup" && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-card border rounded-lg p-5 space-y-4">
            <div className="text-sm font-medium">Sauvegardes (fichier .rba)</div>
            <p className="text-xs text-muted-foreground">
              Le fichier .rba contient toutes vos données (produits, achats, configuration) dans un format compressé.
            </p>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 w-full justify-center border border-primary text-primary px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter la sauvegarde (.rba)
            </button>

            <div>
              <label className="flex items-center gap-2 w-full justify-center border-2 border-dashed border-border px-4 py-6 rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                <Upload className="w-5 h-5" />
                <span>Importer un fichier .rba</span>
                <input
                  type="file"
                  accept=".rba,.json,.gz"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                Attention : l'import remplacera toutes les données existantes.
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-5 space-y-4">
            <div className="text-sm font-medium">Sauvegarde par email</div>
            <p className="text-xs text-muted-foreground">
              Envoyez automatiquement la sauvegarde à votre adresse email de backup.
              Configurez d'abord le SMTP dans l'onglet "SMTP & Email".
            </p>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sendingEmail ? "Envoi en cours..." : "Envoyer la sauvegarde par email"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Catégorie */}
      {modalCateg !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalCateg(null)}>
          <div className="bg-card border rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{modalCateg.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>
              <button onClick={() => setModalCateg(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nom *</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={modalCateg.nom}
                  onChange={e => setModalCateg(prev => prev ? { ...prev, nom: e.target.value } : null)}
                  placeholder="Ex: Féculents, Légumes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Icône</label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={modalCateg.icone}
                    onChange={e => setModalCateg(prev => prev ? { ...prev, icone: e.target.value } : null)}
                    placeholder="🛒"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Couleur</label>
                  <input
                    type="color"
                    className="w-full border rounded-md h-9 px-1.5 bg-background cursor-pointer"
                    value={modalCateg.couleur}
                    onChange={e => setModalCateg(prev => prev ? { ...prev, couleur: e.target.value } : null)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalCateg(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Annuler</button>
              <button onClick={handleSaveCategorie} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
