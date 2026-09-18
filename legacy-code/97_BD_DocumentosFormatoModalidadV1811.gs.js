/**
 * BD-18.11
 * - Evita duplicados visuales por nombre en documentos de etapa.
 * - Diagnostica y permite limpiar duplicados físicos exactos por nombre.
 * - ASESOR en CARÁTULA: formato profesional (Mg., Dr., Ing., etc.).
 * - Campos administrativos en mayúscula excepto TESIS, que conserva escritura exacta.
 * - MODALIDAD FINAL automática desde MODALIDAD.
 */

const BD1811_CONFIG = Object.freeze({
  fase:'BD-18.11',
  version:'db-18.11-documentos-formato-modalidad'
});

function BD1811_txt_(v){ return String(v==null?'':v).trim(); }

function BD1811_claveNombreDocumento_(nombre){
  return BD1811_txt_(nombre)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .toUpperCase();
}

function BD1811_cap_(s){
  s=BD1811_txt_(s).toLocaleLowerCase('es');
  return s ? s.charAt(0).toLocaleUpperCase('es') + s.slice(1) : '';
}

function BD1811_nombreProfesionalCaratula_(valor){
  var t=BD1811_txt_(valor).replace(/\s+/g,' ');
  if(!t)return '';

  var partes=t.split(' ');
  var mapa={
    'DR.':'Dr.','DR':'Dr.','DRA.':'Dra.','DRA':'Dra.',
    'MG.':'Mg.','MG':'Mg.','MAG.':'Mag.','MAG':'Mag.',
    'ING.':'Ing.','ING':'Ing.',
    'MSC.':'MSc.','MSC':'MSc.',
    'PHD.':'PhD.','PHD':'PhD.'
  };

  return partes.map(function(p){
    var k=p.toUpperCase();
    if(mapa[k])return mapa[k];

    // Conserva conectores usuales en minúscula.
    var low=p.toLocaleLowerCase('es');
    if(['de','del','la','las','los','y','e'].indexOf(low)>=0)return low;

    return BD1811_cap_(p);
  }).join(' ');
}

function BD1811_modalidadFinal_(modalidad){
  var m=BD1811_txt_(modalidad)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase();

  if(m==='PLAN DE TESIS') return 'La Tesis';
  if(m==='PLAN DE TRABAJO ACADEMICO') return 'El Trabajo Académico';
  if(m==='PLAN DE TESIS FORMATO ARTICULO') return 'La Tesis Formato Artículo';
  return '';
}

function BD1811_mayus_(v){ return BD1811_txt_(v).toLocaleUpperCase('es'); }

/*
 * Wrapper seguro sobre la actualización relacional.
 * TESIS/TESIS02 se conservan exactamente como se escribieron.
 * Los demás campos textuales administrativos se normalizan a MAYÚSCULAS.
 */
function BD1811_normalizarDatosAdmin_(datos){
  datos=Object.assign({},datos||{});

  /*
    BD-18.15:
    TESIS y los campos de modalidad conservan EXACTAMENTE
    el texto seleccionado/escrito. No se convierten a mayúsculas.
  */
  var libres={
    tesis:true,
    tesis02:true,
    modalidad:true,
    modalidad02:true,
    modalidadFinal:true
  };

  var tecnicos={
    expediente:true,grupo:true,dni:true,dni02:true,cui:true,cui02:true,
    correo:true,correo02:true,fechaApertura:true,fechaPresentacion:true,
    fechaActa:true,horaActa:true
  };

  Object.keys(datos).forEach(function(k){
    if(libres[k] || tecnicos[k])return;
    if(typeof datos[k]==='string'){
      datos[k]=BD1811_mayus_(datos[k]);
    }
  });

  /*
    MODALIDAD VIRTUAL ya llega desde su propio ComboBox.
    No la recalculamos ni cambiamos su capitalización.
  */
  return datos;
}

/*
 * Vista previa de archivos duplicados por nombre en ETAPA01/ETAPA02.
 * NO modifica Drive.
 */
