import { motion } from "framer-motion";
import { Link } from "wouter";
import { MODULES } from "@/lib/modules";
import { ArrowLeft, Clock, Zap } from "lucide-react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function ModuleComingSoon({ moduleId }: { moduleId: string }) {
  const mod = MODULES.find(m => m.id === moduleId);
  if (!mod) return null;
  const Icon = mod.icon;

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="text-center max-w-md"
      >
        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${mod.bgGradient} flex items-center justify-center shadow-2xl mx-auto mb-6`}>
          <Icon className="w-10 h-10 text-white" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            En développement
          </span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{mod.nom}</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">{mod.description}</p>

        <div className="bg-card border rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Ce module est prévu pour inclure :</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {getFeatures(moduleId).map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link href="/">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux modules
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}

function getFeatures(moduleId: string): string[] {
  const features: Record<string, string[]> = {
    rh: [
      "Gestion des fiches employés",
      "Suivi des salaires et bulletins de paie",
      "Gestion des congés et absences",
      "Contrats et documents RH",
      "Organigramme de la startup",
    ],
    comptabilite: [
      "Journal des opérations comptables",
      "Bilan et compte de résultat",
      "Suivi de trésorerie",
      "Gestion des factures et devis",
      "Rapports financiers",
    ],
    stock: [
      "Inventaire des articles",
      "Mouvements d'entrée et sortie",
      "Alertes de stock minimum",
      "Valorisation du stock",
      "Historique des mouvements",
    ],
    ventes: [
      "Gestion des clients (CRM)",
      "Suivi des opportunités",
      "Création de devis et commandes",
      "Tableau de bord commercial",
      "Rapports de ventes",
    ],
  };
  return features[moduleId] ?? ["Fonctionnalités en cours de définition"];
}
