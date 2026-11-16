const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.REPORT_PORT || 8787;
const REPORT_FILE = path.join(__dirname, '..', 'test-report.json');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/report' || req.url === '/api/report')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const report = JSON.parse(body);
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Test report receiver listening on http://localhost:${PORT}`);
});

module.exports = server;
