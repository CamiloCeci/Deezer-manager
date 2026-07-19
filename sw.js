// ======================================================================
// sw.js - SERVICE WORKER DE LA TERMINAL CYBERPUNK (Modo Offline)
// ======================================================================

const CACHE_ESTATICO = 'cyber-static-v1';
const CACHE_DINAMICO = 'cyber-dynamic-v1';

// 1. Recursos estáticos iniciales (App Shell de la aplicación)
const APP_SHELL = [
    './',
    './index.html',
    './app.js',
    './Styles/styles.css',
    './JS/auth.js',
    './JS/music.js',
    './JS/player.js',
    './JS/storage.js',
    
    // CACHÉ DE TIPOGRAFÍAS (Google Fonts externas)
    // El SW interceptará estas URLs y guardará los archivos de fuentes en local
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap',
    'https://fonts.gstatic.com'
];

// Función auxiliar para limitar el tamaño del caché dinámico
function limpiarCacheDinamico(cacheName, maxItems) {
    caches.open(cacheName).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > maxItems) {
                cache.delete(keys[0]).then(() => limpiarCacheDinamico(cacheName, maxItems));
            }
        });
    });
}

// EVENTO INSTALL: Congela los archivos base de la aplicación
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_ESTATICO).then(cache => {
            console.log('SYSTEM_SW: Congelando App Shell en caché estático');
            return cache.addAll(APP_SHELL);
        }).then(() => self.skipWaiting())
    );
});

// EVENTO ACTIVATE: Limpia directorios de caché obsoletos si se actualiza la versión
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_ESTATICO && key !== CACHE_DINAMICO) {
                        console.log('SYSTEM_SW: Eliminando registros obsoletos:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// EVENTO FETCH: Orquestador inteligente de peticiones
self.addEventListener('fetch', e => {
    // Excluir peticiones de audio pesadas (Previews de Deezer) para evitar cuellos de botella de red
    if (e.request.url.includes('.mp3') || e.request.url.includes('stream')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(res => {
            // Estrategia Cache First: Si el archivo existe en el caché local, se sirve de inmediato
            if (res) return res;

            // Si no existe, se realiza la petición normal a la red
            return fetch(e.request).then(newRes => {
                // Si la petición es una imagen externa (como las carátulas de Deezer), la guardamos dinámicamente
                if (e.request.url.includes('dzcdn.net') || e.request.url.includes('images.unsplash.com')) {
                    return caches.open(CACHE_DINAMICO).then(cache => {
                        cache.put(e.request, newRes.clone());
                        limpiarCacheDinamico(CACHE_DINAMICO, 50); // Guardar máximo 50 carátulas
                        return newRes;
                    });
                }
                return newRes;
            }).catch(() => {
                // Respuesta de emergencia si falla internet por completo y se busca un recurso no guardado
                if (e.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});