function BD1811_PREVISUALIZAR_DUPLICADOS_DOCUMENTOS(expediente){
  expediente=resolverExpedienteDocumentos(expediente);
  if(!expediente)throw new Error('Expediente inválido.');

  var carpetaExp=buscarCarpetaExpediente(expediente);
  if(!carpetaExp)throw new Error('No se encontró la carpeta '+expediente+'.');

  var salida=[];
  [1,2].forEach(function(etapa){
    var c=DE_obtenerCarpetaEtapa_(carpetaExp,etapa);
    if(!c)return;

    var docs=DE_listarDocumentosCarpetaSinDeduplicarV1811_(c);
    var grupos={};
    docs.forEach(function(d){
      var k=BD1811_claveNombreDocumento_(d.nombre);
      (grupos[k]||(grupos[k]=[])).push(d);
    });

    Object.keys(grupos).forEach(function(k){
      if(grupos[k].length>1){
        salida.push({
          etapa:etapa,
          nombre:grupos[k][0].nombre,
          cantidad:grupos[k].length,
          ids:grupos[k].map(function(x){return x.id;})
        });
      }
    });
  });

  var out={status:true,fase:BD1811_CONFIG.fase,expediente:expediente,duplicados:salida,totalGruposDuplicados:salida.length,modificaDrive:false};
  Logger.log(JSON.stringify(out,null,2));
  return out;
}

function DE_listarDocumentosCarpetaSinDeduplicarV1811_(carpeta){
  var docs=[];
  DE_recorrerCarpetaDocumentos_(carpeta,docs);
  return docs;
}

/*
 * Limpieza opcional: manda a papelera las copias adicionales con el MISMO
 * nombre normalizado dentro de una etapa y conserva el archivo más antiguo.
 * Ejecutar SOLO después de revisar la previsualización.
 */
function BD1811_LIMPIAR_DUPLICADOS_DOCUMENTOS(expediente){
  expediente=resolverExpedienteDocumentos(expediente);
  if(!expediente)throw new Error('Expediente inválido.');

  var carpetaExp=buscarCarpetaExpediente(expediente);
  if(!carpetaExp)throw new Error('No se encontró la carpeta '+expediente+'.');

  var eliminados=[];
  [1,2].forEach(function(etapa){
    var c=DE_obtenerCarpetaEtapa_(carpetaExp,etapa);
    if(!c)return;
    var docs=DE_listarDocumentosCarpetaSinDeduplicarV1811_(c), grupos={};
    docs.forEach(function(d){
      var k=BD1811_claveNombreDocumento_(d.nombre);
      (grupos[k]||(grupos[k]=[])).push(d);
    });
    Object.keys(grupos).forEach(function(k){
      var g=grupos[k];
      if(g.length<2)return;
      g.sort(function(a,b){
        return DriveApp.getFileById(a.id).getDateCreated().getTime() -
               DriveApp.getFileById(b.id).getDateCreated().getTime();
      });
      for(var i=1;i<g.length;i++){
        DriveApp.getFileById(g[i].id).setTrashed(true);
        eliminados.push({etapa:etapa,nombre:g[i].nombre,id:g[i].id});
      }
    });
  });

  return {status:true,fase:BD1811_CONFIG.fase,expediente:expediente,eliminados:eliminados,totalEliminados:eliminados.length};
}

function BD1811_PROBAR_DIAGNOSTICO(){
  var out={
    status:true,
    fase:BD1811_CONFIG.fase,
    version:BD1811_CONFIG.version,
    asesor1:BD1811_nombreProfesionalCaratula_('MG. CANAZAS MEJIA MAMANI'),
    asesor2:BD1811_nombreProfesionalCaratula_('DR. SERGIO TORRES MAMANI'),
    modalidadTesis:BD1811_modalidadFinal_('Plan de Tesis'),
    modalidadTrabajo:BD1811_modalidadFinal_('Plan de Trabajo Académico'),
    modalidadArticulo:BD1811_modalidadFinal_('Plan de Tesis Formato Artículo')
  };
  Logger.log(JSON.stringify(out,null,2));
  return out;
}
