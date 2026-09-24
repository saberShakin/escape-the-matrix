import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import gameRoutes from './routes/game-routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Escape the Matrix Simulation Engine',
    aiGatewayConfigured: Boolean(config.aiGatewayApiKey),
  });
});

// Game API
app.use('/api/game', gameRoutes);

// Direct shortcut for /api/matrix-eval
app.use('/api', gameRoutes);

app.listen(config.port, () => {
  console.log(`[Matrix Server] Listening on port ${config.port}`);
  console.log(`[Matrix Server] AI Gateway API Key detected: ${Boolean(config.aiGatewayApiKey)}`);
});

export default app;
