import { useEffect, useRef, useState } from "react";
import { Check, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { StructuredAddress } from "@/components/checkout/AddressSearch";

interface SavedAddressesListProps {
  addresses: StructuredAddress[];
  selectedAddressId?: string;
  onSelect: (address: StructuredAddress) => void;
  onEdit: (address: StructuredAddress) => void;
  onDelete: (addressId: string) => void;
}

const SavedAddressesList = ({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onDelete,
}: SavedAddressesListProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (addresses.length === 0) return null;

  return (
    <div ref={containerRef} className="space-y-3">
      {addresses.map((address) => {
        const isSelected = selectedAddressId === address.id;
        const isMenuOpen = openMenuId === address.id;

        return (
          <div
            key={address.id}
            className={`rounded-2xl border bg-background p-4 shadow-sm ${
              isSelected ? "border-primary" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  onSelect(address);
                }}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">
                    {address.mainText}
                    {address.number && address.number !== "s/n" ? `, ${address.number}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{address.secondaryText}</p>
                  {address.reference && (
                    <p className="mt-1 text-xs text-muted-foreground">{address.reference}</p>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1">
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((current) => (current === address.id ? null : address.id ?? null))
                    }
                    className="rounded-full p-1 text-muted-foreground"
                    aria-label="Mais ações"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-xl border border-border bg-background p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(address);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          if (address.id) onDelete(address.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-secondary"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SavedAddressesList;
