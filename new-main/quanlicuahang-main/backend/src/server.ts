import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

// Lắng nghe cổng khi chạy ở môi trường Local / Container (không phải Vercel Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [SERVER] Server đang chạy tại: http://localhost:${PORT}`);
  });
}

// Export app để Vercel Serverless Function có thể xử lý các HTTP request
export default app;