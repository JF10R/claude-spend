const express = require('express');
const path = require('path');

function friendlyError(err) {
  if (err.code === 'ENOENT') return { status: 404, message: 'Claude Code data directory not found. Have you used Claude Code yet?' };
  if (err.code === 'EPERM' || err.code === 'EACCES') return { status: 403, message: 'Permission denied reading Claude Code data. Check file permissions on ~/.claude/' };
  return { status: 500, message: err.message };
}

function createServer() {
  const app = express();

  // Cache parsed data (reparse on demand via refresh endpoint)
  let cachedData = null;

  app.get('/api/data', async (req, res) => {
    try {
      if (!cachedData) {
        cachedData = await require('./parser').parseAllSessions();
      }
      res.json(cachedData);
    } catch (err) {
      const { status, message } = friendlyError(err);
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/data-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      cachedData = await require('./parser').parseAllSessions((progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      });
      res.write(`data: ${JSON.stringify({ stage: 'done' })}\n\n`);
      res.end();
    } catch (err) {
      const { message } = friendlyError(err);
      res.write(`data: ${JSON.stringify({ stage: 'error', message })}\n\n`);
      res.end();
    }
  });

  app.get('/api/refresh', async (req, res) => {
    try {
      delete require.cache[require.resolve('./parser')];
      cachedData = await require('./parser').parseAllSessions();
      res.json({ ok: true, sessions: cachedData.sessions.length });
    } catch (err) {
      const { status, message } = friendlyError(err);
      res.status(status).json({ error: message });
    }
  });

  // Serve static dashboard
  app.use(express.static(path.join(__dirname, 'public')));

  return app;
}

module.exports = { createServer };
