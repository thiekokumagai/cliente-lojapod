import React, { useEffect } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import StoreNotFound from '@/components/StoreNotFound';
import { trackCustomEvent } from '@/components/FacebookPixel';

const resolveLink = (rawUrl?: string) => {
  if (!rawUrl) return { url: '#', isInternal: true };
  const trimmed = rawUrl.trim();
  if (!trimmed) return { url: '#', isInternal: true };

  // Caminho relativo interno (ex: / ou /ignite)
  if (trimmed.startsWith('/')) {
    return { url: trimmed, isInternal: true };
  }

  // Adiciona protocolo se não tiver
  let urlWithProtocol = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    urlWithProtocol = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(urlWithProtocol);
    const isCurrentHost = typeof window !== 'undefined' && parsed.host === window.location.host;
    if (isCurrentHost) {
      // Link apontando para o próprio domínio da loja
      return { url: parsed.pathname + parsed.search + parsed.hash, isInternal: true };
    }
    return { url: urlWithProtocol, isInternal: false };
  } catch {
    return { url: urlWithProtocol, isInternal: false };
  }
};

const LinksPage = () => {
  const { data: settings, isLoading, isError } = useStoreSettings();

  useEffect(() => {
    if (settings?.storeName) {
      document.title = `Links | ${settings.storeName}`;
    } else {
      document.title = 'Links';
    }

    if (settings?.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = settings.faviconUrl;

      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.getElementsByTagName("head")[0].appendChild(appleLink);
      }
      appleLink.href = settings.faviconUrl;
    }
  }, [settings?.storeName, settings?.faviconUrl]);

  if (isError) {
    return <StoreNotFound />;
  }

  const instagramHandle = settings?.instagram ? settings.instagram.replace('@', '') : '';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-12 px-4 sm:px-6 relative overflow-hidden font-sans">
        {/* Background glowing effects for premium aesthetic */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-red-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Profile / Brand Header */}
          <a
            href="/"
            className="h-24 sm:h-28 mb-5 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg transition-transform hover:scale-105"
            title="Ir para a loja"
          >
            {isLoading ? (
              <div className="w-24 h-24 sm:w-28 sm:h-28 animate-pulse bg-zinc-800 rounded-2xl"></div>
            ) : settings?.whiteLogoUrl || settings?.logoUrl ? (
              <img
                src={settings.whiteLogoUrl || settings.logoUrl!}
                alt="Logo"
                className="w-full h-full object-cover max-h-28"
                loading="eager"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center font-bold text-3xl bg-gradient-to-tr from-red-600 to-orange-500 text-white rounded-2xl">
                PM
              </div>
            )}
          </a>
          
          {instagramHandle ? (
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-bold tracking-tight mb-2 text-center text-white min-h-[32px] hover:text-red-400 transition-colors inline-block"
            >
              {isLoading ? (
                <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-md mx-auto"></div>
              ) : (
                `@${instagramHandle}`
              )}
            </a>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-center text-white min-h-[32px]">
              {isLoading ? (
                <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded-md mx-auto"></div>
              ) : null}
            </h1>
          )}
          <p className="text-zinc-400 text-sm mb-10 text-center px-4">
            Realize pedidos online e acompanhe novidades.
          </p>

          {/* Banners Dinâmicos (Admin) */}
          <div className="w-full flex flex-col gap-4 mb-8">
            {isLoading ? (
              <>
                <div className="w-full h-[120px] sm:h-[150px] bg-zinc-800/50 animate-pulse rounded-xl"></div>
                <div className="w-full h-[120px] sm:h-[150px] bg-zinc-800/50 animate-pulse rounded-xl"></div>
              </>
            ) : (
              settings?.marketingLinks
                ?.filter((link: any) => link.isActive)
                .sort((a: any, b: any) => a.order - b.order)
                .map((link: any, idx: number) => {
                  const { url: destinationUrl, isInternal } = resolveLink(link.url);

                  const handleClick = () => {
                    try {
                      trackCustomEvent('Categoria', {
                        content_name: link.title || 'Banner',
                        link: destinationUrl,
                      });
                    } catch (e) {
                      console.warn('Pixel tracking error:', e);
                    }
                  };

                  return (
                    <a
                      key={link.id || idx}
                      href={destinationUrl}
                      target={isInternal ? '_self' : '_blank'}
                      rel={isInternal ? undefined : 'noopener noreferrer'}
                      onClick={handleClick}
                      className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98] block relative min-h-[100px] bg-zinc-900/50 rounded-xl overflow-hidden cursor-pointer shadow-md"
                    >
                      <img
                        src={link.imageUrl}
                        alt={link.title || `Banner ${idx + 1}`}
                        className="w-full h-auto object-contain"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </a>
                  );
                })
            )}
          </div>
        </div>
      </div>
  );
};

export default LinksPage;
