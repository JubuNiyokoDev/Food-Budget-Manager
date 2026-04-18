import { motion } from "framer-motion";
import { Link } from "wouter";
import { MODULES } from "@/lib/modules";
import { ArrowRight, CheckCircle2, Clock, Zap, Layers } from "lucide-react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const statusConfig = {
  actif:   { label: "Actif",   cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",   icon: CheckCircle2 },
  beta:    { label: "Bêta",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",       icon: Zap },
  bientot: { label: "Bientôt", cls: "bg-muted text-muted-foreground",                                          icon: Clock },
};

function ModuleCard({ mod, index }: { mod: typeof MODULES[0]; index: number }) {
  const { label, cls, icon: StatusIcon } = statusConfig[mod.statut];
  const Icon = mod.icon;
  const isClickable = mod.statut !== "bientot";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.45, ease }}
    >
      {isClickable ? (
        <Link href={mod.basePath}>
          <CardInner mod={mod} label={label} cls={cls} StatusIcon={StatusIcon} Icon={Icon} isClickable />
        </Link>
      ) : (
        <CardInner mod={mod} label={label} cls={cls} StatusIcon={StatusIcon} Icon={Icon} isClickable={false} />
      )}
    </motion.div>
  );
}

function CardInner({ mod, label, cls, StatusIcon, Icon, isClickable }: any) {
  return (
    <div
      className={`group relative bg-card border rounded-2xl p-5 transition-all duration-200 h-full flex flex-col
        ${isClickable
          ? "hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 cursor-pointer"
          : "opacity-55 cursor-default select-none"
        }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-13 h-13 w-12 h-12 rounded-xl bg-gradient-to-br ${mod.bgGradient} flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
          <StatusIcon className="w-3 h-3" />
          {label}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-foreground mb-1.5 leading-tight">{mod.nom}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        {isClickable ? (
          <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
            Ouvrir le module <ArrowRight className="w-3 h-3" />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">En développement</span>
        )}
        {mod.version && (
          <span className="text-xs text-muted-foreground/40 font-mono">v{mod.version}</span>
        )}
      </div>
    </div>
  );
}

export default function Hub() {
  const actifCount = MODULES.filter(m => m.statut === "actif" || m.statut === "beta").length;
  const totalCount = MODULES.length;

  return (
    <div className="min-h-full bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-full flex flex-col"
      >
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-8 py-10 flex-shrink-0">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Rundinova</h1>
                <p className="text-slate-400 text-xs">Plateforme de gestion intégrée</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed max-w-md">
              Tous les outils de votre startup au même endroit. Sélectionnez un module pour commencer à travailler.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-xs text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                {actifCount} module{actifCount > 1 ? "s" : ""} actif{actifCount > 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-xs text-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {totalCount - actifCount} en développement
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 p-8">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Modules disponibles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {MODULES.map((mod, i) => (
              <ModuleCard key={mod.id} mod={mod} index={i} />
            ))}
          </div>
        </div>

        <div className="px-8 py-4 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <span>Rundinova Platform</span>
          <span className="h-3 w-px bg-border" />
          <span>Bujumbura, Burundi</span>
          <span className="h-3 w-px bg-border" />
          <span>SQLite · Hors-ligne</span>
        </div>
      </motion.div>
    </div>
  );
}
