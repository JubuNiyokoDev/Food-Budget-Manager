import { useState, useEffect } from "react";
import {
  useGetConfig, useUpdateConfig, useGetCategories, useCreateCategorie, useUpdateCategorie, useDeleteCategorie,
  useImportBackup, useSendEmailBackup
} from "@workspace/api-client-react";
import { Save, Loader2, Upload, Download, Mail, Plus, Pencil, Trash2, X, Palette } from "lucide-react";
import { IconRenderer } from "@/components/IconRenderer";
import { IconPicker } from "@/components/IconPicker";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const inputCls = "w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all placeholder-muted-foreground";
const selectCls = inputCls;

const configFields = [
  { key: "famille_nom", label: "Nom de la famille", type: "text", placeholder: "Rundinova", section: "general" },
  { key: "nombre_personnes", label: "Nombre de personnes", type: "number", placeholder: "6", section: "general" },
  { key: "devise", label: "Devise", type: "select", options: ["FBu", "USD", "EUR"], section: "general" },
  { key: "langue", label: "Langue", type: "select", options: ["fr", "en"], section: "general" },
  { key: "smtp_host", label: "Serveur SMTP", type: "text", placeholder: "smtp.gmail.com", section: "smtp" },
  { key: "smtp_port", label: "Port SMTP", type: "number", placeholder: "587", section: "smtp" },
  { key: "smtp_user", label: "Email expéditeur", type: "email", placeholder: "rundinova@gmail.com", section: "smtp" },
  { key: "smtp_pass", label: "Mot de passe SMTP", type: "password", placeholder: "••••••••••••", section: "smtp" },
  { key: "email_backup", label: "Email de sauvegarde", type: "email", placeholder: "backup@gmail.com", section: "smtp" },
] as const;

const modalV = {
  hidden: { opacity: 0, scale: 0.93, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease } },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.18 } },
};

