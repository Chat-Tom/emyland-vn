import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './api.ts'; // ✅ thêm đuôi .ts để tránh lỗi ESM

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`✅ API Server đang chạy tại http://localhost:${PORT}`);
});
