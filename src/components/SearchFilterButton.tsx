import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { buildImageUrl } from "@/utils/image-url";
import { cn } from "@/lib/utils";

interface SearchFilterButtonProps {
  className?: string;
  /** Conteúdo do botão; por padrão só o ícone de filtro */
  children?: ReactNode;
}

/**
 * Ícone de filtro que abre um painel com os grupos cadastrados no admin
 * (marca, sabor, produto...). Clicar num item aplica a palavra na busca.
 */
export default function SearchFilterButton({ className, children }: SearchFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const { data: settings } = useStoreSettings();
  const { searchTerm, setSearchTerm } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // groupId -> palavra escolhida. Um item por grupo; grupos diferentes se combinam.
  const [selected, setSelected] = useState<Record<string, string>>({});

  const groups = (settings?.searchFilters ?? []).filter(
    (g) => g?.name && Array.isArray(g.items) && g.items.some((i) => i?.label?.trim())
  );

  const selectedTerms = Object.values(selected);
  const joinedSelection = selectedTerms.join(" ");

  // Se a busca foi limpa/alterada fora do painel, zera as escolhas
  useEffect(() => {
    if (selectedTerms.length > 0 && searchTerm.trim() !== joinedSelection) {
      setSelected({});
    }
  }, [searchTerm, joinedSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (groups.length === 0) return null;

  const hasSearch = searchTerm.trim().length > 0;

  const goToResults = () => {
    setOpen(false);
    if (location.pathname !== "/") navigate("/");
    // Espera a lista re-renderizar e vai para a primeira seção de resultados da página
    // (destaques, promoções ou produtos, o que aparecer primeiro).
    setTimeout(() => {
      const target = document.querySelector("#destaques, #promocoes, #produtos");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const toggle = (groupId: string, label: string) => {
    const word = label.trim();
    const next = { ...selected };
    if (next[groupId] === word) delete next[groupId];
    else next[groupId] = word;

    setSelected(next);
    setSearchTerm(Object.values(next).join(" "));

    // Com um único grupo não há o que combinar: já mostra o resultado
    if (groups.length === 1 && next[groupId]) goToResults();
  };

  const clearAll = () => {
    setSelected({});
    setSearchTerm("");
  };

  const panel = (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50" onClick={() => setOpen(false)}>
      <aside
        className="h-full w-[92%] max-w-sm overflow-y-auto bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Filtros"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <h2 className="text-xl font-semibold text-foreground">Filtros</h2>
          <div className="flex items-center gap-2">
            {hasSearch && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {groups.map((group) => (
            <section key={group.id}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {group.name}
              </h3>
              {(() => {
                const valid = group.items.filter((i) => i?.label?.trim());
                const withImage = valid.filter((i) => i.imageUrl);
                const textOnly = valid.filter((i) => !i.imageUrl);
                return (
                  <div className="space-y-3">
                    {withImage.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {withImage.map((item) => {
                          const active = selected[group.id] === item.label.trim();
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggle(group.id, item.label)}
                              aria-pressed={active}
                              className="flex flex-col items-center gap-1.5 text-center"
                            >
                              <span
                                className={cn(
                                  "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-colors",
                                  active ? "border-primary" : "border-border"
                                )}
                              >
                                <img
                                  src={buildImageUrl(item.imageUrl)}
                                  alt={item.label}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </span>
                              <span
                                className={cn(
                                  "line-clamp-2 text-xs font-medium leading-tight",
                                  active ? "text-primary" : "text-foreground"
                                )}
                              >
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {textOnly.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {textOnly.map((item) => {
                          const active = selected[group.id] === item.label.trim();
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggle(group.id, item.label)}
                              aria-pressed={active}
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-foreground hover:bg-muted"
                              )}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          ))}
        </div>

        {selectedTerms.length > 0 && (
          <div className="sticky bottom-0 border-t border-border bg-background p-4">
            <button
              type="button"
              onClick={goToResults}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              Ver resultados · {selectedTerms.join(" + ")}
            </button>
          </div>
        )}
      </aside>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-full p-2 text-fg-subtle transition-colors hover:bg-muted hover:text-fg-secondary",
          className
        )}
        aria-label="Filtros"
        title="Filtros"
      >
        <SlidersHorizontal className="h-5 w-5" />
        {children}
        {hasSearch && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
        )}
      </button>
      {open && createPortal(panel, document.body)}
    </>
  );
}
