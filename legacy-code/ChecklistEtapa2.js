/* =========================================================
   CHECKLIST ETAPA 02 - SISTEMA DE TITULACIÓN USE FIPS
   Archivo consolidado V27 + V28
   Mantiene los nombres de funciones usados por Dashboard.
========================================================= */

const CHECKLIST_ETAPA2_V27 = [
  'Anexo 8 formato de Culminación del Asesoría',
  'Anexo 27 Solicitud de titulación',
  'Anexo 2 declaración jurada de antecedentes',
  'Anexo 32 Declaración jurada de veracidad de la información',
  'Recibos de pago derecho de titulación',
  'Anexo 1',
  'Libreta de notas',
  'Certificado de estudios',
  'Constancia de primera matrícula',
  'Constancia de Egresado',
  'Constancia de no adeudar bienes y servicios (pensiones)',
  'Constancia de no adeudar libros a biblioteca',
  'Fotografía en formato JPG'
];

function obtenerSheetChecklistEtapa2V27() {
  const ss = obtenerSSSeguimientoSubetapas();
  let sh = ss.getSheetByName('CHECKLIST_ETAPA2');

  if (!sh) {
    sh = ss.insertSheet('CHECKLIST_ETAPA2');
    sh.getRange(1, 1, 1, 12).setValues([[
      'ID',
      'EXPEDIENTE',
      'NUMERO',
      'REQUISITO',
      'MARCADO',
      'ARCHIVO_ID',
      'ARCHIVO_NOMBRE',
      'ARCHIVO_URL',
      'MIME_TYPE',
      'USUARIO',
      'CORREO',
      'ULTIMA_ACTUALIZACION'
    ]]);
    sh.setFrozenRows(1);
  }

  return sh;
}

function asegurarChecklistEtapa2V27(expediente) {
  expediente = String(expediente || '').trim().toUpperCase();

  if (!expediente) {
    throw new Error('No se recibió el expediente.');
  }

  const sh = obtenerSheetChecklistEtapa2V27();
  const lr = sh.getLastRow();
  const data = lr > 1
    ? sh.getRange(2, 1, lr - 1, 12).getValues()
    : [];

  const existentes = {};
  let maxId = 0;

  data.forEach(function(r) {
    maxId = Math.max(maxId, Number(r[0] || 0));

    if (String(r[1] || '').trim().toUpperCase() === expediente) {
      existentes[Number(r[2] || 0)] = true;
    }
  });

  const nuevas = [];

  CHECKLIST_ETAPA2_V27.forEach(function(nombre, index) {
    const numero = index + 1;

    if (!existentes[numero]) {
      nuevas.push([
        ++maxId,
        expediente,
        numero,
        nombre,
        'NO',
        '',
        '',
        '',
        '',
        '',
        '',
        new Date()
      ]);
    }
  });

  if (nuevas.length) {
    sh.getRange(
      sh.getLastRow() + 1,
      1,
      nuevas.length,
      12
    ).setValues(nuevas);
  }

  return sh;
}

function obtenerChecklistEtapa2V27(expediente) {
  try {
    expediente = String(expediente || '').trim().toUpperCase();

    const sh = asegurarChecklistEtapa2V27(expediente);
    const lr = sh.getLastRow();
    const data = lr > 1
      ? sh.getRange(2, 1, lr - 1, 12).getValues()
      : [];

    const requisitos = [];

    data.forEach(function(r) {
      if (String(r[1] || '').trim().toUpperCase() !== expediente) return;

      requisitos.push({
        id: r[0] || '',
        numero: Number(r[2] || 0),
        nombre: r[3] || '',
        marcado: String(r[4] || '').trim().toUpperCase() === 'SI',
        archivo: {
          id: r[5] || '',
          nombre: r[6] || '',
          url: r[7] || '',
          mimeType: r[8] || ''
        },
        usuario: r[9] || '',
        correo: r[10] || '',
        actualizado: formatearFechaSubetapa(r[11])
      });
    });

    requisitos.sort(function(a, b) {
      return a.numero - b.numero;
    });

    const marcados = requisitos.filter(function(r) {
      return r.marcado;
    }).length;

    const total = requisitos.length;

    return {
      status: true,
      expediente: expediente,
      completo: total === 13 && marcados === total,
      porcentaje: total ? Math.round(marcados * 100 / total) : 0,
      marcados: marcados,
      total: total,
      requisitos: requisitos
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || String(error)
    };
  }
}

