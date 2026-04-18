import { useState } from "react";
import { Search, X } from "lucide-react";
import { FOOD_ICONS, getIconComponent, EMOJI_TO_ICON_MAP } from "@/lib/icons";
import { motion, AnimatePresence } from "framer-motion";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  onClose: () => void;
}

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const resolvedValue = EMOJI_TO_ICON_MAP[value] ?? value;

  const filtered = search
    ? FOOD_ICONS.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        i.group.toLowerCase().includes(search.toLowerCase())
      )
    : FOOD_ICONS;

  const groups = Array.from(new Set(filtered.map(i => i.group)));

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        initial={{ scale: 0.93, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="font-semibold text-sm">Choisir une icône</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="w-full bg-muted/50 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all placeholder-muted-foreground"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="p-3 max-h-72 overflow-y-auto space-y-3">
          {groups.map(group => (
            <div key={group}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">{group}</div>
              <div className="grid grid-cols-6 gap-1">
                {filtered.filter(i => i.group === group).map(icon => {
                  const Icon = getIconComponent(icon.name);
                  const isSelected = resolvedValue === icon.name;
                  return (
                    <button
                      key={icon.name}
                      title={icon.label}
                      onClick={() => { onChange(icon.name); onClose(); }}
                      className={`flex items-center justify-center p-2.5 rounded-xl transition-all group relative ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">Aucune icône trouvée</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
