// ======================================================================
// JS/music.js - MÓDULO DE MÚSICA Y API DEEZER
// ======================================================================
import { setTracklistYReproducir } from './player.js';
import { mostrarCyberPopup } from './popup.js';
import {
    inyectarBotonGuardarCancion,
    inyectarBotonGuardarAlbum,
    guardarAlbumEnBiblioteca
} from './storage.js';
const BASE_API_URL = 'https://api.deezer.com';

// Variables de estado interno para paginar álbumes dinámicamente
let currentArtistId = null;
let currentAlbumIndex = 0;
const ALBUMS_LIMIT = 5;

/**
 * Función auxiliar para realizar fetch seguro a través de un Proxy CORS.
 */
async function fetchSeguro(url) {
    const urlConProxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(urlConProxy);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
/**
 * Inyecta el botón "guardar álbum" en una tarjeta del catálogo del
 * artista, pero interceptando el click para hacer un pre-fetch del
 * tracklist completo (para que la biblioteca funcione offline).
 */
function inyectarBotonGuardarAlbumConTracks(cardElement, albumApi) {
    // Base: crea el botón con tracks vacíos (por compatibilidad visual).
    inyectarBotonGuardarAlbum(cardElement, {
        id: albumApi.id,
        titulo: albumApi.title,
        artista: (albumApi.artist && albumApi.artist.name) || '',
        cover_url: albumApi.cover_medium || albumApi.cover_big || '',
        tracks: []
    });
    const btn = cardElement.querySelector('.btn-guardar-biblioteca');
    if (!btn) return;
    // Sustituimos el handler por uno que hace pre-fetch del tracklist.
    const nuevo = btn.cloneNode(true);
    btn.replaceWith(nuevo);
    nuevo.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const originalHtml = nuevo.innerHTML;
        nuevo.disabled = true;
        nuevo.innerHTML = '...';
        try {
            const [meta, tracksData] = await Promise.all([
                fetchSeguro(`${BASE_API_URL}/album/${albumApi.id}`),
                fetchSeguro(`${BASE_API_URL}/album/${albumApi.id}/tracks`)
            ]);
            guardarAlbumEnBiblioteca({
                id: meta.id,
                titulo: meta.title,
                artista: (meta.artist && meta.artist.name) || '',
                cover_url: meta.cover_medium || meta.cover_big || albumApi.cover_medium || '',
                tracks: (tracksData.data || []).map(t => ({
                    id: t.id,
                    titulo: t.title,
                    preview_url: t.preview || '',
                    duracion: t.duration || 0
                }))
            });
        } catch (e) {
            console.error('[music] Error pre-fetch tracklist álbum:', e);
            // Fallback: guardar sin tracks para no bloquear al usuario.
            guardarAlbumEnBiblioteca({
                id: albumApi.id,
                titulo: albumApi.title,
                artista: (albumApi.artist && albumApi.artist.name) || '',
                cover_url: albumApi.cover_medium || '',
                tracks: []
            });
        } finally {
            nuevo.disabled = false;
            nuevo.innerHTML = originalHtml;
        }
    });
}

export function renderBuscador() {
    inicializarEventosBuscador();
    cargarDestacadosAleatorios();
}

function inicializarEventosBuscador() {
    const form = document.getElementById('search-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('input-search-artist').value.trim();
            if (query) buscarArtista(query);
        });
    }

    const btnBackFeatured = document.getElementById('btn-back-to-featured');
    if (btnBackFeatured) {
        btnBackFeatured.addEventListener('click', () => {
            switchSearchView('featured');
        });
    }

    const btnBackArtist = document.getElementById('btn-back-to-artist');
    if (btnBackArtist) {
        btnBackArtist.addEventListener('click', () => {
            if (currentArtistId) {
                switchSearchView('profile');
            } else {
                switchSearchView('featured');
            }
        });
    }
}

function switchSearchView(vista) {
    const vFeatured = document.getElementById('view-featured-artists');
    const vProfile = document.getElementById('view-artist-profile');
    const vEmpty = document.getElementById('view-search-empty');
    const vAlbum = document.getElementById('view-album-detail');

    if(!vFeatured || !vProfile || !vEmpty || !vAlbum) return;

    vFeatured.classList.add('hidden');
    vProfile.classList.add('hidden');
    vEmpty.classList.add('hidden');
    vAlbum.classList.add('hidden');

    if (vista === 'featured') vFeatured.classList.remove('hidden');
    if (vista === 'profile') vProfile.classList.remove('hidden');
    if (vista === 'empty') vEmpty.classList.remove('hidden');
    if (vista === 'album') vAlbum.classList.remove('hidden');
}

