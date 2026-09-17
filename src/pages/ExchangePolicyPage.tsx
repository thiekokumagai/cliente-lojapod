import { useStoreSettings } from "@/hooks/useStoreSettings";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";

const ExchangePolicyPage = () => {
  const { data: settings, isLoading } = useStoreSettings();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  if (!isLoading && !settings?.enableExchangePolicy) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a loja
        </Link>
      </div>
      
      <div className="bg-background rounded-2xl shadow-sm border border-border p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
          Política de Trocas e Devoluções
        </h1>
        
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
          {settings?.exchangePolicy ? (
            <div className="whitespace-pre-wrap">{settings.exchangePolicy}</div>
          ) : (
            <p>
              A política de trocas e devoluções desta loja ainda não foi configurada.
              Por favor, entre em contato através dos nossos canais de atendimento para mais informações.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangePolicyPage;
