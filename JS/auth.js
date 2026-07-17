// ======================================================================
// JS/auth.js - MÓDULO DE AUTENTICACIÓN (Trabajo del Programador 1)
// ======================================================================

/**
 * Registra un nuevo operativo en el LocalStorage (Simulando la base de datos del servidor)
 */
export function registrarUsuario(usuario, password) {
    // Intentamos obtener los usuarios ya registrados, si no hay, creamos un arreglo vacío
    const usuariosRegistrados = JSON.parse(localStorage.getItem('usuarios_terminal')) || [];

    // Verificamos si el usuario ya existe para evitar duplicados
    const existe = usuariosRegistrados.find(u => u.usuario === usuario);
    if (existe) {
        return { exito: false, mensaje: "CRITICAL ERROR: USER_ALREADY_EXISTS" };
    }

    // Agregamos el nuevo usuario al arreglo
    usuariosRegistrados.push({ usuario, password });
    
    // Guardamos la lista actualizada en el LocalStorage
    localStorage.setItem('usuarios_terminal', JSON.stringify(usuariosRegistrados));

    return { exito: true, mensaje: "PROFILE INITIALIZED" };
}

/**
 * Valida las credenciales y crea una sesión activa (Usa Cookies o LocalStorage para el Token)
 */
export function iniciarSesion(usuario, password) {
    const usuariosRegistrados = JSON.parse(localStorage.getItem('usuarios_terminal')) || [];

    // Buscamos si el usuario existe y si la contraseña coincide
    const cuentaValida = usuariosRegistrados.find(u => u.usuario === usuario && u.password === password);

    if (!cuentaValida) {
        return { exito: false, mensaje: "ACCESS DENIED: INVALID_CREDENTIALS" };
    }

    // REQUERIMIENTO: Crear un indicador/token de sesión activa
    // En lugar de LocalStorage, usaremos una Cookie para cumplir estrictamente con persistencia avanzada.
    // Esta cookie expirará en 1 día.
    const expires = new Date(Date.now() + 86400000).toUTCString();
    document.cookie = `session_token=TOKEN_SECURE_2026_${usuario}; expires=${expires}; path=/; SameSite=Strict`;
    
    // Guardamos también el nombre del usuario activo para el Sidebar
    localStorage.setItem('usuario_activo', usuario);

    return { exito: true, mensaje: "ACCESS GRANTED" };
}

/**
 * Comprueba si la cookie de sesión existe para mantener al usuario adentro si refresca la página
 */
export function comprobarEstadoSesion() {
    // Buscamos la cookie 'session_token'
    const tieneCookie = document.cookie.split('; ').find(row => row.startsWith('session_token='));
    
    // Retorna true si la cookie existe, false si no
    return !!tieneCookie; 
}

/**
 * Borra los rastro de sesión (Logout seguro requerdido por la pauta)
 */
export function cerrarSesion() {
    // Borramos la cookie haciendo que expire en el pasado
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Limpiamos los datos del usuario activo
    localStorage.removeItem('usuario_activo');
}