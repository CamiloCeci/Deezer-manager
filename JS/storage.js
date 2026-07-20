/* ================================================================
   MÓDULO: JS/storage.js
   Gestión de persistencia, biblioteca de favoritos, rating y
   filtrado/ordenación. Vanilla JS puro, sin frameworks.
   ================================================================ */

/* ---------- Clave raíz en localStorage ---------- */
const STORAGE_KEY = 'deezerManager_biblioteca';

/* ================================================================
   1) UTILIDADES DE SESIÓN Y USUARIO
   Se asume que existe un módulo de autenticación que expone el
   usuario activo. Si no, se usa 'invitado' como fallback seguro.
   ================================================================ */
function obtenerUsuarioActual() {
    // Se busca primero en sessionStorage (login vigente),
    // luego en localStorage; si no hay, se retorna 'invitado'.
    return sessionStorage.getItem('usuario_actual')
        || localStorage.getItem('usuario_actual')
        || 'invitado';
}

/* ================================================================
   2) LECTURA / ESCRITURA DEL OBJETO GLOBAL EN localStorage
   Estructura persistida:
   {
     "usuario1": [ { id, titulo, artista, cover_url, rating, timestamp } ],
     "usuario2": [ ... ]
   }
   ================================================================ */
function _leerStorage() {
    // Se intenta parsear; si falla o no existe, se retorna objeto vacío
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('Storage corrupto, reinicializando:', e);
        return {};
    }
}

function _escribirStorage(dataCompleta) {
    // Persistencia atómica del objeto completo
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataCompleta));
}

/* ================================================================
   3) API PÚBLICA DE PERSISTENCIA SEGMENTADA POR USUARIO
   ================================================================ */

/**
 * Retorna el array de favoritos del usuario activo.
 */
function obtenerFavoritos() {
    const data = _leerStorage();
    const user = obtenerUsuarioActual();
    return data[user] || [];
}

/**
 * Guarda (o actualiza) un álbum en el array del usuario activo.
 * Emula un Stack: los añadidos recientes van al final con timestamp.
 */
function guardarFavorito(album) {
    if (!album || !album.id) {
        console.warn('Álbum inválido, no se guarda.');
        return;
    }

    const data = _leerStorage();
    const user = obtenerUsuarioActual();
    const lista = data[user] || [];

    // Evitar duplicados: si ya existe, no re-insertar
    if (lista.some(a => String(a.id) === String(album.id))) return;

    // Se construye el objeto normalizado que se persistirá
    const nuevo = {
        id:         album.id,
        titulo:     album.titulo    || album.title || 'Sin título',
        artista:    album.artista   || album.artist || 'Desconocido',
        cover_url:  album.cover_url || album.cover  || '',
        rating:     album.rating    || 0,
        timestamp:  Date.now()  // Marca temporal para orden LIFO / stack
    };

    lista.push(nuevo);          // push => tope de la pila (más reciente)
    data[user] = lista;
    _escribirStorage(data);
}

/**
 * Elimina un álbum de la biblioteca del usuario activo.
 */
function eliminarFavorito(albumId) {
    const data = _leerStorage();
    const user = obtenerUsuarioActual();
    const lista = data[user] || [];

    data[user] = lista.filter(a => String(a.id) !== String(albumId));
    _escribirStorage(data);
}

/**
 * Actualiza el rating de un álbum específico (reactivo).
 */
function actualizarRating(albumId, nuevoRating) {
    const data = _leerStorage();
    const user = obtenerUsuarioActual();
    const lista = data[user] || [];

    const idx = lista.findIndex(a => String(a.id) === String(albumId));
    if (idx === -1) return;

    lista[idx].rating = nuevoRating;
    data[user] = lista;
    _escribirStorage(data);
}

/* ================================================================
   4) GENERADORES DE SVG (iconografía limpia estilo SVG Repo)
   ================================================================ */

/** SVG de disquete (guardar) */
function _svgGuardar() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>`;
}

/** SVG de papelera (eliminar) */
function _svgEliminar() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
}

/** SVG de estrella (rating) */
function _svgEstrella() {
    return `
    <svg class="star-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
         fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77
                       5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
}

/* ================================================================
   5) FACTORY: BOTÓN DE GUARDAR (para tarjetas del Buscador API)
   Uso por el Dev 2:
     const btn = crearBotonGuardar(albumObj);
     tarjeta.appendChild(btn);
   ================================================================ */
function crearBotonGuardar(album) {
    const btn = document.createElement('button');
    btn.className = 'btn-guardar';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Guardar en biblioteca');
    btn.innerHTML = `${_svgGuardar()}<span>Guardar</span>`;

    // Si el álbum ya está guardado, reflejarlo visualmente al render
    const yaGuardado = obtenerFavoritos()
        .some(a => String(a.id) === String(album.id));
    if (yaGuardado) {
        btn.classList.add('guardado');
        btn.querySelector('span').textContent = 'Guardado';
    }

    // Handler de clic: guarda y actualiza UI reactivamente
    btn.addEventListener('click', () => {
        guardarFavorito(album);
        btn.classList.add('guardado');
        btn.querySelector('span').textContent = 'Guardado';
        // Notifica al resto de la SPA para re-renderizar la biblioteca
        document.dispatchEvent(new CustomEvent('biblioteca:actualizada'));
    });

    return btn;
}

