import express from 'express';
import { body } from 'express-validator';
import {
  getProjects,
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  inviteDeveloper,
  leaveProject,
  deleteProject,
  getProjectStats
} from '../controllers/project.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation middleware
const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim()
];

// All routes require authentication
router.use(authenticate);

// Get all projects for current user
router.get('/', getProjects);

// Get all projects (admin)
router.get('/all', authorizeAdmin, getAllProjects);

// Create new project (admin only)
router.post('/', authorizeAdmin, validateProject, createProject);

// Get project by ID
router.get('/:id', getProjectById);

// Get project statistics
router.get('/:id/stats', getProjectStats);

// Update project (admin only)
router.put('/:id', authorizeAdmin, updateProject);

// Invite developer to project (admin only)
router.post('/:id/invite', authorizeAdmin, inviteDeveloper);

// Leave project (developer)
router.post('/:id/leave', leaveProject);

// Delete project (admin only)
router.delete('/:id', authorizeAdmin, deleteProject);

export default router;
