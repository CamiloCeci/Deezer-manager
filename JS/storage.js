// ======================================================================
// JS/storage.js - MÓDULO DE BIBLIOTECA / PERSISTENCIA (Programador 1) - v2
// ----------------------------------------------------------------------
// Cambios frente a v1:
//   - Ahora guarda DOS colecciones separadas por usuario:
//       * canciones  -> pistas individuales guardadas
//       * albumes    -> álbumes completos guardados
//   - Se exponen dos funciones puente para Dev 2:
//       * inyectarBotonGuardarCancion(cardElement, infoCancion)
//       * inyectarBotonGuardarAlbum(cardElement, infoAlbum)
//   - La vista de biblioteca se pinta con dos grids conmutables
//     (pestañas CANCIONES / ÁLBUMES) que ya existen en el template
//     temp-biblioteca del index.html.
//   - Sigue sin tocar el layout ni CSS: solo usa los ids del template.
// ======================================================================

import { mostrarCyberPopup } from './popup.js';

// ---------- Constantes ------------------------------------------------
const STORAGE_KEY = 'biblioteca_deezer';
// Estructura raíz:
// {
//   "usuarioA": { canciones: [ {..}, .. ], albumes: [ {..}, .. ] },
//   "usuarioB": { ... }
// }

// Estado de UI (pestaña activa, filtro, orden) — módulo-privado.
const estadoUI = {
    tipoActivo:   'canciones',   // 'canciones' | 'albumes'
    filtroRating: 'todos',
    orden:        'recientes'
};


// ======================================================================
// 0. SESIÓN + LECTURA / ESCRITURA DEL STORAGE
// ======================================================================

function obtenerUsuarioActivo() {
    return localStorage.getItem('usuario_activo');
}

function leerRaiz() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        console.warn('[storage] JSON corrupto, se reinicia.', e);
        return {};
    }
}

function escribirRaiz(raiz) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raiz));
}

/**
 * Garantiza que el usuario tenga la estructura { canciones:[], albumes:[] }.
 * Devuelve la referencia al objeto del usuario (mutable).
 */
function obtenerContenedorUsuario(raiz, usuario) {
    if (!raiz[usuario] || typeof raiz[usuario] !== 'object' || Array.isArray(raiz[usuario])) {
        // Migración suave si venías de v1 (array plano de álbumes).
        const legacyAlbumes = Array.isArray(raiz[usuario]) ? raiz[usuario] : [];
        raiz[usuario] = { canciones: [], albumes: legacyAlbumes };
    }
    if (!Array.isArray(raiz[usuario].canciones)) raiz[usuario].canciones = [];
    if (!Array.isArray(raiz[usuario].albumes))   raiz[usuario].albumes   = [];
    return raiz[usuario];
}


// ======================================================================
// 1. PUENTES PARA DEV 2 - BOTONES DE GUARDADO EN LAS TARJETAS DEL BUSCADOR
// ======================================================================

/**
 * Utilidad interna: crea un botón de guardado reutilizable (mismo SVG).
 * @param {string} etiquetaAria
 * @param {Function} onClick
 */
