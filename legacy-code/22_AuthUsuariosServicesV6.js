/**
 * ==============================================================
 * FASE 6 - SERVICIOS SOA
 * AUTENTICACION + USUARIOS + ROLES + SESIONES/PERMISOS
 * ==============================================================
 */

const SOA_RolesV6Service = Object.freeze({

  normalizar(rol) {
    const r = String(rol || '').trim().toLowerCase();
    if (!r) return 'invitado';
    if (['admin', 'administrador', 'administrator'].includes(r)) return 'admin';
    if (['invitado', 'alumno', 'estudiante'].includes(r)) return 'invitado';
    if (['asesor', 'docente'].includes(r)) return 'asesor';
    if (['supervisor', 'jefe'].includes(r)) return 'supervisor';
    return r;
  },

  permisosPorRol(rol) {
    const r = this.normalizar(rol);

    const mapa = {
      admin: ['*'],
      supervisor: [
        'dashboard.ver', 'expediente.ver', 'expediente.editar',
        'seguimiento.ver', 'seguimiento.editar', 'historial.ver',
        'documentos.ver', 'taller.ver', 'reportes.ver'
      ],
      asesor: [
        'asesor.portal', 'taller.ver', 'taller.asistencia',
        'documentos.ver', 'documentos.revisar', 'seguimiento.ver'
      ],
      invitado: [
        'portal.ver', 'seguimiento.propio', 'documentos.propios',
        'historial.propio'
      ]
    };

    return mapa[r] || ['dashboard.ver'];
  },

  tienePermiso(rol, permiso) {
    permiso = String(permiso || '').trim();
    if (!permiso) return false;
    const permisos = this.permisosPorRol(rol);
    return permisos.includes('*') || permisos.includes(permiso);
  }
});


const SOA_SesionV6Service = Object.freeze({

  crear(usuarioAutenticado) {
    const u = usuarioAutenticado || {};
    const rol = SOA_RolesV6Service.normalizar(u.rol);
    const token = Utilities.getUuid() + '-' + Utilities.getUuid();
    const ahora = new Date();

    const sesion = {
      version: 6,
      token: token,
      usuario: String(u.usuario || u.dni || '').trim(),
      dni: String(u.dni || u.usuario || '').trim(),
      nombre: String(u.nombre || '').trim(),
      correo: String(u.correo || '').trim().toLowerCase(),
      rol: rol,
      expediente: String(u.expediente || '').trim().toUpperCase(),
      programa: String(u.programa || '').trim(),
      permisos: SOA_RolesV6Service.permisosPorRol(rol),
      creadaEn: ahora.toISOString(),
      expiraEn: new Date(ahora.getTime() + 21600 * 1000).toISOString()
    };

    REPO_SesionV6.guardar(token, sesion);
    return sesion;
  },

  obtener(token) {
    const sesion = REPO_SesionV6.obtener(token);
    if (!sesion) {
      return {
        status: false,
        valida: false,
        message: 'La sesión no existe o ha expirado.'
      };
    }

    return {
      status: true,
      valida: true,
      sesion: sesion
    };
  },

  cerrar(token) {
    REPO_SesionV6.eliminar(token);
    return {
      status: true,
      message: 'Sesión cerrada correctamente.'
    };
  },

  autorizar(token, permiso) {
    const r = this.obtener(token);
    if (!r.status) return r;

    const permitido = SOA_RolesV6Service.tienePermiso(
      r.sesion.rol,
      permiso
    );

    return {
      status: permitido,
      autorizado: permitido,
      rol: r.sesion.rol,
      permiso: permiso,
      message: permitido
        ? 'Acceso autorizado.'
        : 'El usuario no tiene permiso para esta operación.'
    };
  }
});


const SOA_AuthUsuariosV6Service = Object.freeze({

  login(usuario, password) {
    try {
      const auth = (typeof BD13_AUTENTICAR_SEGUN_MODO === 'function' ? BD13_AUTENTICAR_SEGUN_MODO(usuario, password) : REPO_AuthUsuariosV6.autenticar(usuario, password)) || {};

      if (!auth.status) {
        return {
          status: false,
          message: auth.message || 'Usuario o contraseña incorrectos.'
        };
      }

      const sesion = SOA_SesionV6Service.crear(auth);

      return Object.assign({}, auth, {
        status: true,
        rol: sesion.rol,
        token: sesion.token,
        permisos: sesion.permisos,
        sesionExpiraEn: sesion.expiraEn,
        arquitectura: 'MVC + SOA',
        fase: 6
      });

    } catch (e) {
      return {
        status: false,
        message: e && e.message
          ? e.message
          : 'No se pudo iniciar sesión.'
      };
    }
  },

  perfil(usuario, rol) {
    try {
      const r = SOA_RolesV6Service.normalizar(rol);
      const data = (typeof BD16_activo_ === 'function' && BD16_activo_())
        ? BD16_PERFIL_RELACIONAL(usuario, r)
        : (r === 'invitado' ? REPO_AuthUsuariosV6.buscarInvitado(usuario) : REPO_AuthUsuariosV6.buscarAdmin(usuario));

      return {
        status: !!data,
        perfil: data || null,
        rol: r,
        permisos: SOA_RolesV6Service.permisosPorRol(r),
        message: data ? 'Perfil encontrado.' : 'No se encontró el usuario.'
      };
    } catch (e) {
      return { status: false, message: e.message || String(e) };
    }
  },

  listarUsuariosAdministrativos() {
    try {
      return {
        status: true,
        usuarios: (typeof BD16_activo_ === 'function' && BD16_activo_()) ? BD16_LISTAR_USUARIOS_RELACIONALES().filter(function(u){return SOA_RolesV6Service.normalizar(u.ROL)!=='invitado';}) : REPO_AuthUsuariosV6.listarUsuariosAdministrativos()
      };
    } catch (e) {
      return { status: false, usuarios: [], message: e.message || String(e) };
    }
  },

  listarInvitados() {
    try {
      return {
        status: true,
        invitados: (typeof BD16_activo_ === 'function' && BD16_activo_()) ? BD16_LISTAR_USUARIOS_RELACIONALES('invitado') : REPO_AuthUsuariosV6.listarInvitados()
      };
    } catch (e) {
      return { status: false, invitados: [], message: e.message || String(e) };
    }
  },

  registrarInvitado(datos) {
    try {
      return REPO_AuthUsuariosV6.registrarInvitado(datos);
    } catch (e) {
      return { status: false, message: e.message || String(e) };
    }
  },

  cambiarEstadoInvitado(dni, estado) {
    try {
      return REPO_AuthUsuariosV6.cambiarEstadoInvitado(dni, estado);
    } catch (e) {
      return { status: false, message: e.message || String(e) };
    }
  }
});

