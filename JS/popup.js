// ======================================================================
// JS/popup.js - CONTROLADOR DEL MODAL DE AVISOS PROPIO
// ======================================================================

/**
 * Despliega el modal personalizado en pantalla con un mensaje temático.
 * @param {string} mensaje - Texto formateado para mostrar en la interfaz.
 */
export function mostrarCyberPopup(mensaje) {
    const overlay = document.getElementById('cyber-popup-overlay');
    const textContainer = document.getElementById('cyber-popup-text');
    const btnConfirm = document.getElementById('btn-cyber-popup-confirm');

    if (!overlay || !textContainer || !btnConfirm) return;

    // Inyectar el texto
    textContainer.innerHTML = mensaje;

    // Mostrar quitando la clase hidden
    overlay.classList.remove('hidden');

    // Escuchar el clic de confirmación del usuario para cerrarlo
    const cerrarModal = () => {
        overlay.classList.add('hidden');
        btnConfirm.removeEventListener('click', cerrarModal); // Limpieza de listener
    };

    btnConfirm.addEventListener('click', cerrarModal);
}

// Hacerlo accesible globalmente por si lo inyectamos en strings HTML (como los onclick)
window.lanzarCyberPopup = mostrarCyberPopup;