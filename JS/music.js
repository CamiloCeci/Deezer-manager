// ======================================================================
// JS/music.js - MÓDULO DE MÚSICA Y API DEEZER (Refactorizado)
// ======================================================================

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
    27, 4050207, 13, 384236, 1188, 288166, 51214042, 10583405, 413667, 8354140,
    144227, 469614, 53457172, 156224, 12196, 75798, 10984, 90653, 1156, 614,
    174, 412, 1245, 9635632, 553315, 119, 1550, 243, 1128144, 1424163,
    1353625, 259362, 4162, 3540, 4003311, 538155, 6550777, 12178, 154
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
            tracksData.data.forEach((track, index) => {
                tracksHtml += `
                    <div class="track-row" onclick="console.log('Reproduciendo cancion id: ${track.id}')" style="cursor:pointer;">
                        <span class="track-num">0${index + 1}</span>
                        <div class="track-meta">
                            <span class="track-title">${track.title}</span>
                            <span class="track-album-name">${track.album.title}</span>
                        </div>
                        <span class="track-duration">${formatDuration(track.duration)}</span>
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
            tracksData.data.forEach((track, index) => {
                tracklistHtml += `
                    <div class="track-row" onclick="console.log('Reproduciendo track de album: ${track.id}')" style="cursor:pointer;">
                        <span class="track-num">${index + 1 < 10 ? '0' : ''}${index + 1}</span>
                        <div class="track-meta">
                            <span class="track-title">${track.title}</span>
                        </div>
                        <span class="track-duration">${formatDuration(track.duration)}</span>
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