function guardarCheckEtapa2V27(
  expediente,
  numero,
  marcado,
  usuario,
  correo
) {
  try {
    expediente = String(expediente || '').trim().toUpperCase();
    numero = Number(numero);

    const sh = asegurarChecklistEtapa2V27(expediente);
    const lr = sh.getLastRow();
    const data = lr > 1
      ? sh.getRange(2, 1, lr - 1, 12).getValues()
      : [];

    for (let i = 0; i < data.length; i++) {
      if (
        String(data[i][1] || '').trim().toUpperCase() === expediente &&
        Number(data[i][2]) === numero
      ) {
        sh.getRange(i + 2, 5).setValue(marcado ? 'SI' : 'NO');
        sh.getRange(i + 2, 10, 1, 3).setValues([[
          usuario || '',
          correo || '',
          new Date()
        ]]);

        return obtenerChecklistEtapa2V27(expediente);
      }
    }

    return {
      status: false,
      message: 'No se encontró el requisito.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || String(error)
    };
  }
}

/* =========================================================
   CARPETA DOCUMENTOS DEL EXPEDIENTE
========================================================= */

function obtenerCarpetaChecklistEtapa2V27(expediente) {
  expediente = String(expediente || '').trim().toUpperCase();

  if (!expediente) {
    throw new Error('No se recibió el expediente.');
  }

  /*
    V28: los archivos del checklist se guardan en DOCUMENTOS
    dentro de la carpeta oficial del expediente.
  */
  if (typeof obtenerCarpetaDocumentosExpedienteV22 === 'function') {
    return obtenerCarpetaDocumentosExpedienteV22(expediente, true);
  }

  if (typeof obtenerCarpetaExpedienteV22 === 'function') {
    const carpetaExpediente = obtenerCarpetaExpedienteV22(expediente);
    const carpetas = carpetaExpediente.getFoldersByName('DOCUMENTOS');

    if (carpetas.hasNext()) {
      return carpetas.next();
    }

    return carpetaExpediente.createFolder('DOCUMENTOS');
  }

  /*
    Fallback seguro usando la raíz oficial del sistema.
  */
  const raiz = DriveApp.getFolderById(
    '1E8--FuQQHPLTwv5v2Wmp7NR5nNKb3CGR'
  );

  const expedientes = raiz.getFoldersByName(expediente);

  if (!expedientes.hasNext()) {
    throw new Error(
      'No se encontró la carpeta oficial del expediente ' + expediente + '.'
    );
  }

  const carpetaExpediente = expedientes.next();
  const documentos = carpetaExpediente.getFoldersByName('DOCUMENTOS');

  if (documentos.hasNext()) {
    return documentos.next();
  }

  return carpetaExpediente.createFolder('DOCUMENTOS');
}

/* =========================================================
   SUBIR DOCUMENTO
========================================================= */

function subirDocumentoChecklistEtapa2V27(datos) {
  try {
    datos = datos || {};

    const expediente = String(datos.expediente || '').trim().toUpperCase();
    const numero = Number(datos.numero);

    if (!expediente || !numero) {
      return {
        status: false,
        message: 'Faltan datos del requisito.'
      };
    }

    if (!datos.base64) {
      return {
        status: false,
        message: 'No se recibió el archivo.'
      };
    }

    const nombre = String(
      datos.nombre || ('requisito_' + numero)
    ).trim();

    const mime = String(
      datos.mimeType || 'application/octet-stream'
    );

    const bytes = Utilities.base64Decode(datos.base64);

    if (bytes.length > 10 * 1024 * 1024) {
      return {
        status: false,
        message: 'El archivo supera el máximo de 10 MB.'
      };
    }

    const carpeta = obtenerCarpetaChecklistEtapa2V27(expediente);
    const sh = asegurarChecklistEtapa2V27(expediente);
    const data = sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      12
    ).getValues();

    for (let i = 0; i < data.length; i++) {
      if (
        String(data[i][1] || '').trim().toUpperCase() !== expediente ||
        Number(data[i][2]) !== numero
      ) {
        continue;
      }

      const anterior = String(data[i][5] || '').trim();

      /*
        Primero crea el nuevo archivo. Solo después manda
        el anterior a la papelera para no perderlo si falla la carga.
      */
      const archivo = carpeta.createFile(
        Utilities.newBlob(bytes, mime, nombre)
      );

      if (anterior) {
        try {
          DriveApp.getFileById(anterior).setTrashed(true);
        } catch (e) {
          Logger.log(
            'No se pudo enviar el archivo anterior a papelera: ' +
            e.message
          );
        }
      }

      sh.getRange(i + 2, 6, 1, 7).setValues([[
        archivo.getId(),
        archivo.getName(),
        archivo.getUrl(),
        archivo.getMimeType(),
        datos.usuario || '',
        datos.correo || '',
        new Date()
      ]]);

      return obtenerChecklistEtapa2V27(expediente);
    }

    return {
      status: false,
      message: 'No se encontró el requisito.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || String(error)
    };
  }
}

