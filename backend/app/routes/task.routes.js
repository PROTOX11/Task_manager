import express from 'express';
import { body } from 'express-validator';
import {
  getTasksByProject,
  getMyTasks,
  getTaskById,
  createTask,
  updateTask,
  completeTask,
  approveTask,
  rejectTask,
  deleteTask,
  downloadAttachment,
  updateTaskStatus
} from '../controllers/task.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Validation
const validateTask = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('projectId').notEmpty().withMessage('Project ID is required')
];

// All routes require authentication
router.use(authenticate);

// Get tasks assigned to current user
router.get('/my-tasks', getMyTasks);

// Get tasks by project
router.get('/project/:projectId', getTasksByProject);

// Get task by ID
router.get('/:id', getTaskById);

// Download task attachment
router.get('/:id/download', downloadAttachment);

// Create task (admin only)
router.post('/', authorizeAdmin, upload.single('attachment'), validateTask, createTask);

// Update task (admin only)
router.put('/:id', authorizeAdmin, upload.single('attachment'), updateTask);

// Update task status
router.patch('/:id/status', updateTaskStatus);

// Mark task as completed (developer)
router.put('/:id/complete', completeTask);

// Approve task (admin only)
router.put('/:id/approve', authorizeAdmin, approveTask);

// Reject task (admin only)
router.put('/:id/reject', authorizeAdmin, rejectTask);

// Delete task (admin only)
router.delete('/:id', authorizeAdmin, deleteTask);

export default router;
