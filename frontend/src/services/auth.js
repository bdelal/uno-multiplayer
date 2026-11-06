/**
 * Baut die HTTP Header für authentifizierte Requests ans Backend
 * Liest den Token aus sessionStorage und packt ihn als Bearer Token in 
 * den Auth. Header, damit man das nicht in jeder Vue Datei einzeln schreiben muss
 * 
 * @returns Header Objekt, in dem Authorization Wert mit Content Type steckt
 */
export function authHeaders() {
  const token = sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}