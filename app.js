// ======================================================================
// 1. IMPORTACIÓN DE MÓDULOS DE PROCESOS (Estructura de tu equipo)
// ======================================================================
// Nota: Más adelante, cuando creen estos archivos, descomentarán estas líneas.
// import { comprobarSesion, cerrarSesion } from './JS/auth.js';
import { inicializarReproductor } from './JS/player.js';
import { renderBuscador } from './JS/music.js';
import { iniciarSesion, registrarUsuario, comprobarEstadoSesion } from './JS/auth.js';


// Variable global para controlar el intervalo de Matrix
let matrixIntervalId = null;

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
    const tieneSesionActiva = comprobarEstadoSesion(); 

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
            initMatrixEffect();
        });
    }

    // ======================================================================
    // INTERCAMBIO ENTRAR LOGIN / REGISTRO (NUEVO CONTROL)
    // ======================================================================
    const btnGoRegister = document.getElementById('btn-go-register');
    const btnGoLogin = document.getElementById('btn-go-login');
    
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const terminalSubtitle = document.getElementById('terminal-subtitle');

    if (btnGoRegister && btnGoLogin) {
        // Al hacer click en "Registrarse"
        btnGoRegister.addEventListener('click', () => {
            formLogin.classList.add('hidden');       // Oculta login
            formRegister.classList.remove('hidden');  // Muestra registro
            
            btnGoRegister.classList.add('hidden');    // Oculta el botón de ir a registro
            btnGoLogin.classList.remove('hidden');    // Muestra el botón de volver a login
            
            terminalSubtitle.textContent = "MODE: AUTH_REGISTER"; // Cambia el encabezado
        });

        // Al hacer click en "Volver al Login"
        btnGoLogin.addEventListener('click', () => {
            formRegister.classList.add('hidden');     // Oculta registro
            formLogin.classList.remove('hidden');     // Muestra login
            
            btnGoLogin.classList.add('hidden');       // Oculta el botón de volver
            btnGoRegister.classList.remove('hidden'); // Muestra el botón de registrarse
            
            terminalSubtitle.textContent = "MODE: AUTH_LOGIN"; // Restaura el encabezado
        });
    }
    // [PROGRAMADOR 1]: Envío del Formulario de Login (REAL)
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userVal = document.getElementById('login-user').value;
            const passVal = document.getElementById('login-pass').value;
            const spinner = document.getElementById('auth-spinner');
            const btnSubmit = document.getElementById('btn-submit-login');
            
            // LLAMADA REAL A AUTH.JS
            const resultado = iniciarSesion(userVal, passVal);

            if (resultado.exito) {
                // Si las credenciales existen, activamos la carga por estética cyberpunk
                spinner.classList.remove('hidden');
                btnSubmit.disabled = true;

                setTimeout(() => {
                    spinner.classList.add('hidden');
                    btnSubmit.disabled = false;
                    mostrarDashboardPrincipal(); // ¡Adentro del sistema!
                }, 2000);
            } else {
                // Si falla, mostramos el error temático que devuelve auth.js sin pasar de pantalla
                alert(resultado.mensaje); 
            }
        });
    }

    // [PROGRAMADOR 1]: Envío del Formulario de Registro (REAL)
    if (formRegister) {
        formRegister.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userVal = document.getElementById('reg-user').value;
            const pass = document.getElementById('reg-pass').value;
            const passConfirm = document.getElementById('reg-pass-confirm').value;

            // Validación local obligatoria de contraseñas
            if (pass !== passConfirm) {
                alert("CRITICAL ERROR: ACCESS CODES DO NOT MATCH");
                return;
            }

            const spinnerReg = document.getElementById('reg-spinner');
            const btnSubmitReg = document.getElementById('btn-submit-register');
            
            // LLAMADA REAL A AUTH.JS para guardar en LocalStorage
            const resultado = registrarUsuario(userVal, pass);

            if (resultado.exito) {
                spinnerReg.classList.remove('hidden');
                btnSubmitReg.disabled = true;

                setTimeout(() => {
                    spinnerReg.ctx;
                    spinnerReg.classList.add('hidden');
                    btnSubmitReg.disabled = false;
                    alert(`SYSTEM_MESSAGE: ${resultado.mensaje}. PROCEED TO ACCESS TERMINAL.`);
                    
                    // Limpia el formulario y hace clic automático para regresar al login
                    formRegister.reset();
                    btnGoLogin.click(); 
                }, 2500);
            } else {
                // Alerta si el usuario ya existe en la "base de datos"
                alert(resultado.mensaje);
            }
        });
    }

    // NAVEGACIÓN SIDEBAR (INTERCAMBIO DE PESTAÑAS SPA)
    const btnNavSearch = document.getElementById('btn-nav-search');
    const btnNavLibrary = document.getElementById('btn-nav-library');

    if (btnNavSearch && btnNavLibrary) {
        btnNavSearch.addEventListener('click', () => {
            btnNavLibrary.classList.remove('active');
            btnNavSearch.classList.add('active');
            cargarVistaBuscador();
        });

        btnNavLibrary.addEventListener('click', () => {
            btnNavSearch.classList.remove('active');
            btnNavLibrary.classList.add('active');
            cargarVistaBiblioteca();
        });
    }

    // SELECTOR DE MODO OSCURO / MODO CLARO cpn SVG
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const themeIconContainer = document.getElementById('theme-icon-container');
    const themeText = document.getElementById('theme-text');

    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            document.body.classList.toggle('theme-dark');
            
            if(document.body.classList.contains('theme-dark')) {
                // Modo Oscuro activo: Mostrar Luna
                themeIconContainer.innerHTML = `
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>`;
                themeText.textContent = "SWITCH_LIGHT_MODE";
            } else {
                // Modo Claro activo: Mostrar Sol
                themeIconContainer.innerHTML = `
                    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.22" x2="5.64" y2="17.78"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>`;
                themeText.textContent = "SWITCH_DARK_MODE";
            }
        });
    }

    // CIERRE DE SESIÓN SEGURO (LOGOUT)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Importamos dinámicamente o llamamos a la función de auth.js
            import('./JS/auth.js').then(modulo => {
                modulo.cerrarSesion(); // Borra las cookies y almacenamiento temporal
                
                // Regresa la interfaz al estado de Landing Page
                document.getElementById('app-layout').classList.add('hidden');
                document.getElementById('auth-section').classList.remove('hidden');
                document.getElementById('landing-hero').classList.remove('hidden');
                document.getElementById('login-container').classList.add('hidden');
                
                // Reseteamos la pestaña activa visualmente por defecto
                btnNavLibrary.classList.remove('active');
                btnNavSearch.classList.add('active');
            });
        });
    }

    // Al final de tu app.js
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SYSTEM_SW: Cache-Offline activo en el sector: ', reg.scope))
                .catch(err => console.error('SYSTEM_SW_ERROR: Enlace offline fallido: ', err));
        });
    }
}
// ======================================================================
// 3. FUNCIONES DE INTERCAMBIO DE VISTAS (SPA Lógica)
// ======================================================================

