import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

let pixelInitialized = false;
let activePixelId: string | null = null;

export const initFacebookPixel = (pixelId: string) => {
  if (!pixelId) return;
  activePixelId = pixelId;

  if (pixelInitialized) return;

  !function(f:any,b:any,e:any,v:any,n?:any,t?:any,s?:any)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  window.fbq('init', pixelId);
  pixelInitialized = true;
};

export const trackEvent = (eventName: string, data?: any, options?: any) => {
  if (!pixelInitialized && activePixelId) {
    initFacebookPixel(activePixelId);
  }
  if (window.fbq) {
    if (options) {
      window.fbq('track', eventName, data, options);
    } else {
      window.fbq('track', eventName, data);
    }
  }
};

export const trackCustomEvent = (eventName: string, data?: any, options?: any) => {
  if (!pixelInitialized && activePixelId) {
    initFacebookPixel(activePixelId);
  }
  if (window.fbq) {
    if (options) {
      window.fbq('trackCustom', eventName, data, options);
    } else {
      window.fbq('trackCustom', eventName, data);
    }
  }
};

const FacebookPixel = () => {
  const { data: settings } = useStoreSettings();
  const location = useLocation();

  useEffect(() => {
    // Captura parâmetros de anúncio da URL (?fbclid=...&utm_campaign=...)
    try {
      const params = new URLSearchParams(location.search);
      const fbclid = params.get('fbclid');
      const utmSource = params.get('utm_source');
      const utmCampaign = params.get('utm_campaign');

      if (fbclid || utmSource || utmCampaign) {
        const adData = {
          fbclid: fbclid || undefined,
          utmSource: utmSource || undefined,
          utmCampaign: utmCampaign || undefined,
          timestamp: Date.now(),
        };
        localStorage.setItem('podemais-ad-click-data', JSON.stringify(adData));
      }
    } catch (e) {
      // Ignora erro em ambientes sem URLSearchParams
    }
  }, [location.search]);

  useEffect(() => {
    if (settings?.pixelId) {
      initFacebookPixel(settings.pixelId);
      trackEvent('PageView');
    }
  }, [settings?.pixelId]);

  useEffect(() => {
    // Para rotas subsequentes, só rastreia se o pixel já estiver inicializado
    if (pixelInitialized) {
      trackEvent('PageView');
    }
  }, [location.pathname]);

  return null;
};

export default FacebookPixel;

