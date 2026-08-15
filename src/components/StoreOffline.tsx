import React from 'react';
import { Store, Globe, ArrowLeft } from 'lucide-react';
import { getSubdomain } from '@/services/api';

function getAppUrl(): string {
  if (typeof window === 'undefined') return 'https://app.lojapod.com';
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;
  if (hostname.includes('localhost')) {
    return `${protocol}//app.localhost${port}`;
  }
  return `${protocol}//app.lojapod.com`;
}

export default function StoreOffline() {
  const subdomain = getSubdomain();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Glowing Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Icon Circle */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center shadow-2xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-600/20 to-blue-500/20 opacity-50 group-hover:opacity-100 transition-opacity" />
          <Store className="w-12 h-12 text-indigo-500 relative z-10" />
        </div>

        {/* Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
          <Globe className="w-3.5 h-3.5" />
          Loja Inativa
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Loja Fora do Ar
        </h1>

        {/* Description */}
        <p className="text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed mb-6">
          A loja que você está tentando acessar está temporariamente indisponível ou foi desativada pelo administrador.
        </p>

        {/* Subdomain Badge */}
        {subdomain && subdomain !== 'demo' && (
          <div className="w-full max-w-xs mb-8 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs flex justify-between items-center text-zinc-400">
            <span>Subdomínio:</span>
            <span className="font-mono font-bold text-white bg-zinc-800 px-2 py-1 rounded">
              {subdomain}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