const sections = [
  { key: "general", label: "Général" },
  { key: "smtp", label: "SMTP & Email" },
  { key: "categories", label: "Catégories" },
  { key: "backup", label: "Export / Import" },
];

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
  const [modalCateg, setModalCateg] = useState<{ id?: number; nom: string; couleur: string; emoji: string } | null>(null);
  const [showCatIconPicker, setShowCatIconPicker] = useState(false);
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
      qc.invalidateQueries({ queryKey: ["/api/config"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSavingConfig(false); }
  };

  const handleExport = () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const link = document.createElement("a");
    link.href = `${base}/api/backup/export`;
    link.download = `rundinova_backup_${new Date().toISOString().split("T")[0]}.rba`;
    link.click();
    toast({ title: "Téléchargement démarré !" });
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
    } finally { setSendingEmail(false); }
  };

  const handleSaveCategorie = async () => {
    if (!modalCateg?.nom) return;
    try {
      const payload = { nom: modalCateg.nom, couleur: modalCateg.couleur, emoji: modalCateg.emoji };
      if (modalCateg.id) {
        await updateCategorieMut.mutateAsync({ id: modalCateg.id, data: payload as any });
        toast({ title: "Catégorie mise à jour" });
      } else {
        await createCategorieMut.mutateAsync({ data: payload as any });
        toast({ title: "Catégorie créée" });
      }
      setModalCateg(null);
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCategorie = async (id: number) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await deleteCategorieMut.mutateAsync({ id });
      toast({ title: "Catégorie supprimée" });
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const sectionFields = configFields.filter(f => f.section === activeSection);

  return (
    <motion.div className="p-6 space-y-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configuration de l'application</p>
      </div>

      <div className="flex gap-1 relative">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative z-10 ${activeSection === s.key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {s.label}
            {activeSection === s.key && (
              <motion.div layoutId="paramTab"
                className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                transition={{ duration: 0.25, ease }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {(activeSection === "general" || activeSection === "smtp") && (
          <motion.div key={activeSection} className="space-y-4 max-w-lg"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
            <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4">
              {sectionFields.map((f, i) => (
                <motion.div key={f.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">{f.label}</label>
                  {f.type === "select" ? (
                    <select className={selectCls} value={form[f.key] ?? ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {(f as any).options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} className={inputCls} placeholder={f.placeholder} value={form[f.key] ?? ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  )}
                </motion.div>
              ))}
            </div>
            {activeSection === "smtp" && (
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSendEmail} disabled={sendingEmail}
                className="flex items-center gap-2 w-full justify-center bg-muted/60 text-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors">
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-primary" />}
                {sendingEmail ? "Envoi en cours..." : "Tester l'envoi d'email"}
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleSaveConfig} disabled={savingConfig}
              className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingConfig ? "Sauvegarde..." : "Enregistrer la configuration"}
            </motion.button>
          </motion.div>
        )}

        {activeSection === "categories" && (
          <motion.div key="categories" className="space-y-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
            <div className="flex justify-end">
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { setShowCatIconPicker(false); setModalCateg({ nom: "", couleur: "#22c55e", emoji: "ShoppingCart" }); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 shadow-sm transition-colors">
                <Plus className="w-4 h-4" />
                Nouvelle catégorie
              </motion.button>
            </div>
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Icône</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Nom</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Couleur</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {(categories ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Aucune catégorie</td></tr>
                  ) : (
                    (categories ?? []).map((c: any, i: number) => (
                      <motion.tr key={c.id} className="hover:bg-muted/20 transition-colors"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                        <td className="px-5 py-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.couleur}20` }}>
                            <IconRenderer name={c.emoji} className="w-4 h-4" style={{ color: c.couleur }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{c.nom}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: c.couleur }} />
                            <span className="text-xs text-muted-foreground font-mono">{c.couleur}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <motion.button whileTap={{ scale: 0.88 }}
                              onClick={() => { setShowCatIconPicker(false); setModalCateg({ id: c.id, nom: c.nom, couleur: c.couleur, emoji: c.emoji }); }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleDeleteCategorie(c.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeSection === "backup" && (
          <motion.div key="backup" className="space-y-4 max-w-lg"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
            <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <div className="text-sm font-semibold">Sauvegardes locales</div>
              <p className="text-xs text-muted-foreground">Le fichier .rba contient toutes vos données dans un format compressé.</p>
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleExport}
                className="flex items-center gap-2 w-full justify-center bg-muted/60 text-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                <Download className="w-4 h-4 text-primary" />
                Exporter la sauvegarde (.rba)
              </motion.button>
              <div>
                <label className="flex items-center gap-2 w-full justify-center bg-muted/40 px-4 py-6 rounded-2xl text-sm text-muted-foreground hover:bg-muted/70 hover:text-primary cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Importer un fichier .rba</span>
                  <input type="file" accept=".rba,.json,.gz" className="hidden" onChange={handleImport} />
                </label>
                <p className="text-xs text-muted-foreground mt-2 text-center">L'import remplacera toutes les données existantes.</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <div className="text-sm font-semibold">Sauvegarde par email</div>
              <p className="text-xs text-muted-foreground">Envoyez la sauvegarde à votre email. Configurez d'abord le SMTP.</p>
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleSendEmail} disabled={sendingEmail}
                className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {sendingEmail ? "Envoi en cours..." : "Envoyer la sauvegarde par email"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalCateg !== null && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setModalCateg(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div className="relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4"
              variants={modalV} initial="hidden" animate="show" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{modalCateg.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>
                <button onClick={() => setModalCateg(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Nom *</label>
                  <input className={inputCls} value={modalCateg.nom} onChange={e => setModalCateg(p => p ? { ...p, nom: e.target.value } : null)} placeholder="Ex: Féculents..." autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Icône</label>
                    <button type="button" onClick={() => setShowCatIconPicker(true)}
                      className="w-full flex items-center gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10">
                        <IconRenderer name={modalCateg.emoji || "Package"} className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground flex-1 text-left truncate">{modalCateg.emoji || "Choisir..."}</span>
                      <Palette className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                    {showCatIconPicker && (
                      <div className="absolute z-[60] mt-1">
                        <IconPicker value={modalCateg.emoji || "Package"} onChange={name => { setModalCateg(p => p ? { ...p, emoji: name } : null); setShowCatIconPicker(false); }} onClose={() => setShowCatIconPicker(false)} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Couleur</label>
                    <input type="color" className="w-full bg-muted/50 rounded-xl h-11 px-2 cursor-pointer" value={modalCateg.couleur} onChange={e => setModalCateg(p => p ? { ...p, couleur: e.target.value } : null)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalCateg(null)} className="px-4 py-2.5 text-sm rounded-xl bg-muted/50 hover:bg-muted transition-colors">Annuler</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveCategorie} disabled={updateCategorieMut.isPending || createCategorieMut.isPending}
                  className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {(updateCategorieMut.isPending || createCategorieMut.isPending) ? "Enregistrement..." : "Enregistrer"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
