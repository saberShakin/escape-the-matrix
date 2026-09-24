import dotenv from 'dotenv';
import path from 'path';

// Load .env from root workspace
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || '',
  isProduction: process.env.NODE_ENV === 'production',
};
