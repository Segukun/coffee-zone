import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getMe, getPublic, updateMe } from '../controllers/userController.js';

const router = Router();
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.get('/:username', getPublic);

export default router;
