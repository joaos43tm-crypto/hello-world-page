import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Dog } from "lucide-react";

import type { Pet } from "@/lib/petcontrol.api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PetComboboxProps {
  pets: Pet[];
  value: string;
  onChange: (petId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function PetCombobox({
  pets,
  value,
  onChange,
  placeholder = "Selecione o pet...",
  disabled,
}: PetComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => pets.find((p) => p.id === value), [pets, value]);

  const filteredPets = useMemo(() => {
    const q = normalize(query);
    if (!q) return pets;
    return pets.filter((p) => {
      const hay = normalize(`${p.name} ${p.tutor?.name ?? ""}`);
      return hay.includes(q);
    });
  }, [pets, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-12 w-full justify-between"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Dog className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">
              {selected
                ? `${selected.name} - ${selected.tutor?.name ?? ""}`
                : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Pesquisar por pet ou tutor..."
          />
          <CommandList>
            <CommandEmpty>Nenhum pet encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredPets.map((pet) => {
                const label = `${pet.name} - ${pet.tutor?.name ?? ""}`;
                const isSelected = pet.id === value;
                return (
                  <CommandItem
                    key={pet.id}
                    value={label}
                    onSelect={() => {
                      onChange(pet.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