/**
 * Da acceso al sistema, oculta la sección Auth y muestra la interfaz musical[cite: 3].
 */
function mostrarDashboardPrincipal() {
    detenerEfectoMatrix(); // Detiene la animación de fondo de la Landing Page
    
    // Oculta toda la sección de Auth (Landing y Login)
    document.getElementById('auth-section').classList.add('hidden');
    
    // Muestra la maqueta principal (Sidebar, Main Content, Reproductor)
    document.getElementById('app-layout').classList.remove('hidden');

    const usuarioLogueado = localStorage.getItem('usuario_activo') || 'OPERATIVE_01';
    document.getElementById('display-username').textContent = usuarioLogueado;

    cargarVistaBuscador();   
    inicializarReproductor();
}

/**
 * Limpia el contenedor central y clona la plantilla del Buscador[cite: 2]
 */
function cargarVistaBuscador() {
    const contenedor = document.getElementById('main-content');
    const plantilla = document.getElementById('temp-buscador');
    
    contenedor.innerHTML = ''; // Borra la pantalla anterior
    contenedor.appendChild(plantilla.content.cloneNode(true)); // Inserta la estructura limpia

    // ACTIVACIÓN DE LOGICA DEEZER
    renderBuscador();
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

    matrixIntervalId = setInterval(draw, 30);
    
    // Ajustar el canvas dinámicamente si cambian el tamaño de la ventana
    window.addEventListener('resize', () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    });
}

function detenerEfectoMatrix() {
    if (matrixIntervalId) {
        clearInterval(matrixIntervalId); // Apaga el temporizador de la animación
        matrixIntervalId = null;
    }
    
    const canvas = document.getElementById("matrix-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Borra el último fotograma
    }
}