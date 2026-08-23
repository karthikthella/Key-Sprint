import dotenv from 'dotenv';
dotenv.config();

export const PORT = parseInt(process.env.PORT, 10) || 5000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/keysprint';

export const JWT_SECRET = process.env.JWT_SECRET || 'keysprint_default_dev_secret_key_change_in_prod';
export const JWT_EXP = process.env.JWT_EXP || '7d';
