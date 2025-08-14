import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';

// 扩展Request类型以包含file属性
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer用于处理文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// 图片上传端点
router.post('/', upload.single('image'), (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 生成唯一文件名
    const fileExtension = path.extname(req.file.originalname) || '.png';
    const fileName = crypto.randomUUID() + fileExtension;
    const filePath = path.join(uploadsDir, fileName);

    // 保存文件到磁盘
    fs.writeFileSync(filePath, req.file.buffer);

    // 返回文件URL
    const fileUrl = `/uploads/${fileName}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: fileName,
      originalName: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制(10MB)' });
    }
  }
  res.status(500).json({ error: error.message || '服务器错误' });
});

export default router;