function crearBotonGuardar(etiquetaAria, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-guardar-biblioteca';
    btn.setAttribute('aria-label', etiquetaAria);
    btn.title = etiquetaAria;
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             width="20" height="20" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    `;
    btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        onClick();
    });
    return btn;
}

/**
 * Inyecta el botón "Guardar canción" en una tarjeta de canción (Dev 2).
 * @param {HTMLElement} cardElement
 * @param {{id:(string|number), titulo:string, artista:string,
 *          cover_url:string, preview_url?:string, duracion?:number,
 *          album_id?:(string|number), album_titulo?:string}} infoCancion
 */
export function inyectarBotonGuardarCancion(cardElement, infoCancion) {
    if (!cardElement || !infoCancion || infoCancion.id == null) return;
    if (cardElement.querySelector('.btn-guardar-biblioteca')) return;

    const btn = crearBotonGuardar(
        `Guardar canción "${infoCancion.titulo}" en mi biblioteca`,
        () => guardarCancionEnBiblioteca(infoCancion)
    );
    btn.dataset.cancionId = String(infoCancion.id);
    cardElement.appendChild(btn);
}

/**
 * Inyecta el botón "Guardar álbum" en una tarjeta de álbum (Dev 2).
 * @param {HTMLElement} cardElement
 * @param {{id:(string|number), titulo:string, artista:string,
 *          cover_url:string, tracks?:Array}} infoAlbum
 */
export function inyectarBotonGuardarAlbum(cardElement, infoAlbum) {
    if (!cardElement || !infoAlbum || infoAlbum.id == null) return;
    if (cardElement.querySelector('.btn-guardar-biblioteca')) return;

    const btn = crearBotonGuardar(
        `Guardar álbum "${infoAlbum.titulo}" en mi biblioteca`,
        () => guardarAlbumEnBiblioteca(infoAlbum)
    );
    btn.dataset.albumId = String(infoAlbum.id);
    cardElement.appendChild(btn);
}

// Alias retrocompatible con la v1 (Dev 2 llamaba a inyectarBotonGuardar).
export const inyectarBotonGuardar = inyectarBotonGuardarAlbum;


// ======================================================================
// 2. GUARDAR / ELIMINAR (CANCIONES Y ÁLBUMES)
// ======================================================================

/**
 * Guarda una canción individual en la biblioteca del usuario activo.
 * Añade rating=0 y timestamp para el orden LIFO (Stack).
 */
export function guardarCancionEnBiblioteca(cancion) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) {
        mostrarCyberPopup('ACCESO_REQUERIDO: Inicia sesión para guardar canciones.');
        return;
    }
    if (!cancion || cancion.id == null) return;

    const raiz  = leerRaiz();
    const store = obtenerContenedorUsuario(raiz, usuario);

    if (store.canciones.some(c => String(c.id) === String(cancion.id))) {
        mostrarCyberPopup(`"${cancion.titulo}" ya estaba en tu biblioteca.`);
        return;
    }

    store.canciones.push({
        id:           cancion.id,
        titulo:       cancion.titulo,
        artista:      cancion.artista,
        cover_url:    cancion.cover_url,
        preview_url:  cancion.preview_url || '',
        duracion:     cancion.duracion || 0,
        album_id:     cancion.album_id || null,
        album_titulo: cancion.album_titulo || '',
        rating:       0,
        timestamp:    Date.now()
    });

    escribirRaiz(raiz);
    mostrarCyberPopup(`CANCIÓN_GUARDADA: "${cancion.titulo}"`);
    actualizarVistaBiblioteca();
}

/**
 * Guarda un álbum completo (metadata + tracks) en la biblioteca.
 * Un álbum es esencialmente un array de canciones + metadata:
 * se guarda por referencia (id) para no duplicar por tracks internas.
 */
export function guardarAlbumEnBiblioteca(album) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) {
        mostrarCyberPopup('ACCESO_REQUERIDO: Inicia sesión para guardar álbumes.');
        return;
    }
    if (!album || album.id == null) return;

    const raiz  = leerRaiz();
    const store = obtenerContenedorUsuario(raiz, usuario);

    if (store.albumes.some(a => String(a.id) === String(album.id))) {
        mostrarCyberPopup(`"${album.titulo}" ya estaba en tu biblioteca.`);
        return;
    }

    store.albumes.push({
        id:        album.id,
        titulo:    album.titulo,
        artista:   album.artista,
        cover_url: album.cover_url,
        tracks:    Array.isArray(album.tracks) ? album.tracks : [],
        rating:    0,
        timestamp: Date.now()
    });

    escribirRaiz(raiz);
    mostrarCyberPopup(`ALBUM_GUARDADO: "${album.titulo}"`);
    actualizarVistaBiblioteca();
}

/**
 * Elimina un item (canción o álbum) según la pestaña indicada.
 * @param {'canciones'|'albumes'} tipo
 * @param {string|number} itemId
 */
export function eliminarDeBiblioteca(tipo, itemId) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return;

    const raiz  = leerRaiz();
    const store = obtenerContenedorUsuario(raiz, usuario);

    store[tipo] = store[tipo].filter(x => String(x.id) !== String(itemId));

    escribirRaiz(raiz);
    actualizarVistaBiblioteca();
}


// ======================================================================
// 3. LECTURA CRUDA + VISTA (FILTRO/ORDEN)
// ======================================================================

/** Devuelve el array crudo del tipo pedido para el usuario activo. */
export function obtenerItemsGuardados(tipo = 'canciones') {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return [];
    const raiz  = leerRaiz();
    const store = obtenerContenedorUsuario(raiz, usuario);
    return store[tipo] || [];
}

// Aliases descriptivos (compat con v1 y comodidad).
export const obtenerCancionesGuardadas = () => obtenerItemsGuardados('canciones');
export const obtenerAlbumesGuardados   = () => obtenerItemsGuardados('albumes');

/** Aplica filtro por rating + orden a la lista del tipo activo. */
function obtenerVistaActual() {
    let vista = obtenerItemsGuardados(estadoUI.tipoActivo).slice();

    if (estadoUI.filtroRating !== 'todos') {
        const objetivo = parseInt(estadoUI.filtroRating, 10);
        vista = vista.filter(x => Number(x.rating) === objetivo);
    }

    switch (estadoUI.orden) {
        case 'az':
            vista.sort((a, b) =>
                a.titulo.localeCompare(b.titulo) ||
                a.artista.localeCompare(b.artista));
            break;
        case 'za':
            vista.sort((a, b) => b.titulo.localeCompare(a.titulo));
            break;
        case 'antiguos':
            vista.sort((a, b) => a.timestamp - b.timestamp); // FIFO
            break;
        case 'recientes':
        default:
            vista.sort((a, b) => b.timestamp - a.timestamp); // Stack LIFO
            break;
    }
    return vista;
}


// ======================================================================
// 4. SISTEMA DE ESTRELLAS
// ======================================================================

/**
 * Actualiza el rating de un item del tipo indicado.
 * @param {'canciones'|'albumes'} tipo
 * @param {string|number} itemId
 * @param {number} nuevoRating - 1..5
 */
export function actualizarRating(tipo, itemId, nuevoRating) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return;
    if (nuevoRating < 1 || nuevoRating > 5) return;

    const raiz  = leerRaiz();
    const store = obtenerContenedorUsuario(raiz, usuario);
    const idx   = store[tipo].findIndex(x => String(x.id) === String(itemId));
    if (idx === -1) return;

    store[tipo][idx].rating = nuevoRating;
    escribirRaiz(raiz);
    actualizarVistaBiblioteca();
}

function construirEstrellasHTML(rating) {
    let html = '<div class="rating-stars" role="radiogroup" aria-label="Calificación">';
    for (let i = 1; i <= 5; i++) {
        const activa = i <= rating ? 'estrella-activa' : 'estrella-vacia';
        html += `
            <button type="button"
                    class="estrella ${activa}"
                    data-valor="${i}"
                    role="radio"
                    aria-checked="${i === rating}"
                    aria-label="${i} estrella${i > 1 ? 's' : ''}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     width="18" height="18"
                     fill="${i <= rating ? 'currentColor' : 'none'}"
                     stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round"
                     aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            </button>
        `;
    }
    html += '</div>';
    return html;
}


// ======================================================================
// 5. RENDERIZADO: TARJETAS + GRID + EMPTY STATE
// ======================================================================

/**
 * Construye la tarjeta de un item (canción o álbum). Comparten estilo
 * pero difieren en el subtítulo (artista vs artista · álbum) y en la
 * cantidad de tracks mostrada.
 */
function construirTarjetaItem(tipo, item) {
    const card = document.createElement('article');
    card.className = `album-card biblioteca-card biblioteca-card-${tipo}`;
    card.dataset.itemId = String(item.id);
    card.dataset.tipo   = tipo;

    const subtitulo = tipo === 'canciones'
        ? `${item.artista}${item.album_titulo ? ' · ' + item.album_titulo : ''}`
        : item.artista;

    const meta = tipo === 'albumes'
        ? `<span class="album-card-meta">${(item.tracks || []).length} pistas</span>`
        : '';

    card.innerHTML = `
        <div class="album-card-cover">
            <img src="${item.cover_url}" alt="Portada de ${item.titulo}" loading="lazy">
        </div>
        <div class="album-card-info">
            <h3 class="album-card-title">${item.titulo}</h3>
            <p class="album-card-artist">${subtitulo}</p>
            ${meta}
            ${construirEstrellasHTML(Number(item.rating) || 0)}
            <button type="button" class="btn-eliminar-biblioteca"
                    aria-label="Eliminar de la biblioteca">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     width="18" height="18" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                     aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6M14 11v6"></path>
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                </svg>
                Eliminar
            </button>
        </div>
    `;

    // Rating
    card.querySelectorAll('.estrella').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            actualizarRating(tipo, item.id, parseInt(btn.dataset.valor, 10));
        });
    });

    // Eliminar
    card.querySelector('.btn-eliminar-biblioteca')
        .addEventListener('click', (ev) => {
            ev.stopPropagation();
            eliminarDeBiblioteca(tipo, item.id);
        });

    return card;
}

/**
 * Función central: aplica filtro/orden sobre la pestaña activa,
 * limpia el grid correspondiente e inyecta las tarjetas. Alterna
 * la visibilidad del grid opuesto y del Empty State.
 */
export function actualizarVistaBiblioteca() {
    const gridCanciones = document.getElementById('biblioteca-canciones-grid');
    const gridAlbumes   = document.getElementById('biblioteca-albumes-grid');
    const empty         = document.getElementById('biblioteca-empty');
    if (!gridCanciones || !gridAlbumes || !empty) return;

    // 1) Mostrar solo el grid del tipo activo (el otro se oculta con .hidden).
    const activo   = estadoUI.tipoActivo;
    const gridAct  = activo === 'canciones' ? gridCanciones : gridAlbumes;
    const gridOff  = activo === 'canciones' ? gridAlbumes   : gridCanciones;
    gridOff.classList.add('hidden');
    gridOff.innerHTML = '';

    // 2) Calcular la vista (filtro + orden) y limpiar el grid activo.
    const vista = obtenerVistaActual();
    gridAct.innerHTML = '';

    // 3) Empty state contextual.
    if (vista.length === 0) {
        const titleEl = document.getElementById('biblioteca-empty-title');
        const msgEl   = document.getElementById('biblioteca-empty-msg');
        if (titleEl && msgEl) {
            if (activo === 'canciones') {
                titleEl.textContent = 'SIN_CANCIONES_GUARDADAS';
                msgEl.textContent   = 'Aún no has guardado canciones. Búscalas y pulsa el botón de guardar.';
            } else {
                titleEl.textContent = 'SIN_ALBUMES_GUARDADOS';
                msgEl.textContent   = 'Aún no has guardado álbumes. Búscalos y pulsa el botón de guardar.';
            }
        }
        empty.classList.remove('hidden');
        gridAct.classList.add('hidden');
        return;
    }

    empty.classList.add('hidden');
    gridAct.classList.remove('hidden');

    const frag = document.createDocumentFragment();
    vista.forEach(item => frag.appendChild(construirTarjetaItem(activo, item)));
    gridAct.appendChild(frag);
}


// ======================================================================
// 6. INICIALIZACIÓN DE LISTENERS
// ======================================================================

/**
 * Debe llamarse UNA VEZ desde app.js justo después de clonar el
 * template #temp-biblioteca dentro de #main-content (es decir, cuando
 * el usuario pulsa MY_LIBRARY en el sidebar).
 */
export function inicializarBiblioteca() {
    // Pestañas Canciones / Álbumes
    const tabCanciones = document.getElementById('tab-biblioteca-canciones');
    const tabAlbumes   = document.getElementById('tab-biblioteca-albumes');

    const activarTab = (tipo) => {
        estadoUI.tipoActivo = tipo;
        if (tabCanciones && tabAlbumes) {
            const esCanc = tipo === 'canciones';
            tabCanciones.classList.toggle('active',  esCanc);
            tabAlbumes.classList.toggle('active',   !esCanc);
            tabCanciones.setAttribute('aria-selected', String(esCanc));
            tabAlbumes.setAttribute('aria-selected',  String(!esCanc));
        }
        actualizarVistaBiblioteca();
    };

    if (tabCanciones) tabCanciones.addEventListener('click', () => activarTab('canciones'));
    if (tabAlbumes)   tabAlbumes.addEventListener('click',   () => activarTab('albumes'));

    // Filtro y orden
    const selFiltro = document.getElementById('filtro-estrellas');
    const selOrden  = document.getElementById('orden-biblioteca');

    if (selFiltro) {
        estadoUI.filtroRating = selFiltro.value || 'todos';
        selFiltro.addEventListener('change', (ev) => {
            estadoUI.filtroRating = ev.target.value;
            actualizarVistaBiblioteca();
        });
    }
    if (selOrden) {
        estadoUI.orden = selOrden.value || 'recientes';
        selOrden.addEventListener('change', (ev) => {
            estadoUI.orden = ev.target.value;
            actualizarVistaBiblioteca();
        });
    }

    // Primer pintado.
    actualizarVistaBiblioteca();
}


// ======================================================================
// 7. EXPOSICIÓN GLOBAL (para Dev 2 y debugging)
// ======================================================================
window.inyectarBotonGuardarCancion = inyectarBotonGuardarCancion;
window.inyectarBotonGuardarAlbum   = inyectarBotonGuardarAlbum;
window.inyectarBotonGuardar        = inyectarBotonGuardarAlbum; // compat v1
window.guardarCancionEnBiblioteca  = guardarCancionEnBiblioteca;
window.guardarAlbumEnBiblioteca    = guardarAlbumEnBiblioteca;
window.eliminarDeBiblioteca        = eliminarDeBiblioteca;
window.obtenerCancionesGuardadas   = obtenerCancionesGuardadas;
window.obtenerAlbumesGuardados     = obtenerAlbumesGuardados;
window.actualizarVistaBiblioteca   = actualizarVistaBiblioteca;
window.inicializarBiblioteca       = inicializarBiblioteca;