/* ================================================================
   6) COMPONENTE INTERACTIVO DE ESTRELLAS
   Inyecta 5 estrellas SVG dentro del contenedor pasado, con el
   rating actual resaltado y click handlers reactivos.
   ================================================================ */
function inyectarEstrellas(contenedor, albumId, ratingActual) {
    contenedor.innerHTML = ''; // Limpia previamente
    contenedor.classList.add('rating-stars');
    contenedor.setAttribute('role', 'radiogroup');
    contenedor.setAttribute('aria-label', 'Calificación del álbum');

    for (let i = 1; i <= 5; i++) {
        // Envolvemos el SVG en un span para asociar dataset y eventos
        const wrapper = document.createElement('span');
        wrapper.innerHTML = _svgEstrella();
        const star = wrapper.firstElementChild;
        star.dataset.value = i;
        star.setAttribute('role', 'radio');
        star.setAttribute('aria-checked', i === ratingActual);
        if (i <= ratingActual) star.classList.add('active');

        // Click: actualiza rating persistente y re-renderiza el grid
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            actualizarRating(albumId, i);
            renderizarBiblioteca(); // Re-render reactivo
        });

        contenedor.appendChild(star);
    }
}

/* ================================================================
   7) RENDER DE UNA TARJETA DE ÁLBUM EN LA BIBLIOTECA
   ================================================================ */
function _crearTarjetaBiblioteca(album) {
    const card = document.createElement('article');
    card.className = 'album-card';
    card.dataset.id = album.id;

    // Botón eliminar (esquina superior derecha)
    const btnDel = document.createElement('button');
    btnDel.className = 'icon-btn album-card__delete';
    btnDel.type = 'button';
    btnDel.setAttribute('aria-label', 'Eliminar de la biblioteca');
    btnDel.innerHTML = _svgEliminar();
    btnDel.addEventListener('click', () => {
        eliminarFavorito(album.id);
        renderizarBiblioteca();
    });

    // Portada
    const img = document.createElement('img');
    img.className = 'album-card__cover';
    img.src = album.cover_url || '';
    img.alt = `Portada de ${album.titulo}`;
    img.loading = 'lazy';

    // Cuerpo con título, artista y estrellas
    const body = document.createElement('div');
    body.className = 'album-card__body';

    const h3 = document.createElement('h3');
    h3.className = 'album-card__title';
    h3.textContent = album.titulo;

    const artist = document.createElement('p');
    artist.className = 'album-card__artist';
    artist.textContent = album.artista;

    const starsContainer = document.createElement('div');
    inyectarEstrellas(starsContainer, album.id, album.rating || 0);

    body.append(h3, artist, starsContainer);
    card.append(btnDel, img, body);
    return card;
}

/* ================================================================
   8) FILTRADO Y ORDENACIÓN + RENDER PRINCIPAL
   ================================================================ */
function renderizarBiblioteca() {
    const grid  = document.getElementById('biblioteca-grid');
    const empty = document.getElementById('biblioteca-empty');
    if (!grid || !empty) return;

    // 1. Obtener favoritos del usuario activo
    let lista = obtenerFavoritos();

    // 2. Aplicar filtro de estrellas
    const filtroEl = document.getElementById('filtro-estrellas');
    const filtro   = filtroEl ? filtroEl.value : 'todos';
    if (filtro !== 'todos') {
        const n = parseInt(filtro, 10);
        lista = lista.filter(a => (a.rating || 0) === n);
    }

    // 3. Aplicar ordenación
    const ordenEl = document.getElementById('orden-biblioteca');
    const orden   = ordenEl ? ordenEl.value : 'recientes';
    switch (orden) {
        case 'recientes':
            // Stack LIFO: más recientes primero (timestamp descendente)
            lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            break;
        case 'antiguos':
            lista.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            break;
        case 'az':
            lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
            break;
        case 'za':
            lista.sort((a, b) => b.titulo.localeCompare(a.titulo));
            break;
    }

    // 4. Empty state vs render normal
    grid.innerHTML = '';
    if (lista.length === 0) {
        empty.classList.remove('hidden');
        grid.classList.add('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.classList.remove('hidden');

    // 5. Inyectar tarjetas en el DOM
    const fragment = document.createDocumentFragment();
    lista.forEach(album => fragment.appendChild(_crearTarjetaBiblioteca(album)));
    grid.appendChild(fragment);
}

/* ================================================================
   9) INICIALIZACIÓN DE LISTENERS
   Se ejecuta cuando el DOM está listo. Enlaza los selectores del
   Bloque 1 con la función de render.
   ================================================================ */
function inicializarBiblioteca() {
    const filtro = document.getElementById('filtro-estrellas');
    const orden  = document.getElementById('orden-biblioteca');

    if (filtro) filtro.addEventListener('change', renderizarBiblioteca);
    if (orden)  orden.addEventListener('change',  renderizarBiblioteca);

    // Re-render cuando otro módulo notifique cambios (ej: guardar desde buscador)
    document.addEventListener('biblioteca:actualizada', renderizarBiblioteca);

    // Render inicial
    renderizarBiblioteca();
}

// Auto-arranque cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarBiblioteca);
} else {
    inicializarBiblioteca();
}

/* ================================================================
   10) EXPOSICIÓN GLOBAL (para consumo desde otros módulos JS)
   ================================================================ */
window.DeezerStorage = {
    obtenerFavoritos,
    guardarFavorito,
    eliminarFavorito,
    actualizarRating,
    crearBotonGuardar,
    renderizarBiblioteca,
    obtenerUsuarioActual
};
