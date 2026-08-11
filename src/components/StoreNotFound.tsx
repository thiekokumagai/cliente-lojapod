import React from 'react';
import { SearchX, Globe, ArrowLeft } from 'lucide-react';
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

export default function StoreNotFound() {
  const subdomain = getSubdomain();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Glowing Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-red-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Icon Circle */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center shadow-2xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-red-600/20 to-orange-500/20 opacity-50 group-hover:opacity-100 transition-opacity" />
          <SearchX className="w-12 h-12 text-red-500 relative z-10" />
        </div>

        {/* Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <Globe className="w-3.5 h-3.5" />
          URL Não Encontrada
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Esta URL não existe
        </h1>

        {/* Description */}
        <p className="text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed mb-6">
          O subdomínio ou endereço que você tentou acessar não está associado a nenhuma loja cadastrada no sistema.
        </p>

        {/* Subdomain Badge */}
        {subdomain && subdomain !== 'demo' && (
          <div className="w-full max-w-xs mb-8 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs flex justify-between items-center text-zinc-400">
            <span>Subdomínio pesquisado:</span>
            <span className="font-mono font-bold text-white bg-zinc-800 px-2 py-1 rounded">
              {subdomain}
            </span>
          </div>
        )}

        {/* Actions */}
        <a
          href={getAppUrl()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-red-600/25 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para app.lojapod.com
        </a>
      </div>
    </div>
  );
}
