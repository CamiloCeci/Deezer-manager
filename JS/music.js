// ======================================================================
// JS/music.js - MÓDULO DE MÚSICA Y API DEEZER (Programador 2)
// ======================================================================

const BASE_API_URL = 'https://api.deezer.com';

// Variables de estado interno para paginar álbumes dinámicamente
let currentArtistId = null;
let currentAlbumIndex = 0;
const ALBUMS_LIMIT = 5;

/**
 * Función auxiliar para realizar fetch seguro a través de un Proxy CORS.
 * Previene el error 'TypeError: Failed to fetch' en todas las peticiones del módulo.
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

    const btnBack = document.getElementById('btn-back-to-featured');
    if (btnBack) {
        document.getElementById('btn-back-to-featured').addEventListener('click', () => {
            switchSearchView('featured');
        });
    }
}

function switchSearchView(vista) {
    const vFeatured = document.getElementById('view-featured-artists');
    const vProfile = document.getElementById('view-artist-profile');
    const vEmpty = document.getElementById('view-search-empty');

    if(!vFeatured || !vProfile || !vEmpty) return;

    vFeatured.classList.add('hidden');
    vProfile.classList.add('hidden');
    vEmpty.classList.add('hidden');

    if (vista === 'featured') vFeatured.classList.remove('hidden');
    if (vista === 'profile') vProfile.classList.remove('hidden');
    if (vista === 'empty') {
        vEmpty.classList.remove('hidden');
    }
}

// TU LISTA DE CONTROL DE CALIDAD - SÓLO ESTOS ARTISTAS SE MOSTRARÁN
const POOL_ARTISTAS_DESTACADOS = [
    27,      /* Daft Punk */
    4050207, /* Bruno Mars */
    13,      /* Eminem */
    384236,  /* Michael Jackson */
    1188,    /* Rihanna */
    288166,  /* Avicii */
    51214042,/* Dua Lipa */
    10583405,/* Billie Eilish */
    413667,  /* The Weeknd */
    8354140, /* Kygo */
    144227,  /* Calvin Harris */
    469614,  /* Lana Del Rey */
    53457172,/* Olivia Rodrigo */
    156224,  /* Kendrick Lamar */
    12196,   /* Arctic Monkeys */
    75798,   /* Muse */
    10984,   /* Gorillaz */
    90653,   /* David Guetta */
    1156,    /* Kanye West */
    614,     /* Red Hot Chili Peppers */
    174,     /* Coldplay */
    412,     /* Queen */
    1245,    /* Metallica */
    9635632, /* Travis Scott */
    553315,  /* Ed Sheeran */
    119,     /* Linkin Park */
    1550,    /* AC/DC */
    243,     /* Beyoncé */
    1128144, /* Taylor Swift */
    1424163, /* Justin Bieber */
    1353625, /* Post Malone */
    259362,  /* Drake */
    4162,    /* Maroon 5 */
    3540,    /* OneRepublic */
    429665,  /* Bruno Mars */
    4003311, /* Sia */
    538155,  /* Marshmello */
    6550777, /* Khalid */
    12178,   /* Radiohead */
    154      /* Green Day */
];

async function cargarDestacadosAleatorios() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    
    grid.innerHTML = `<div class="cyber-loader">SELECTING_RANDOM_ELITE_ARTISTS...</div>`;

    try {
        // Garantizamos 10 índices únicos usando un Set directamente sobre la lista original existente
        const indicesSeleccionados = new Set();
        
        while (indicesSeleccionados.size < 10 && indicesSeleccionados.size < POOL_ARTISTAS_DESTACADOS.length) {
            const indiceAleatorio = Math.floor(Math.random() * POOL_ARTISTAS_DESTACADOS.length);
            indicesSeleccionados.add(indiceAleatorio);
        }

        const seleccionDiezIds = Array.from(indicesSeleccionados).map(index => POOL_ARTISTAS_DESTACADOS[index]);

        // Mapeo Asíncrono Directo al recurso por ID único mediante el fetch seguro
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
        // Ejecución paralela protegida por el proxy de Deezer
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

            <div id="album-tracks-preview" class="album-tracks-modal hidden"></div>

            <div class="albums-grid-section">
                <h3 class="section-cyber-title">// PRODUCED_ALBUMS_CATALOG</h3>
                <div id="artist-albums-container" class="albums-cyber-grid"></div>
                <div id="load-more-albums-box" class="btn-load-more-container">
                    <button id="btn-load-more-albums" class="btn-cyber-outline">Ver más álbumes</button>
                </div>
            </div>

            <div class="artist-content-body">
                <div class="top-tracks-section">
                    <h3 class="section-cyber-title">// TOP_5_ICONIC_SINGLES</h3>
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
                
                item.addEventListener('click', () => {
                    cargarCancionesDeAlbum(album.id, album.title);
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

async function cargarCancionesDeAlbum(albumId, albumTitle) {
    const previewBox = document.getElementById('album-tracks-preview');
    if (!previewBox) return;

    previewBox.innerHTML = `<div class="cyber-loader">RETRIEVING_ALBUM_TRACKLIST...</div>`;
    previewBox.classList.remove('hidden');
    previewBox.scrollIntoView({ behavior: 'smooth' });

    try {
        const data = await fetchSeguro(`${BASE_API_URL}/album/${albumId}/tracks`);

        let tracklistHtml = '';
        if (data.data && data.data.length > 0) {
            data.data.forEach((track, index) => {
                tracklistHtml += `
                    <div class="track-row" onclick="console.log('Seleccionada track de album: ${track.id}')" style="cursor:pointer; background: rgba(0,0,0,0.2); margin-bottom:4px;">
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

        previewBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--color-acento); padding-bottom:8px; margin-bottom:12px;">
                <h4>// ALBUM_TRACKS: ${albumTitle.toUpperCase()}</h4>
                <button onclick="document.getElementById('album-tracks-preview').classList.add('hidden')" class="btn-cyber-outline" style="padding:4px 10px; font-size:0.7rem;">Cerrar panel</button>
            </div>
            <div class="tracks-list-container">
                ${tracklistHtml}
            </div>
        `;

    } catch (error) {
        console.error("Error trayendo canciones del álbum seguro:", error);
        previewBox.innerHTML = `<p class="error-msg">// ACCESS_ERROR_TRACKLIST</p>`;
    }
}

function formatDuration(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}