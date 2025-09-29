import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const MONGO_URI = process.env.MONGO_URI || '';

export const JWT_SECRET = process.env.JWT_SECRET || 'p0tat0';
export const JWT_EXP = process.env.JWT_EXP || '7d';


