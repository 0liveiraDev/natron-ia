"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const authController_1 = require("../controllers/authController");
const habitController = __importStar(require("../controllers/habitController"));
const taskController = __importStar(require("../controllers/taskController"));
const financeController = __importStar(require("../controllers/financeController"));
const activityController = __importStar(require("../controllers/activityController"));
const atlasController = __importStar(require("../controllers/atlasController"));
const dashboardController = __importStar(require("../controllers/dashboardController"));
const adminController_1 = require("../controllers/adminController");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const uploadMiddleware_2 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// Admin Routes
router.post('/admin/reset-all-xp', adminController_1.resetAllXp);
router.get('/admin/users', auth_1.authMiddleware, adminController_1.getAllUsers);
router.put('/admin/users/:id/toggle-active', auth_1.authMiddleware, adminController_1.toggleUserActive);
// Auth routes
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.post('/auth/forgot-password', authController_1.forgotPassword);
router.post('/auth/reset-password', authController_1.resetPassword);
router.get('/auth/me', auth_1.authMiddleware, authController_1.getMe);
router.post('/auth/avatar', auth_1.authMiddleware, uploadMiddleware_1.uploadAvatar.single('avatar'), authController_1.uploadAvatar);
router.post('/auth/upload-avatar', auth_1.authMiddleware, uploadMiddleware_1.uploadAvatar.single('avatar'), authController_1.uploadAvatar);
// Habit routes
router.post('/habits', auth_1.authMiddleware, habitController.createHabit);
router.get('/habits', auth_1.authMiddleware, habitController.getHabits);
router.put('/habits/:id', auth_1.authMiddleware, habitController.updateHabit);
router.delete('/habits/:id', auth_1.authMiddleware, habitController.deleteHabit);
router.post('/habits/:habitId/toggle', auth_1.authMiddleware, habitController.toggleHabitLog);
router.get('/habits/stats', auth_1.authMiddleware, habitController.getHabitStats);
// Task routes
router.post('/tasks', auth_1.authMiddleware, taskController.createTask);
router.get('/tasks', auth_1.authMiddleware, taskController.getTasks);
router.put('/tasks/:id', auth_1.authMiddleware, taskController.updateTask);
router.delete('/tasks/:id', auth_1.authMiddleware, taskController.deleteTask);
// Finance routes
router.post('/transactions', auth_1.authMiddleware, financeController.createTransaction);
router.get('/transactions', auth_1.authMiddleware, financeController.getTransactions);
router.put('/transactions/:id', auth_1.authMiddleware, financeController.updateTransaction);
router.delete('/transactions/:id', auth_1.authMiddleware, financeController.deleteTransaction);
router.get('/finance/dashboard', auth_1.authMiddleware, financeController.getDashboard);
router.get('/finance/evolution', auth_1.authMiddleware, dashboardController.getFinancialEvolution);
router.put('/finance/config', auth_1.authMiddleware, financeController.updateFinancialConfig);
// Activity routes
router.get('/activities', auth_1.authMiddleware, activityController.getActivities);
// Atlas routes
router.post('/atlas/chat', auth_1.authMiddleware, atlasController.chat);
// Dashboard routes
router.get('/dashboard/overview', auth_1.authMiddleware, dashboardController.getOverview);
router.get('/dashboard/weekly-progress', auth_1.authMiddleware, dashboardController.getWeeklyProgress);
router.get('/dashboard/monthly-stats', auth_1.authMiddleware, dashboardController.getMonthlyStats);
router.get('/finance/by-category', auth_1.authMiddleware, dashboardController.getFinanceByCategory);
// Receipt upload routes
router.post('/finance/upload-receipt', auth_1.authMiddleware, uploadMiddleware_2.upload.single('receipt'), financeController.uploadReceipt);
router.post('/finance/confirm-receipt', auth_1.authMiddleware, financeController.confirmReceipt);
exports.default = router;
