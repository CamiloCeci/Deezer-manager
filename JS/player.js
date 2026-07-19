// Estado de la lista de tracks en reproducción actual
let playlistActual = [];
let indiceActual = -1;

// Elementos del DOM del Reproductor
let audio, btnPlayPause, iconPlay, iconPause, progressBar, timeCurrent, timeTotal, playerCover, playerTitle, playerArtist;

/**
 * Inicializa los nodos del DOM del reproductor y los listeners globales.
 * Se llama una sola vez al cargar la app.
 */
export function inicializarReproductor() {
    audio = document.getElementById('global-audio-player');
    btnPlayPause = document.getElementById('btn-player-play-pause');
    iconPlay = document.getElementById('icon-play');
    iconPause = document.getElementById('icon-pause');
    progressBar = document.getElementById('player-progress-bar');
    timeCurrent = document.getElementById('time-current');
    timeTotal = document.getElementById('time-total');
    playerCover = document.getElementById('player-cover');
    playerTitle = document.getElementById('player-title');
    playerArtist = document.getElementById('player-artist');

    const btnPrev = document.getElementById('btn-player-prev');
    const btnNext = document.getElementById('btn-player-next');
    const volumeSlider = document.getElementById('player-volume');

    if (!audio) return;

    // --- EVENTOS DEL AUDIO ENGINE ---
    
    // Actualización del tiempo transcurrido
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        // Mover la barra de rango proporcionalmente
        const porcentaje = (audio.currentTime / audio.duration) * 100;
        progressBar.value = porcentaje;
        timeCurrent.textContent = formatTime(audio.currentTime);
    });

    // Duración cargada de la canción
    audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
    });

    // Cuando termina la canción de Deezer (Duran 30s de preview) pasa automáticamente a la siguiente
    audio.addEventListener('ended', () => {
        siguienteCancion();
    });

    // --- EVENTOS DE INTERFAZ DE USUARIO ---

    // Click en Play / Pause de la barra inferior
    btnPlayPause.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(actualizarInterfazEstado).catch(console.error);
        } else {
            audio.pause();
            actualizarInterfazEstado();
        }
    });

    // Cambiar la posición del tiempo manualmente arrastrando la barra
    progressBar.addEventListener('input', () => {
        if (!audio.duration) return;
        const nuevoTiempo = (progressBar.value / 100) * audio.duration;
        audio.currentTime = nuevoTiempo;
    });

    // Control de volumen dinámico
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }

    // Botones de salto
    if (btnPrev) btnPrev.addEventListener('click', anteriorCancion);
    if (btnNext) btnNext.addEventListener('click', siguienteCancion);
}

/**
 * Registra un nuevo set list (álbum o top tracks) y arranca una canción específica.
 * @param {Array} tracks - Listado de objetos tipo track de la API.
 * @param {number} index - Posición de la canción elegida por el usuario.
 */
export function setTracklistYReproducir(tracks, index) {
    if (!tracks || tracks.length === 0) return;
    
    playlistActual = tracks;
    indiceActual = index;
    
    reproducirTrackActual();
}

/**
 * Carga el recurso src del track apuntado por el índice e inicia la reproducción.
 */
function reproducirTrackActual() {
    const track = playlistActual[indiceActual];
    if (!track || !track.preview) {
        console.error("Este track no cuenta con preview multimedia de Deezer.");
        return;
    }

    // Cambiar origen del audio
    audio.src = track.preview;
    
    // Inyectar metadatos en la esquina del reproductor
    playerTitle.textContent = track.title;
    // Si viene de álbum directo puede no tener track.artist independiente, usamos fallback
    playerArtist.textContent = track.artist ? track.artist.name : (track.album-name || "Artista del Álbum");
    
    // Tratamos de buscar la imagen del cover en el track o en su álbum contenedor
    if (track.album && track.album.cover_medium) {
        playerCover.src = track.album.cover_medium;
    } else {
        // Fallback por si estás reproduciendo desde la vista detalle del Álbum
        const albumHorizontalImg = document.querySelector('.album-horizontal-img img');
        playerCover.src = albumHorizontalImg ? albumHorizontalImg.src : 'https://via.placeholder.com/60';
    }

    // Resetear slider visual
    progressBar.value = 0;
    timeCurrent.textContent = "0:00";

    // Play Automático asíncrono
    audio.play()
        .then(actualizarInterfazEstado)
        .catch(err => console.log("Interrupción de reproducción controlada:", err));
}

function siguienteCancion() {
    if (playlistActual.length === 0) return;
    
    indiceActual++;
    // Si llega al final de la playlist, vuelve a empezar (Bucle)
    if (indiceActual >= playlistActual.length) {
        indiceActual = 0;
    }
    reproducirTrackActual();
}

function anteriorCancion() {
    if (playlistActual.length === 0) return;

    indiceActual--;
    // Si retrocede de la primera canción, va a la última de la lista
    if (indiceActual < 0) {
        indiceActual = playlistActual.length - 1;
    }
    reproducirTrackActual();
}

/**
 * Conmuta los SVGs de play y pause en base al estado real del hilo de audio.
 */
function actualizarInterfazEstado() {
    if (audio.paused) {
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
    } else {
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
    }
}

/**
 * Helper para pasar segundos planos a string con formato 'M:SS'
 */
function formatTime(segundos) {
    if (isNaN(segundos)) return "0:00";
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}