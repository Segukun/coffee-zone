import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { changePassword, getMe, getPublic, updateMe } from '../controllers/userController.js';

const router = Router();
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.patch('/me/password', authMiddleware, changePassword);
router.get('/:username', getPublic);

export default router;