/* =========================================================
   ELIMINAR DOCUMENTO
========================================================= */

function eliminarDocumentoChecklistEtapa2V27(
  expediente,
  numero
) {
  try {
    expediente = String(expediente || '').trim().toUpperCase();
    numero = Number(numero);

    const sh = asegurarChecklistEtapa2V27(expediente);
    const data = sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      12
    ).getValues();

    for (let i = 0; i < data.length; i++) {
      if (
        String(data[i][1] || '').trim().toUpperCase() !== expediente ||
        Number(data[i][2]) !== numero
      ) {
        continue;
      }

      const id = String(data[i][5] || '').trim();

      if (id) {
        try {
          DriveApp.getFileById(id).setTrashed(true);
        } catch (e) {
          Logger.log(
            'No se pudo enviar el documento a papelera: ' +
            e.message
          );
        }
      }

      /*
        ARCHIVO_ID, ARCHIVO_NOMBRE, ARCHIVO_URL, MIME_TYPE
      */
      sh.getRange(i + 2, 6, 1, 4).clearContent();

      sh.getRange(i + 2, 10, 1, 3).setValues([[
        data[i][9] || '',
        data[i][10] || '',
        new Date()
      ]]);

      return obtenerChecklistEtapa2V27(expediente);
    }

    return {
      status: false,
      message: 'No se encontró el requisito.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || String(error)
    };
  }
}

/* =========================================================
   RENOMBRAR DOCUMENTO - V28
========================================================= */

function renombrarDocumentoChecklistEtapa2V28(
  expediente,
  numero,
  nuevoNombre
) {
  try {
    expediente = String(expediente || '').trim().toUpperCase();
    numero = Number(numero);
    nuevoNombre = String(nuevoNombre || '').trim();

    if (!expediente || !numero || !nuevoNombre) {
      return {
        status: false,
        message: 'Faltan datos para renombrar el documento.'
      };
    }

    const sh = asegurarChecklistEtapa2V27(expediente);
    const data = sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      12
    ).getValues();

    for (let i = 0; i < data.length; i++) {
      if (
        String(data[i][1] || '').trim().toUpperCase() !== expediente ||
        Number(data[i][2]) !== numero
      ) {
        continue;
      }

      const fileId = String(data[i][5] || '').trim();

      if (!fileId) {
        return {
          status: false,
          message: 'Este requisito todavía no tiene documento adjunto.'
        };
      }

      const file = DriveApp.getFileById(fileId);
      const actual = file.getName();
      const match = actual.match(/(\.[^.]+)$/);
      const extension = match ? match[1] : '';

      /*
        Si el usuario no escribió extensión,
        conserva la extensión original.
      */
      if (
        extension &&
        !/\.[a-z0-9]{2,6}$/i.test(nuevoNombre)
      ) {
        nuevoNombre += extension;
      }

      const carpeta = obtenerCarpetaChecklistEtapa2V27(expediente);

      if (
        typeof archivoPerteneceACarpetaV22 === 'function' &&
        !archivoPerteneceACarpetaV22(
          fileId,
          carpeta.getId()
        )
      ) {
        return {
          status: false,
          message:
            'El archivo no pertenece a la carpeta DOCUMENTOS de este expediente.'
        };
      }

      file.setName(nuevoNombre);

      sh.getRange(i + 2, 7).setValue(file.getName());
      sh.getRange(i + 2, 12).setValue(new Date());

      return obtenerChecklistEtapa2V27(expediente);
    }

    return {
      status: false,
      message: 'No se encontró el requisito.'
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || String(error)
    };
  }
}

/* =========================================================
   VALIDAR ANTES DE FINALIZAR SUBETAPA
========================================================= */

function validarChecklistCompletoEtapa2V27(expediente) {
  const r = obtenerChecklistEtapa2V27(expediente);

  if (!r || !r.status) {
    return {
      status: false,
      completo: false,
      message:
        r && r.message
          ? r.message
          : 'No se pudo validar el checklist.'
    };
  }

  if (!r.completo) {
    return {
      status: true,
      completo: false,
      message:
        'Debe marcar los 13 requisitos antes de finalizar la subetapa.',
      marcados: r.marcados || 0,
      total: r.total || 13
    };
  }

  return {
    status: true,
    completo: true,
    marcados: r.marcados,
    total: r.total
  };
}