// POOL DE ARTISTAS DESTACADOS
const POOL_ARTISTAS_DESTACADOS = [
    27, 12178, 10583405, 412, 144227, 13, 384236, 1188, 288166, 92, 413, 7047219,
    566, 10977, 409, 599, 4527779, 429675, 6705223, 126917, 7342, 927, 3381, 193331, 997,
    230, 4495513, 259, 75798, 169, 564, 399, 892, 535, 119, 174, 1, 293585, 1783,
    182, 381, 1297, 691, 1182, 134790, 4050205, 1194083, 1562681, 12246, 163, 1374
];

async function cargarDestacadosAleatorios() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    
    grid.innerHTML = `<div class="cyber-loader">SELECTING_RANDOM_ELITE_ARTISTS...</div>`;

    try {
        const indicesSeleccionados = new Set();
        while (indicesSeleccionados.size < 10 && indicesSeleccionados.size < POOL_ARTISTAS_DESTACADOS.length) {
            const indiceAleatorio = Math.floor(Math.random() * POOL_ARTISTAS_DESTACADOS.length);
            indicesSeleccionados.add(indiceAleatorio);
        }

        const seleccionDiezIds = Array.from(indicesSeleccionados).map(index => POOL_ARTISTAS_DESTACADOS[index]);

        const promesasArtistas = seleccionDiezIds.map(async (id) => {
            try {
                return await fetchSeguro(`${BASE_API_URL}/artist/${id}`);
            } catch (e) {
                console.error(`Error de conexión segura con ID: ${id}`, e);
            }
            return null;
        });

        const resultados = await Promise.all(promesasArtistas);
        const artistasValidos = resultados.filter(artist => artist !== null && !artist.error);

        grid.innerHTML = '';

        if (artistasValidos.length === 0) {
            grid.innerHTML = `<div class="error-msg">// ACCESS_DENIED: PROXY_TIMEOUT (Refresca con F5)</div>`;
            return;
        }

        artistasValidos.forEach(artist => {
            const card = document.createElement('div');
            card.className = 'featured-artist-card';
            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${artist.picture_medium || 'https://via.placeholder.com/250'}" alt="${artist.name}">
                </div>
                <div class="card-info">
                    <h3>${artist.name}</h3>
                    <p class="card-fans">// OYENTES: ${Number(artist.nb_fan).toLocaleString()}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                cargarPerfilArtista(artist.id);
            });

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error cargando el listado:", err);
        grid.innerHTML = `<div class="error-msg">// CRITICAL_ERROR: POOL_INACCESSIBLE</div>`;
    }
}

async function buscarArtista(nombre) {
    switchSearchView('featured');
    try {
        const result = await fetchSeguro(`${BASE_API_URL}/search/artist?q=${encodeURIComponent(nombre)}`);

        if (result.data && result.data.length > 0) {
            cargarPerfilArtista(result.data[0].id);
        } else {
            switchSearchView('empty');
        }
    } catch (error) {
        console.error("Error en búsqueda segura:", error);
        switchSearchView('empty');
    }
}

