// Turns a raw database error into a plain-language cause. Never returns the connection string, password or host.
function diagnoseDbError(err) {
  const msg = String((err && (err.message || err.code)) || '');
  const low = msg.toLowerCase();
  if (/not set/.test(low)) return { code: 'ENV_MISSING', hint: 'MONGODB_URI ya MONGODB_DB_NAME Netlify mein nahi mila. Naam bilkul yehi hon aur save ke baad dobara deploy karein.' };
  if (/authentication failed|bad auth|auth failed|not authorized/.test(low)) return { code: 'DB_AUTH', hint: 'Username ya password galat hai. Atlas mein password dobara set karein aur MONGODB_URI mein wahi daalein.' };
  if (/invalid scheme|invalid connection string|must be of the form|uri must|invalid namespace|illegal character|percent|invalid.*url/.test(low)) return { code: 'URI_FORMAT', hint: 'MONGODB_URI ki shakal galat hai. mongodb+srv:// se shuru honi chahiye, <db_password> badla hona chahiye, password mein @ : / # ? nahi hone chahiye.' };
  if (/enotfound|querysrv|getaddrinfo|dns/.test(low)) return { code: 'DNS', hint: 'Cluster ka address galat hai. Atlas Connect, Drivers wali line se address dobara copy karein.' };
  if (/server selection|timed out|timeout|econnrefused|econnreset|ssl|tls|whitelist|not in the ip|reachable/.test(low)) return { code: 'NETWORK', hint: 'Atlas se connect nahi ho paya. Network Access mein 0.0.0.0/0 (Allow from anywhere) add karein aur dekhein ke cluster paused na ho (Resume dabayein).' };
  return { code: 'DB_OTHER', hint: 'Database error. Netlify Logs, Functions mein health ka log dekhein.' };
}
module.exports = { diagnoseDbError };
