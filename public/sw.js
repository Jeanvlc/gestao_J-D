// Cache do app para abrir sem sinal. Não usa Background Sync (o envio é feito pela página).
const CACHE = 'va-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
)

async function guardar(url) {
  const res = await fetch(url)
  // redirecionado = não logado (foi para /login): não guardar no lugar da página
  if (res.ok && !res.redirected) await (await caches.open(CACHE)).put(url, res)
}

self.addEventListener('message', (e) => {
  if (e.data?.guardar) e.waitUntil(Promise.all(e.data.guardar.map((u) => guardar(u).catch(() => {}))))
})

// rede primeiro, mas com sinal fraco usa o cache depois de 3 s
async function navegar(req, caminho) {
  const rede = fetch(req).then(async (res) => {
    if (res.ok && !res.redirected) await (await caches.open(CACHE)).put(caminho, res.clone())
    return res
  })
  const doCache = await caches.match(caminho)
  if (!doCache) return rede.catch(async () => (await caches.match('/')) || Response.error())
  return Promise.race([rede, new Promise((r) => setTimeout(() => r(doCache), 3000))]).catch(() => doCache)
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) return

  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then(async (res) => {
        if (res.ok) await (await caches.open(CACHE)).put(req, res.clone())
        return res
      }))
    )
  } else if (req.mode === 'navigate') {
    e.respondWith(navegar(req, url.pathname))
  }
})
