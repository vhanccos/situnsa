/**
 * ==============================================================
 * DOMINIO - EXPEDIENTE
 * FASE 2 MVC + SOA
 * ==============================================================
 * Reglas puras del negocio. No accede a Sheets, Drive ni HTML.
 */

const DOMAIN_Expediente = Object.freeze({
  normalizarParticipante(participante) {
    participante = participante || {};
    return {
      nombre: String(participante.nombre || '').trim(),
      dni: String(participante.dni || '').trim(),
      programa: String(participante.programa || '').trim(),
      correo: String(participante.correo || '').trim(),
      cui: String(participante.cui || '').trim(),
      telefono: String(participante.telefono || '').trim(),
      nacionalidad: String(participante.nacionalidad || '').trim(),
      ciudad: String(participante.ciudad || '').trim(),
      direccion: String(participante.direccion || '').trim()
    };
  },

  prepararSolicitud(datos) {
    datos = datos || {};
    const participantes = Array.isArray(datos.participantes)
      ? datos.participantes.map(p => DOMAIN_Expediente.normalizarParticipante(p))
      : [];
    const grupo = Number(datos.grupo || participantes.length);
    return {
      grupo: grupo,
      admin: String(datos.admin || '').trim(),
      correo_admin: String(datos.correo_admin || '').trim(),
      tesis: String(datos.tesis || '').trim(),
      participantes: participantes
    };
  },

  validarSolicitud(solicitud, dnisRegistrados) {
    if (!solicitud.participantes.length) {
      throw new Error('No se recibieron participantes.');
    }
    if (solicitud.grupo !== 1 && solicitud.grupo !== 2) {
      throw new Error('El grupo debe ser 1 o 2.');
    }
    if (solicitud.participantes.length !== solicitud.grupo) {
      throw new Error('La cantidad de participantes no coincide con el grupo.');
    }

    const vistos = {};
    const registrados = dnisRegistrados || {};
    solicitud.participantes.forEach((p, index) => {
      if (!/^\d{8}$/.test(p.dni)) {
        throw new Error('El DNI del participante ' + (index + 1) + ' debe tener 8 dígitos.');
      }
      if (registrados[p.dni] || vistos[p.dni]) {
        throw new Error('El DNI ' + p.dni + ' ya existe o está repetido.');
      }
      vistos[p.dni] = true;
      if (!p.nombre || !p.programa || p.programa.toUpperCase() === 'SELECCIONE') {
        throw new Error('Complete nombres y programa del participante ' + (index + 1) + '.');
      }
    });
    return true;
  },

  titulo(texto) {
    texto = String(texto || '').trim().toLowerCase();
    return texto.replace(/\b\w/g, letra => letra.toUpperCase());
  },

  programa(texto) {
    texto = String(texto || '').trim().toLowerCase();
    const excepciones = ['de','del','la','las','los','y','en','e'];
    return texto.split(/\s+/).map((palabra,index) => {
      if (index !== 0 && excepciones.indexOf(palabra) !== -1) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    }).join(' ');
  }
});
