// ======================================================================
// 1. IMPORTACIÓN DE MÓDULOS DE PROCESOS (Estructura de tu equipo)
// ======================================================================
// Nota: Más adelante, cuando creen estos archivos, descomentarán estas líneas.
// import { comprobarSesion, cerrarSesion } from './JS/auth.js';
// import { renderBuscador, initReproductor } from './JS/music.js';
// import { renderBiblioteca } from './JS/storage.js';

// ======================================================================
// 2. ORQUESTADOR DE NAVEGACIÓN (Control de pantallas y transiciones)
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarEventosGlobales();
    verificarEstadoInicial();
});

/**
 * Verifica si el usuario ya está autenticado al cargar la página.
 */
function verificarEstadoInicial() {
    // [PROGRAMADOR 1]: Aquí usarás tu lógica de cookies/tokens para validar la sesión[cite: 2, 3].
    // Por ahora, simulamos que no hay sesión activa para mostrar la Landing Page.
    const tieneSesionActiva = false; 

    if (tieneSesionActiva) {
        mostrarDashboardPrincipal();
    } else {
        // Muestra la Landing Page inicial por defecto
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('landing-hero').classList.remove('hidden');
        document.getElementById('login-container').classList.add('hidden');
    }
}

/**
 * Configura los escuchadores de eventos para los botones principales.
 */
function inicializarEventosGlobales() {
    
    // TRANSICIÓN 1: De Landing Page a Formulario de Login
    const btnComenzar = document.getElementById('btn-comenzar');
    if (btnComenzar) {
        btnComenzar.addEventListener('click', () => {
            document.getElementById('landing-hero').classList.add('hidden');
            document.getElementById('login-container').classList.remove('hidden');
            
            // INICIAR EFECTO MATRIX AL MOSTRAR EL LOGIN
            initMatrixEffect();
        });
    }

    // TRANSICIÓN 2: Envío del Formulario de Login (Simulado por ahora)
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault(); // Evita que la página se recargue[cite: 2]
            
            // [PROGRAMADOR 1]: Aquí va tu feedback visual de spinner obligatorio[cite: 3].
            const spinner = document.getElementById('auth-spinner');
            const btnSubmit = document.getElementById('btn-submit-login');
            
            spinner.classList.remove('hidden'); // Muestra indicador de carga[cite: 3]
            btnSubmit.disabled = true; // Bloquea el botón de acceso

            // Simulación de respuesta del servidor (2 segundos de retraso)
            setTimeout(() => {
                spinner.classList.add('hidden');
                btnSubmit.disabled = false;
                
                // Si la validación es correcta, pasamos a la app principal
                mostrarDashboardPrincipal();
            }, 2000);
        });
    }

    // [PROGRAMADOR 1]: Registro del evento del botón de Cerrar Sesión[cite: 3]
    // document.getElementById('btn-logout').addEventListener('click', () => { ... });
}

// ======================================================================
// 3. FUNCIONES DE INTERCAMBIO DE VISTAS (SPA Lógica)
// ======================================================================

/**
 * Da acceso al sistema, oculta la sección Auth y muestra la interfaz musical[cite: 3].
 */
function mostrarDashboardPrincipal() {
    // Oculta toda la sección de Auth (Landing y Login)
    document.getElementById('auth-section').classList.add('hidden');
    
    // Muestra la maqueta principal (Sidebar, Main Content, Reproductor)
    document.getElementById('app-layout').classList.remove('hidden');

    // [PROGRAMADOR 2]: Al entrar, ejecutamos por defecto la vista del Buscador[cite: 2]
    cargarVistaBuscador(); 
    
    // [PROGRAMADOR 2]: Inicializa los controles del reproductor inferior[cite: 2]
    // initReproductor();
}

/**
 * Limpia el contenedor central y clona la plantilla del Buscador[cite: 2]
 */
function cargarVistaBuscador() {
    const contenedor = document.getElementById('main-content');
    const plantilla = document.getElementById('temp-buscador');
    
    contenedor.innerHTML = ''; // Borra la pantalla anterior
    contenedor.appendChild(plantilla.content.cloneNode(true)); // Inserta la estructura limpia

    // [PROGRAMADOR 2]: Aquí llamarás a la función de tu archivo music.js 
    // para activar la lógica de fetch a la API de Deezer y los tops estáticos[cite: 2, 3].
    // renderBuscador();
}

/**
 * Limpia el contenedor central y clona la plantilla de la Biblioteca[cite: 2]
 */
function cargarVistaBiblioteca() {
    const contenedor = document.getElementById('main-content');
    const plantilla = document.getElementById('temp-biblioteca');
    
    contenedor.innerHTML = ''; // Borra la pantalla anterior
    contenedor.appendChild(plantilla.content.cloneNode(true)); // Inserta los favoritos

    // [PROGRAMADOR 3]: Aquí llamarás a la función de tu archivo storage.js
    // para pintar las tarjetas guardadas en LocalStorage y activar tus filtros por estrellas[cite: 2, 3].
    // renderBiblioteca();
}

//Funcion de diseño

/**
 * Crea el efecto de lluvia digital estilo Matrix adaptado con tonos violetas
 */
function initMatrixEffect() {
    const canvas = document.getElementById("matrix-canvas");
    const ctx = canvas.getContext("2d");

    // Ajustar el tamaño del lienzo al contenedor real
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Caracteres alocados (Katana, números, letras digitales)
    const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEF";
    const alphabet = katakana.split("");

    const fontSize = 16;
    const columns = canvas.width / fontSize;

    // Arreglo para registrar la posición Y de cada columna que cae
    const rainDrops = [];
    for (let x = 0; x < columns; x++) {
        rainDrops[x] = 1;
    }

    function draw() {
        // Fondo negro semi-transparente que genera el efecto rastro/estela
        ctx.fillStyle = "rgba(13, 6, 18, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Usamos tu color morado brillante para el texto de la lluvia
        ctx.fillStyle = "#9406B8"; 
        ctx.font = fontSize + "px 'Orbitron', monospace";

        for (let i = 0; i < rainDrops.length; i++) {
            const text = alphabet[Math.floor(Math.random() * alphabet.length)];
            
            // Variación sutil de color para darle profundidad (letras más brillantes que otras)
            if(Math.random() > 0.98) {
                ctx.fillStyle = "#FFF"; // Destello blanco ocasional en la punta de la gota
            } else {
                ctx.fillStyle = Math.random() > 0.5 ? "#9406B8" : "#701E85";
            }

            ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

            // Reiniciar la gota aleatoriamente cuando llegue al suelo
            if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                rainDrops[i] = 0;
            }
            rainDrops[i]++;
        }
    }

    // Ejecuta la animación de renderizado de forma continua
    setInterval(draw, 30);

    // Ajustar el canvas dinámicamente si cambian el tamaño de la ventana
    window.addEventListener('resize', () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    });
}