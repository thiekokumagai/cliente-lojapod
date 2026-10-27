const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, "dist");
const API_URL = (process.env.VITE_ADMIN_API || "https://api.lojapod.com/api").replace(/\/$/, "");
const MINIO_PUBLIC_URL = (process.env.VITE_MINIO_PUBLIC_URL || "https://bucket-production-10ac.up.railway.app").replace(/\/$/, "");
const MINIO_BUCKET = process.env.VITE_MINIO_BUCKET || "lojapod";

// MIME types comuns
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

// Cache em memória de configurações por domínio (TTL: 5 min)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function buildFullLogoUrl(rawLogo) {
  if (!rawLogo) return "";
  if (rawLogo.startsWith("http://") || rawLogo.startsWith("https://")) {
    return rawLogo;
  }
  const clean = rawLogo.replace(/^\//, "");
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${clean}`;
}

async function getStoreSettings(domain) {
  const cached = settingsCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`${API_URL}/store/settings`, {
      headers: {
        "Content-Type": "application/json",
        "X-Store-Domain": domain,
        "X-Store-Subdomain": domain,
        "X-Custom-Domain": domain,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      settingsCache.set(domain, { data, timestamp: Date.now() });
      return data;
    }
  } catch (err) {
    console.error(`[Server SSR] Erro ao buscar configurações para ${domain}:`, err.message);
  }

  return cached?.data || null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);

    // 1. Verificar se é arquivo estático existente em dist/
    let filePath = path.join(DIST_DIR, pathname);
    let isStaticFile = false;

    if (pathname !== "/" && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        isStaticFile = true;
      }
    }

    if (isStaticFile) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      if (pathname.startsWith("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // 2. Se for rota HTML (SPA Fallback para dist/index.html)
    const indexPath = path.join(DIST_DIR, "index.html");
    if (!fs.existsSync(indexPath)) {
      res.statusCode = 404;
      res.end("Build not found. Please run npm run build.");
      return;
    }

    let html = fs.readFileSync(indexPath, "utf8");

    // Identificar domínio da requisição tratando proxy, Cloudflare Worker e Railway
    let detectedHost = (
      req.headers["x-custom-domain"] ||
      req.headers["x-store-domain"] ||
      req.headers["x-store-subdomain"] ||
      ""
    ).toString().toLowerCase().trim();

    if (!detectedHost) {
      const fwdHost = (req.headers["x-forwarded-host"] || "").toString().toLowerCase();
      const firstHost = fwdHost.split(",")[0].trim().split(":")[0];
      if (firstHost && !firstHost.includes(".up.railway.app") && !firstHost.includes("railway.app")) {
        detectedHost = firstHost;
      }
    }

    if (!detectedHost) {
      const hostHeader = (req.headers.host || "").toString().toLowerCase().split(":")[0];
      if (hostHeader && !hostHeader.includes(".up.railway.app") && !hostHeader.includes("railway.app")) {
        detectedHost = hostHeader;
      }
    }

    const cleanHost = (detectedHost || "").split(",")[0].trim().split(":")[0].replace(/^www\./, "");
    console.log(`[SSR] Host detectado: '${cleanHost}' | X-Custom-Domain: '${req.headers["x-custom-domain"]}' | Host: '${req.headers.host}'`);

    const settings = cleanHost ? await getStoreSettings(cleanHost) : null;

    const storeName = settings?.storeName?.trim() || "Loja Online";
    const title = settings ? `${storeName} | Catálogo Online` : "Catálogo digital";
    const description = settings
      ? `Acesse o catálogo online da ${storeName} e confira nossos produtos a pronta entrega!`
      : "Confira nossos produtos a pronta entrega!";
    
    const rawLogoUrl = settings?.logoUrl ? buildFullLogoUrl(settings.logoUrl) : "";
    const canonicalHost = cleanHost || (req.headers.host || "").toString().toLowerCase().split(":")[0];
    const canonicalUrl = `https://${canonicalHost}${pathname}`;

    // Injeção de tags dinâmicas
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="description" content="${description}" />`);
    html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
    html = html.replace(/<meta\s+name=["']author["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="author" content="${storeName}" />`);

    if (rawLogoUrl) {
      html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:image" content="${rawLogoUrl}" />`);
      html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:image" content="${rawLogoUrl}" />`);
    } else {
      // Se não houver logo configurada, remove og:image com .svg para o Facebook não dar erro de formato inválido
      html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i, "");
      html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i, "");
    }

    if (html.includes("og:site_name")) {
      html = html.replace(/<meta\s+property=["']og:site_name["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:site_name" content="${storeName}" />`);
    } else {
      html = html.replace(/<\/head>/i, `  <meta property="og:site_name" content="${storeName}" />\n</head>`);
    }

    if (html.includes("og:url")) {
      html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    } else {
      html = html.replace(/<\/head>/i, `  <meta property="og:url" content="${canonicalUrl}" />\n</head>`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.end(html);
  } catch (err) {
    console.error("[Server Error]:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`[Server] Cliente LojaPod SSR rodando na porta ${PORT}`);
});
