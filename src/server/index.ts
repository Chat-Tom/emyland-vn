import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './api.ts'; // ✅ thêm đuôi .ts để đúng chuẩn ESM/module

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

// Định tuyến API
app.use('/api', apiRoutes);

// Khởi động server
app.listen(PORT, () => {
  console.log(`✅ API Server đang chạy tại http://localhost:${PORT}`);
});
