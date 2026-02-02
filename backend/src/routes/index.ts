import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { register, login, getMe, uploadAvatar } from '../controllers/authController';
import * as habitController from '../controllers/habitController';
import * as taskController from '../controllers/taskController';
import * as financeController from '../controllers/financeController';
import * as activityController from '../controllers/activityController';
import * as atlasController from '../controllers/atlasController';
import * as dashboardController from '../controllers/dashboardController';
import { resetAllXp } from '../controllers/adminController';

import { uploadAvatar as uploadAvatarMiddleware } from '../middlewares/uploadMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Emergency Admin Routes (Temporary)
router.post('/admin/reset-all-xp', resetAllXp);

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, getMe);
router.post('/auth/avatar', authMiddleware, uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.post('/auth/upload-avatar', authMiddleware, uploadAvatarMiddleware.single('avatar'), uploadAvatar);

// Habit routes
router.post('/habits', authMiddleware, habitController.createHabit);
router.get('/habits', authMiddleware, habitController.getHabits);
router.put('/habits/:id', authMiddleware, habitController.updateHabit);
router.delete('/habits/:id', authMiddleware, habitController.deleteHabit);
router.post('/habits/:habitId/toggle', authMiddleware, habitController.toggleHabitLog);
router.get('/habits/stats', authMiddleware, habitController.getHabitStats);


// Task routes
router.post('/tasks', authMiddleware, taskController.createTask);
router.get('/tasks', authMiddleware, taskController.getTasks);
router.put('/tasks/:id', authMiddleware, taskController.updateTask);
router.delete('/tasks/:id', authMiddleware, taskController.deleteTask);

// Finance routes
router.post('/transactions', authMiddleware, financeController.createTransaction);
router.get('/transactions', authMiddleware, financeController.getTransactions);
router.put('/transactions/:id', authMiddleware, financeController.updateTransaction);
router.delete('/transactions/:id', authMiddleware, financeController.deleteTransaction);
router.get('/finance/dashboard', authMiddleware, financeController.getDashboard);
router.get('/finance/evolution', authMiddleware, dashboardController.getFinancialEvolution);
router.put('/finance/config', authMiddleware, financeController.updateFinancialConfig);

// Activity routes
router.get('/activities', authMiddleware, activityController.getActivities);

// Atlas routes
router.post('/atlas/chat', authMiddleware, atlasController.chat);

// Dashboard routes
router.get('/dashboard/overview', authMiddleware, dashboardController.getOverview);
router.get('/dashboard/weekly-progress', authMiddleware, dashboardController.getWeeklyProgress);
router.get('/dashboard/monthly-stats', authMiddleware, dashboardController.getMonthlyStats);
router.get('/finance/by-category', authMiddleware, dashboardController.getFinanceByCategory);

// Receipt upload routes
router.post('/finance/upload-receipt', authMiddleware, upload.single('receipt'), financeController.uploadReceipt);
router.post('/finance/confirm-receipt', authMiddleware, financeController.confirmReceipt);

export default router;
