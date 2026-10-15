/* Local NOGO server (no installs needed except Node.js).
 * Serves site/index.html and forwards /api (including the live WebSocket) to Traccar,
 * so NOGO and Traccar look like ONE website to the browser: no CORS or cookie setup.
 * Run:  node local-server.js     then open  http://127.0.0.1:3000
 * Options (environment): PORT=3000  TRACCAR_HOST=127.0.0.1  TRACCAR_PORT=8082 */
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const T = { host: process.env.TRACCAR_HOST || '127.0.0.1', port: +(process.env.TRACCAR_PORT || 8082) }, PORT = +(process.env.PORT || 3000);
const fwd = (h) => { const x = { ...h, host: T.host + ':' + T.port }; delete x.origin; delete x.referer; return x; };
http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const p = http.request({ ...T, path: req.url, method: req.method, headers: fwd(req.headers) }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('Cannot reach Traccar at ' + T.host + ':' + T.port + '. Is the Traccar service running?'); });
    req.pipe(p);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(__dirname, 'site', 'index.html')));
  }
}).on('upgrade', (req, sock, head) => {
  const t = net.connect(T.port, T.host, () => {
    t.write(req.method + ' ' + req.url + ' HTTP/1.1\r\n' + Object.entries(fwd(req.headers)).map(([k, v]) => k + ': ' + v).join('\r\n') + '\r\n\r\n');
    t.write(head); sock.pipe(t); t.pipe(sock);
  });
  t.on('error', () => sock.destroy()); sock.on('error', () => t.destroy());
}).listen(PORT, () => console.log('NOGO is running. Open http://127.0.0.1:' + PORT + '  (Traccar expected at ' + T.host + ':' + T.port + ')'));
