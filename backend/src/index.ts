import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       SafeVision AI Backend Server       ║
╠══════════════════════════════════════════╣
║  Status:  Running (local dev)            ║
║  Port:    ${PORT}                           ║
║  Health:  http://localhost:${PORT}/api/health ║
╚══════════════════════════════════════════╝
  `);
});
