// ======================================================================
// JS/storage.js - MÓDULO DE BIBLIOTECA / PERSISTENCIA (Programador 1)
// ----------------------------------------------------------------------
// Responsable de:
//   - Inyectar el botón "Guardar" en las tarjetas del buscador (Dev 2).
//   - Persistir favoritos en localStorage segmentados por usuario.
//   - Sistema de estrellas reactivo (rating 1..5).
//   - Filtrado por rating y ordenamiento (incluida Pila LIFO por timestamp).
//   - Renderizado del grid y control del Empty State.
//
// NOTA: No altera el layout ni el CSS. Se apoya en los ids/clases ya
// definidos en index.html:
//   #biblioteca-grid, #biblioteca-empty, #filtro-estrellas, #orden-biblioteca
// ======================================================================

import { mostrarCyberPopup } from './popup.js';

// ---------- Constantes internas ---------------------------------------
const STORAGE_KEY = 'biblioteca_deezer'; // objeto raíz { usuario: [albums] }

// Estado de UI (filtro/orden activos) — módulo-privado
const estadoUI = {
    filtroRating: 'todos',   // 'todos' | '1'..'5'
    orden: 'recientes'       // 'recientes' | 'antiguos' | 'az' | 'za'
};


// ======================================================================
// 0. UTILIDADES DE SESIÓN Y LECTURA DEL STORAGE
// ======================================================================

/**
 * Obtiene el usuario logueado actualmente (definido por auth.js).
 * Si no hay sesión activa devuelve null; las funciones de escritura
 * abortan en ese caso para no contaminar el storage.
 */
function obtenerUsuarioActivo() {
    return localStorage.getItem('usuario_activo');
}

/**
 * Devuelve el objeto raíz de la biblioteca desde localStorage.
 * Estructura garantizada: { "usuario": [ {album}, ... ] }
 */
function leerRaiz() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        console.warn('[storage] JSON corrupto, se reinicia.', e);
        return {};
    }
}

/**
 * Escribe el objeto raíz completo en localStorage.
 */
function escribirRaiz(raiz) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raiz));
}


// ======================================================================
// 1. PUENTE PARA EL DEV 2 - INYECCIÓN DEL BOTÓN "AÑADIR A LA BIBLIOTECA"
// ======================================================================

/**
 * Inyecta un botón de guardado dentro de una tarjeta generada por el
 * buscador de la API (Dev 2). No modifica el resto de la tarjeta.
 *
 * @param {HTMLElement} cardElement - Nodo DOM de la tarjeta del buscador.
 * @param {{id:(string|number), titulo:string, artista:string,
 *          cover_url:string, tracks?:Array}} infoAlbum - Datos del álbum.
 */
export function inyectarBotonGuardar(cardElement, infoAlbum) {
    if (!cardElement || !infoAlbum || !infoAlbum.id) return;

    // Evita duplicar el botón si la tarjeta se re-renderiza.
    if (cardElement.querySelector('.btn-guardar-biblioteca')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-guardar-biblioteca';
    btn.setAttribute('aria-label', `Guardar ${infoAlbum.titulo} en mi biblioteca`);
    btn.title = 'Guardar en mi biblioteca';
    btn.dataset.albumId = String(infoAlbum.id);

    // SVG limpio tipo "disquete" (guardado). Hereda color con currentColor.
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

    // Delegación directa: al hacer clic, se guarda el álbum recibido.
    btn.addEventListener('click', (ev) => {
        ev.stopPropagation();      // evita disparar handlers de la tarjeta
        ev.preventDefault();
        guardarEnBiblioteca(infoAlbum);
    });

    cardElement.appendChild(btn);
}
// Exposición global para que Dev 2 pueda invocarla sin importar el módulo.
window.inyectarBotonGuardar = inyectarBotonGuardar;


// ======================================================================
// 2. PERSISTENCIA SEGMENTADA POR USUARIO
// ======================================================================

/**
 * Guarda un álbum en la biblioteca del usuario activo.
 * Añade automáticamente rating=0 y timestamp=Date.now().
 * Si el álbum ya existe (mismo id), no lo duplica.
 *
 * @param {Object} album - { id, titulo, artista, cover_url, tracks? }
 */
export function guardarEnBiblioteca(album) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) {
        mostrarCyberPopup('ACCESO_REQUERIDO: Inicia sesión para guardar álbumes.');
        return;
    }
    if (!album || album.id == null) return;

    const raiz = leerRaiz();
    const lista = raiz[usuario] || [];

    // Prevención de duplicados por id
    if (lista.some(a => String(a.id) === String(album.id))) {
        mostrarCyberPopup(`"${album.titulo}" ya estaba en tu biblioteca.`);
        return;
    }

    // Registro normalizado que se persiste
    const registro = {
        id: album.id,
        titulo: album.titulo,
        artista: album.artista,
        cover_url: album.cover_url,
        tracks: Array.isArray(album.tracks) ? album.tracks : [],
        rating: 0,
        timestamp: Date.now()   // clave para el orden LIFO (Stack)
    };

    lista.push(registro);
    raiz[usuario] = lista;
    escribirRaiz(raiz);

    mostrarCyberPopup(`ALBUM_GUARDADO: "${album.titulo}"`);
    actualizarVistaBiblioteca();
}

/**
 * Elimina un álbum de la biblioteca del usuario activo por su id.
 * @param {string|number} albumId
 */
export function eliminarDeBiblioteca(albumId) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return;

    const raiz = leerRaiz();
    const lista = raiz[usuario] || [];
    raiz[usuario] = lista.filter(a => String(a.id) !== String(albumId));
    escribirRaiz(raiz);

    actualizarVistaBiblioteca();
}

