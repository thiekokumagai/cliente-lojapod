import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-4 max-w-md text-center">
        <p className="font-display text-sm font-medium uppercase tracking-widest text-fg-subtle">Erro 404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-fg-secondary">Página não encontrada</h1>
        <p className="mt-3 text-fg-tertiary">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
        >
          Voltar para a loja
        </a>
      </div>
    </div>
  );
};

export default NotFound;
