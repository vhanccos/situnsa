/**
 * ==============================================================
 * FASE 14 - REPOSITORIES DIRECTOS DE AUTENTICACION
 * AUTENTICACION + USUARIOS + INVITADOS + ROLES + SESIONES
 * ==============================================================
 * Ya no depende de validarLogin(), obtenerUsuarioAdminPorUsuario(),
 * obtenerInvitadoPorDni(), registrarInvitado() ni obtenerSheetInvitados().
 */

const AUTH_V14_CONFIG = Object.freeze({
  usuariosSpreadsheetId: '1jvpGNBTDyly02bgayT2SyrgSaLZrZxj3PH3PavGq6po',
  usuariosSheet: 'COMPAT_USUARIOS',
  invitadosSpreadsheetId: '1jvpGNBTDyly02bgayT2SyrgSaLZrZxj3PH3PavGq6po',
  invitadosSheet: 'COMPAT_INVITADOS'
});

const REPO_AuthUsuariosV6 = Object.freeze({

  appUrl() {
    return String(ScriptApp.getService().getUrl() || '')
      .trim()
      .replace(/^['"]+|['"]+$/g, '');
  },

  hojaUsuarios() {
    const ss = SpreadsheetApp.openById(AUTH_V14_CONFIG.usuariosSpreadsheetId);
    const sh = ss.getSheetByName(AUTH_V14_CONFIG.usuariosSheet);
    if (!sh) throw new Error('No existe la hoja USUARIOS.');
    return sh;
  },

  hojaInvitados() {
    const ss = SpreadsheetApp.openById(AUTH_V14_CONFIG.invitadosSpreadsheetId);
    const sh = ss.getSheetByName(AUTH_V14_CONFIG.invitadosSheet);
    if (!sh) throw new Error('No existe la hoja INVITADOS.');
    return sh;
  },

  autenticar(usuario, password) {
    usuario = String(usuario || '').trim();
    password = String(password || '').trim();

    if (!usuario || !password) {
      return { status:false, message:'Ingrese usuario y contraseña.' };
    }

    const admin = this.autenticarAdmin(usuario, password);
    if (admin && admin.status) return admin;

    const invitado = this.autenticarInvitado(usuario, password);
    if (invitado && invitado.status) return invitado;

    if (invitado && invitado.bloqueado) {
      return { status:false, message:invitado.message || 'El acceso del usuario se encuentra inactivo.' };
    }

    return { status:false, message:'Usuario o contraseña incorrectos' };
  },

  autenticarAdmin(usuario, password) {
    const data = this.hojaUsuarios().getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      const user = String(data[i][1] || '').trim();
      const pass = String(data[i][2] || '').trim();
      if (user !== usuario || pass !== password) continue;

      const rol = String(data[i][4] || '').trim().toLowerCase() || 'admin';
      const pagina = rol === 'invitado' ? 'tramite' : 'dashboard';
      return {
        status:true,
        usuario:user,
        nombre:String(data[i][3] || '').trim(),
        rol:rol,
        correo:String(data[i][5] || '').trim().toLowerCase(),
        dni:user,
        expediente:'',
        programa:'',
        url:this.appUrl() + '?page=' + pagina
      };
    }
    return { status:false };
  },

  autenticarInvitado(usuario, password) {
    const data = this.hojaInvitados().getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      const dni = String(data[i][1] || '').trim();
      const cui = String(data[i][2] || '').trim();
      if (dni !== usuario || cui !== password) continue;

      const estado = String(data[i][7] || '').trim().toUpperCase();
      if (estado !== 'ACTIVO') {
        return { status:false, bloqueado:true, message:'El acceso del usuario se encuentra inactivo.' };
      }

      return {
        status:true,
        usuario:dni,
        dni:dni,
        nombre:String(data[i][3] || '').trim(),
        correo:String(data[i][4] || '').trim().toLowerCase(),
        rol:'invitado',
        expediente:String(data[i][5] || '').trim().toUpperCase(),
        programa:String(data[i][6] || '').trim(),
        url:this.appUrl() + '?page=tramite'
      };
    }
    return { status:false };
  },

  buscarAdmin(usuario) {
    usuario = String(usuario || '').trim();
    if (!usuario) return null;
    const data = this.hojaUsuarios().getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      const user = String(data[i][1] || '').trim();
      if (user !== usuario) continue;
      return {
        id:data[i][0] || '',
        usuario:user,
        nombre:String(data[i][3] || '').trim(),
        rol:String(data[i][4] || '').trim().toLowerCase(),
        correo:String(data[i][5] || '').trim().toLowerCase()
      };
    }
    return null;
  },

  buscarInvitado(dni) {
    dni = String(dni || '').trim();
    if (!dni) return null;
    const data = this.hojaInvitados().getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      const dniFila = String(data[i][1] || '').trim();
      if (dniFila !== dni) continue;
      return {
        id:data[i][0] || '', dni:dniFila, cui:data[i][2] || '',
        nombre:data[i][3] || '', correo:data[i][4] || '', expediente:data[i][5] || '',
        programa:data[i][6] || '', estado:data[i][7] || '', fecha:data[i][8] || '', fila:i + 1
      };
    }
    return null;
  },

  registrarInvitado(datos) {
    try {
      datos = datos || {};
      const invitado = {
        dni:String(datos.dni || '').trim(),
        cui:String(datos.cui || '').trim(),
        nombre:String(datos.nombre || '').trim(),
        correo:String(datos.correo || '').trim().toLowerCase(),
        expediente:String(datos.expediente || '').trim().toUpperCase(),
        programa:String(datos.programa || '').trim(),
        estado:String(datos.estado || 'ACTIVO').trim().toUpperCase()
      };

      if (!/^\d{8}$/.test(invitado.dni)) return {status:false,message:'El DNI del invitado debe tener 8 dígitos.'};
      if (!invitado.cui) return {status:false,message:'El invitado no tiene CUI.'};
      if (!invitado.nombre) return {status:false,message:'El invitado no tiene nombre.'};

      const sh = this.hojaInvitados();
      const data = sh.getDataRange().getValues();
      const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Lima', 'dd/MM/yyyy HH:mm:ss');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1] || '').trim() !== invitado.dni) continue;
        sh.getRange(i + 1, 2, 1, 8).setValues([[
          invitado.dni, invitado.cui, invitado.nombre, invitado.correo,
          invitado.expediente, invitado.programa, invitado.estado || 'ACTIVO', fecha
        ]]);
        return {status:true,actualizado:true,dni:invitado.dni,usuario:invitado.dni,expediente:invitado.expediente,message:'El invitado ya existía y fue actualizado.'};
      }

      const id = sh.getLastRow();
      sh.appendRow([id,invitado.dni,invitado.cui,invitado.nombre,invitado.correo,invitado.expediente,invitado.programa,invitado.estado || 'ACTIVO',fecha]);
      return {status:true,creado:true,dni:invitado.dni,usuario:invitado.dni,expediente:invitado.expediente,message:'Invitado registrado correctamente.'};
    } catch (e) {
      return {status:false,message:e.message || 'No se pudo registrar el invitado.'};
    }
  },

  cambiarEstadoInvitado(dni, estado) {
    try {
      dni = String(dni || '').trim();
      estado = String(estado || '').trim().toUpperCase();
      if (!dni) return {status:false,message:'No se recibió el DNI.'};
      if (!['ACTIVO','INACTIVO'].includes(estado)) return {status:false,message:'El estado debe ser ACTIVO o INACTIVO.'};
      const invitado = this.buscarInvitado(dni);
      if (!invitado) return {status:false,message:'No se encontró el invitado.'};
      const sh = this.hojaInvitados();
      sh.getRange(invitado.fila, 8).setValue(estado);
      sh.getRange(invitado.fila, 9).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Lima', 'dd/MM/yyyy HH:mm:ss'));
      return {status:true,dni:dni,estado:estado};
    } catch (e) {
      return {status:false,message:e.message || 'No se pudo actualizar el estado.'};
    }
  },

  invitadosPorExpediente(expediente) {
    expediente = String(expediente || '').trim().toUpperCase();
    if (!expediente) return [];
    return this.listarInvitados().filter(x => String(x.expediente || '').trim().toUpperCase() === expediente);
  },

  listarUsuariosAdministrativos() {
    const data = this.hojaUsuarios().getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    return data.slice(1).filter(r => String(r[1] || '').trim()).map(r => ({
      id:String(r[0] || '').trim(), usuario:String(r[1] || '').trim(), nombre:String(r[3] || '').trim(),
      rol:String(r[4] || '').trim().toLowerCase(), correo:String(r[5] || '').trim().toLowerCase()
    }));
  },

  listarInvitados() {
    const data = this.hojaInvitados().getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    return data.slice(1).filter(r => String(r[1] || '').trim()).map((r, idx) => ({
      id:String(r[0] || '').trim(), dni:String(r[1] || '').trim(), cui:String(r[2] || '').trim(),
      nombre:String(r[3] || '').trim(), correo:String(r[4] || '').trim().toLowerCase(),
      expediente:String(r[5] || '').trim().toUpperCase(), programa:String(r[6] || '').trim(),
      estado:String(r[7] || '').trim().toUpperCase(), fecha:String(r[8] || '').trim(), rol:'invitado', fila:idx + 2
    }));
  }
});

const REPO_SesionV6 = Object.freeze({
  prefijo: 'MVC_SOA_SESION_V6_',
  ttlSegundos: 21600,
  guardar(token, sesion) {
    CacheService.getScriptCache().put(this.prefijo + token, JSON.stringify(sesion || {}), this.ttlSegundos);
    return true;
  },
  obtener(token) {
    token = String(token || '').trim();
    if (!token) return null;
    const raw = CacheService.getScriptCache().get(this.prefijo + token);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },
  eliminar(token) {
    token = String(token || '').trim();
    if (!token) return false;
    CacheService.getScriptCache().remove(this.prefijo + token);
    return true;
  },
  renovar(token, sesion) { return this.guardar(token, sesion); }
});