/**
 * Devuelve el array bruto de álbumes guardados del usuario activo.
 * Nunca aplica filtros/orden; para eso está `obtenerVistaActual()`.
 * @returns {Array}
 */
export function obtenerAlbumesGuardados() {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return [];
    const raiz = leerRaiz();
    return raiz[usuario] || [];
}


// ======================================================================
// 3. LÓGICA DE FILTRO Y ORDENAMIENTO
// ======================================================================

/**
 * Aplica el filtro de rating y el ordenamiento activo sobre la lista
 * cruda del usuario. Devuelve un NUEVO array (no muta el original).
 */
function obtenerVistaActual() {
    let vista = obtenerAlbumesGuardados().slice(); // copia defensiva

    // --- Filtrado por número de estrellas ---
    if (estadoUI.filtroRating !== 'todos') {
        const objetivo = parseInt(estadoUI.filtroRating, 10);
        vista = vista.filter(a => Number(a.rating) === objetivo);
    }

    // --- Ordenamiento ---
    switch (estadoUI.orden) {
        case 'az':
            // Alfabético A-Z por título; fallback al artista si empatan.
            vista.sort((a, b) =>
                a.titulo.localeCompare(b.titulo) ||
                a.artista.localeCompare(b.artista)
            );
            break;
        case 'za':
            vista.sort((a, b) => b.titulo.localeCompare(a.titulo));
            break;
        case 'antiguos':
            vista.sort((a, b) => a.timestamp - b.timestamp); // FIFO
            break;
        case 'recientes':
        default:
            // ESTRUCTURA DE PILA (LIFO): el último añadido queda arriba.
            // Se emula ordenando descendentemente por timestamp.
            vista.sort((a, b) => b.timestamp - a.timestamp);
            break;
    }

    return vista;
}


// ======================================================================
// 4. SISTEMA DE ESTRELLAS REACTIVO
// ======================================================================

/**
 * Actualiza la calificación de un álbum del usuario activo.
 * Persiste el cambio y re-renderiza el grid para reflejar el filtro.
 *
 * @param {string|number} albumId
 * @param {number} nuevoRating - Valor entre 1 y 5.
 */
export function actualizarRating(albumId, nuevoRating) {
    const usuario = obtenerUsuarioActivo();
    if (!usuario) return;
    if (nuevoRating < 1 || nuevoRating > 5) return;

    const raiz = leerRaiz();
    const lista = raiz[usuario] || [];
    const idx = lista.findIndex(a => String(a.id) === String(albumId));
    if (idx === -1) return;

    lista[idx].rating = nuevoRating;
    raiz[usuario] = lista;
    escribirRaiz(raiz);

    actualizarVistaBiblioteca();
}

/**
 * Construye el bloque HTML de 5 estrellas para una tarjeta.
 * Cada estrella conoce su valor mediante data-valor.
 */
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
// 5. RENDERIZADO DEL GRID Y EMPTY STATE
// ======================================================================

/**
 * Genera el nodo DOM de una tarjeta de la biblioteca (no del buscador).
 */
function construirTarjetaBiblioteca(album) {
    const card = document.createElement('article');
    card.className = 'album-card biblioteca-card';
    card.dataset.albumId = String(album.id);

    card.innerHTML = `
        <div class="album-card-cover">
            <img src="${album.cover_url}" alt="Portada de ${album.titulo}" loading="lazy">
        </div>
        <div class="album-card-info">
            <h3 class="album-card-title">${album.titulo}</h3>
            <p class="album-card-artist">${album.artista}</p>
            ${construirEstrellasHTML(Number(album.rating) || 0)}
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

    // --- Handlers propios de la tarjeta ---

    // Clic en cualquier estrella -> actualizar rating.
    card.querySelectorAll('.estrella').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const valor = parseInt(btn.dataset.valor, 10);
            actualizarRating(album.id, valor);
        });
    });

    // Botón eliminar.
    card.querySelector('.btn-eliminar-biblioteca')
        .addEventListener('click', (ev) => {
            ev.stopPropagation();
            eliminarDeBiblioteca(album.id);
        });

    return card;
}

/**
 * Función central: lee la vista (filtro + orden aplicados), limpia el
 * grid y lo repuebla. Alterna la visibilidad del Empty State.
 */
export function actualizarVistaBiblioteca() {
    const grid = document.getElementById('biblioteca-grid');
    const empty = document.getElementById('biblioteca-empty');
    if (!grid || !empty) return;

    const vista = obtenerVistaActual();

    // Limpieza total del contenedor antes de re-inyectar.
    grid.innerHTML = '';

    if (vista.length === 0) {
        empty.classList.remove('hidden');
        grid.classList.add('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');

    // DocumentFragment: minimiza reflows al insertar N tarjetas.
    const frag = document.createDocumentFragment();
    vista.forEach(album => frag.appendChild(construirTarjetaBiblioteca(album)));
    grid.appendChild(frag);
}


// ======================================================================
// 6. INICIALIZACIÓN DE LISTENERS (selectores de filtro y orden)
// ======================================================================

/**
 * Enlaza los <select> existentes en el HTML con el estado interno y
 * pinta la biblioteca por primera vez. Debe llamarse una sola vez
 * desde app.js tras cargar el DOM (o tras iniciar sesión).
 */
export function inicializarBiblioteca() {
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
// 7. EXPOSICIÓN GLOBAL (para Dev 2 y para debugging desde consola)
// ======================================================================
window.guardarEnBiblioteca     = guardarEnBiblioteca;
window.eliminarDeBiblioteca    = eliminarDeBiblioteca;
window.obtenerAlbumesGuardados = obtenerAlbumesGuardados;
window.actualizarVistaBiblioteca = actualizarVistaBiblioteca;
