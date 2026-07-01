import multer from 'multer';

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 10);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadMb * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];

    if (allowed.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only Excel .xls or .xlsx files are supported'));
  }
});
