/**
 * ==============================================================
 * INFRAESTRUCTURA
 * ==============================================================
 * Punto central para servicios tecnicos. Los modulos nuevos deben
 * usar esta capa en lugar de dispersar dependencias de plataforma.
 */
const INFRA = Object.freeze({
  spreadsheet(id) {
    return SpreadsheetApp.openById(id);
  },
  folder(id) {
    return DriveApp.getFolderById(id);
  },
  cache() {
    return CacheService.getScriptCache();
  },
  lock() {
    return LockService.getScriptLock();
  },
  properties() {
    return PropertiesService.getScriptProperties();
  },
  appUrl() {
    return String(ScriptApp.getService().getUrl() || '').trim();
  }
});
