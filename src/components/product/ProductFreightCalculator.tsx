import { useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { api } from "@/services/api";

interface FreightResult {
  distanceKm: number;
  duration?: string;
  freightPrice?: number;
  error?: string;
}

interface ProductFreightCalculatorProps {
  zipCode: string;
  addressNumber: string;
  isDesktop?: boolean;
  isNicSalt?: boolean;
  onZipCodeChange: (value: string) => void;
  onAddressNumberChange: (value: string) => void;
}

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

const ProductFreightCalculator = ({
  zipCode,
  addressNumber,
  isDesktop = false,
  isNicSalt = false,
  onZipCodeChange,
  onAddressNumberChange,
}: ProductFreightCalculatorProps) => {
  const [complement, setComplement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FreightResult | null>(null);

  const handleCalculate = async () => {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (cleanCep.length < 8) return;

    setIsLoading(true);
    setResult(null);

    try {
      // Build destination address from CEP + number + complement
      let destination = cleanCep;
      if (addressNumber) destination += `, ${addressNumber}`;
      if (complement) destination += `, ${complement}`;
      destination += ", Campo Grande, MS, Brasil";

      // First resolve CEP to address via ViaCEP
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const viaCepData = await viaCepRes.json();

      if (viaCepData.erro) {
        setResult({ distanceKm: 0, error: "CEP não encontrado." });
        setIsLoading(false);
        return;
      }

      // Build full address from ViaCEP
      const parts = [
        viaCepData.logradouro,
        addressNumber,
        complement,
        viaCepData.bairro,
        viaCepData.localidade,
        viaCepData.uf,
        "Brasil",
      ].filter(Boolean);

      const fullDestination = parts.join(", ");

      const { data, error } = await api.post<any>("/store/settings/calculate-freight", {
        destination: fullDestination,
      }).then(res => ({ data: res, error: null })).catch(err => ({ data: null, error: err }));

      if (error) {
        setResult({ distanceKm: 0, error: "Erro ao calcular frete." });
      } else if (data?.error) {
        setResult({ distanceKm: data.distanceKm || 0, error: data.error });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ distanceKm: 0, error: "Erro ao calcular frete." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={isDesktop ? "mt-8 border-t border-[#ececec] pt-4" : "mt-5 border-t border-[#ececec] pt-4"}>
      <div className={isDesktop ? "flex items-center gap-2 text-[18px] font-semibold text-[#676767]" : ""}>
        {isDesktop && !isNicSalt && <Truck className="h-5 w-5 text-primary" />}
        <h2 className="text-[18px] font-semibold text-[#676767]">Calcule o frete</h2>
      </div>

      <div className={isDesktop ? "mt-4 grid grid-cols-[minmax(0,1fr)_80px_100px_108px] gap-2" : "mt-4 grid grid-cols-[minmax(0,1fr)_60px_72px_80px] gap-2"}>
        <input
          value={zipCode}
          onChange={(event) => onZipCodeChange(formatCep(event.target.value))}
          placeholder="Insira o CEP"
          className="h-10 rounded-full bg-[#f3f2f2] px-4 text-base text-foreground placeholder:text-[#c0c0c0] focus:outline-none md:text-sm"
        />
        <input
          value={addressNumber}
          onChange={(event) => onAddressNumberChange(event.target.value.replace(/[^\d]/g, ""))}
          placeholder={isDesktop ? "Número" : "Nº"}
          className="h-10 rounded-full bg-[#f3f2f2] px-4 text-base text-foreground placeholder:text-[#c0c0c0] focus:outline-none md:text-sm"
        />
        <input
          value={complement}
          onChange={(event) => setComplement(event.target.value)}
          placeholder="Compl."
          className="h-10 rounded-full bg-[#f3f2f2] px-4 text-base text-foreground placeholder:text-[#c0c0c0] focus:outline-none md:text-sm"
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={isLoading || zipCode.replace(/\D/g, "").length < 8}
          className={`h-10 text-sm font-medium disabled:opacity-50 ${
            isDesktop
              ? "rounded-xl border border-primary text-primary"
              : "rounded-full border border-primary text-primary"
          }`}
        >
          {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Calcular"}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-xl bg-[#f3f2f2] px-4 py-3">
          {result.error ? (
            <p className="text-sm text-red-500">{result.error}</p>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm text-[#676767]">
                  Entrega ({result.distanceKm} km)
                </span>
              </div>
              <span className="text-sm font-semibold text-[#4b4b4b]">
                R$ {result.freightPrice?.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductFreightCalculator;