async function cargarPerfilArtista(artistId) {
    currentArtistId = artistId;
    currentAlbumIndex = 0; 

    const contenedorProfile = document.getElementById('artist-profile-detail');
    if (!contenedorProfile) return;

    contenedorProfile.innerHTML = `<div class="cyber-loader">COMPILING_ARTIST_DOSSIER...</div>`;
    switchSearchView('profile');

    try {
        const [artistData, tracksData] = await Promise.all([
            fetchSeguro(`${BASE_API_URL}/artist/${artistId}`),
            fetchSeguro(`${BASE_API_URL}/artist/${artistId}/top?limit=5`)
        ]);

        let tracksHtml = ''; 
        
        if (tracksData.data && tracksData.data.length > 0) {
            window.currentTracksContext = tracksData.data;

            tracksData.data.forEach((track, index) => {
                // Validación de la preview
                const tienePreview = track.preview && track.preview.trim() !== "";
                const claseDesactivada = tienePreview ? "" : "track-disabled";
                const accionClick = tienePreview 
                    ? `window.playTrackDesdeContexto(${index})` 
                    : `window.mostrarErrorTrack('${track.title.replace(/'/g, "\\'")}')`; // Protección por si el título tiene comillas

                // Concatenamos exactamente en tracksHtml
                tracksHtml += `
                    <div class="track-row ${claseDesactivada}" onclick="${accionClick}" style="cursor:pointer;">
                        <span class="track-num">${index + 1 < 10 ? '0' : ''}${index + 1}</span>
                        <div class="track-meta">
                            <span class="track-title">${track.title}</span>
                            <span class="track-album-name">${track.album.title}</span>
                        </div>
                        <span class="track-duration">${tienePreview ? formatDuration(track.duration) : '[RESTRICTED]'}</span>
                    </div>
                `;
            });
        } else {
            tracksHtml = '<p class="empty-msg">// NO_SINGLES_AVAILABLE</p>';
        }

        contenedorProfile.innerHTML = `
            <div class="artist-hero-header">
                <div class="artist-big-img">
                    <img src="${artistData.picture_big}" alt="${artistData.name}">
                </div>
                <div class="artist-header-info">
                    <h1 class="artist-name-title">${artistData.name}</h1>
                    <div class="artist-stats-grid">
                        <div><strong>FANS EN SISTEMA:</strong> ${Number(artistData.nb_fan).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div class="albums-grid-section">
                <h3 class="section-cyber-title">// CATÁLOGO_DE_ALBUMS</h3>
                <div id="artist-albums-container" class="albums-cyber-grid"></div>
                <div id="load-more-albums-box" class="btn-load-more-container">
                    <button id="btn-load-more-albums" class="btn-cyber-outline">Ver más álbumes</button>
                </div>
            </div>

            <div class="artist-content-body">
                <div class="top-tracks-section">
                    <h3 class="section-cyber-title">// SENCILLOS_ICÓNICOS</h3>
                    <div class="tracks-list-container">
                        ${tracksHtml}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-load-more-albums').addEventListener('click', fetchSiguienteBloqueAlbumes);
        await fetchSiguienteBloqueAlbumes();
        // Botones de guardar en cada fila de sencillos icónicos
        const filas = contenedorProfile.querySelectorAll('.tracks-list-container .track-row');
        filas.forEach((fila, i) => {
            const t = tracksData.data[i];
            if (!t) return;
            inyectarBotonGuardarCancion(fila, {
                id: t.id,
                titulo: t.title,
                artista: artistData.name,
                cover_url: (t.album && t.album.cover_medium) || artistData.picture_medium || '',
                preview_url: t.preview || '',
                duracion: t.duration || 0,
                album_id: t.album ? t.album.id : null,
                album_titulo: t.album ? t.album.title : ''
            });
        });

    } catch (error) {
        console.error("Error estructurando perfil seguro:", error);
        contenedorProfile.innerHTML = `<p class="error-msg">CRITICAL_ERROR: TIMEOUT_STREAM_DATA</p>`;
    }
}

async function fetchSiguienteBloqueAlbumes() {
    const contenedorAlbums = document.getElementById('artist-albums-container');
    const loadMoreButton = document.getElementById('btn-load-more-albums');
    if (!contenedorAlbums) return;

    try {
        const data = await fetchSeguro(`${BASE_API_URL}/artist/${currentArtistId}/albums?index=${currentAlbumIndex}&limit=${ALBUMS_LIMIT}`);

        if (data.data && data.data.length > 0) {
            data.data.forEach(album => {
                const item = document.createElement('div');
                item.className = 'album-card';
                item.innerHTML = `
                    <div class="album-img-wrapper">
                        <img src="${album.cover_medium}" alt="${album.title}">
                    </div>
                    <h4>${album.title}</h4>
                    <p>${album.release_date ? album.release_date.split('-')[0] : 'LP'}</p>
                `;
                
                // CAMBIO CLAVE: Ahora redirige a la vista de álbum independiente
                item.addEventListener('click', () => {
                    cargarVistaDetalleAlbum(album.id);
                });

                contenedorAlbums.appendChild(item);
                // Botón guardar álbum: PRE-FETCH del tracklist completo
                // para que la biblioteca funcione 100% offline luego.
                inyectarBotonGuardarAlbumConTracks(item, album);
            });

            currentAlbumIndex += data.data.length;

            if (data.data.length < ALBUMS_LIMIT) {
                if (loadMoreButton) loadMoreButton.style.display = 'none';
            }
        } else {
            if (loadMoreButton) loadMoreButton.style.display = 'none';
        }
    } catch (err) {
        console.error("Error paginando álbumes con proxy:", err);
    }
}

/**
 * NUEVA FUNCIÓN: Consulta el álbum y sus canciones, cambiando el foco hacia la Sub-vista D.
 */
async function cargarVistaDetalleAlbum(albumId) {
    const contenedorAlbum = document.getElementById('album-profile-detail');
    if (!contenedorAlbum) return;

    contenedorAlbum.innerHTML = `<div class="cyber-loader">RETRIEVING_ALBUM_FULL_DOSSIER...</div>`;
    switchSearchView('album');

    try {
        // Obtenemos los metadatos completos del álbum (para año y cantidad de canciones) y sus tracks
        const [albumMeta, tracksData] = await Promise.all([
            fetchSeguro(`${BASE_API_URL}/album/${albumId}`),
            fetchSeguro(`${BASE_API_URL}/album/${albumId}/tracks`)
        ]);

        const anioSalida = albumMeta.release_date ? albumMeta.release_date.split('-')[0] : 'N/A';
        const numCanciones = albumMeta.nb_tracks || (tracksData.data ? tracksData.data.length : 0);

        let tracklistHtml = '';
        
        if (tracksData.data && tracksData.data.length > 0) {
            window.currentTracksContext = tracksData.data;

            tracksData.data.forEach((track, index) => {
                const tienePreview = track.preview && track.preview.trim() !== "";
                const claseDesactivada = tienePreview ? "" : "track-disabled";
                const accionClick = tienePreview 
                    ? `window.playTrackDesdeContexto(${index})` 
                    : `window.mostrarErrorTrack('${track.title.replace(/'/g, "\\'")}')`;

                tracklistHtml += `
                    <div class="track-row ${claseDesactivada}" onclick="${accionClick}" style="cursor:pointer;">
                        <span class="track-num">${index + 1 < 10 ? '0' : ''}${index + 1}</span>
                        <div class="track-meta">
                            <span class="track-title">${track.title}</span>
                        </div>
                        <span class="track-duration">${tienePreview ? formatDuration(track.duration) : '[RESTRICTED]'}</span>
                    </div>
                `;
            });
        } else {
            tracklistHtml = '<p class="empty-msg">// TRACKLIST_EMPTY</p>';
        }

        contenedorAlbum.innerHTML = `
            <!-- CARD HORIZONTAL DEL ÁLBUM -->
            <div class="album-horizontal-card">
                <div class="album-horizontal-img">
                    <img src="${albumMeta.cover_big || 'https://via.placeholder.com/500'}" alt="${albumMeta.title}">
                </div>
                <div class="album-horizontal-info">
                    <h1 class="album-horizontal-title">${albumMeta.title}</h1>
                    <div class="album-meta-grid">
                        <div class="album-meta-item"><strong>AÑO:</strong> ${anioSalida}</div>
                        <div class="album-meta-item"><strong>TRACKS:</strong> ${numCanciones}</div>
                    </div>
                    <button type="button" id="btn-guardar-album-full" class="btn-cyber-outline btn-guardar-album-hero">
                        [ GUARDAR_ALBUM_COMPLETO ]
                    </button>
                </div>
            </div>
            
            <!-- COMPONENTE TRACKLIST -->
            <div class="top-tracks-section">
                <h3 class="section-cyber-title">// TRACKLIST_DEL_ALBUM</h3>
                <div class="tracks-list-container">
                    ${tracklistHtml}
                </div>
            </div>
        `;
        // Botón "guardar álbum completo" en la cabecera de la vista de detalle
        const artistaAlbum = (albumMeta.artist && albumMeta.artist.name) || '';
        const btnGuardarFull = document.getElementById('btn-guardar-album-full');
        if (btnGuardarFull) {
            btnGuardarFull.addEventListener('click', () => {
                guardarAlbumEnBiblioteca({
                    id: albumMeta.id,
                    titulo: albumMeta.title,
                    artista: artistaAlbum,
                    cover_url: albumMeta.cover_medium || albumMeta.cover_big || '',
                    tracks: (tracksData.data || []).map(t => ({
                        id: t.id,
                        titulo: t.title,
                        preview_url: t.preview || '',
                        duracion: t.duration || 0
                    }))
                });
            });
        }
        // Botones de guardar por canción individual en cada fila del tracklist
        const filasAlbum = contenedorAlbum.querySelectorAll('.tracks-list-container .track-row');
        filasAlbum.forEach((fila, i) => {
            const t = (tracksData.data || [])[i];
            if (!t) return;
            inyectarBotonGuardarCancion(fila, {
                id: t.id,
                titulo: t.title,
                artista: artistaAlbum,
                cover_url: albumMeta.cover_medium || albumMeta.cover_big || '',
                preview_url: t.preview || '',
                duracion: t.duration || 0,
                album_id: albumMeta.id,
                album_titulo: albumMeta.title
            });
        });

    } catch (error) {
        console.error("Error cargando detalle del álbum:", error);
        contenedorAlbum.innerHTML = `<p class="error-msg">CRITICAL_ERROR: UNABLE_TO_COMPILE_ALBUM_DATA</p>`;
    }
}

function formatDuration(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Puente global para ejecutar canciones desde el atributo onclick del HTML generado dinámicamente
window.playTrackDesdeContexto = function(index) {
    if (window.currentTracksContext) {
        setTracklistYReproducir(window.currentTracksContext, index);
    }
};

// Alerta temática para canciones sin preview en la API
window.mostrarErrorTrack = function(tituloCancion) {
    const msg = `// SECURITY_ALERT: El archivo para <strong>"${tituloCancion.toUpperCase()}"</strong> no está en Deezer.<br><br>Lo sentimos, selecciona otro artista en el buscador para continuar escuchando música sin interrupciones.`;
    mostrarCyberPopup(msg);
};