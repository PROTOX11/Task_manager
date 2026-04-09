import express from 'express';
import { body } from 'express-validator';
import {
  getPanelsByProject,
  createPanel,
  updatePanel,
  deletePanel,
  reorderPanels
} from '../controllers/panel.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation
const validatePanel = [
  body('name').trim().notEmpty().withMessage('Panel name is required'),
  body('projectId').notEmpty().withMessage('Project ID is required')
];

// All routes require authentication
router.use(authenticate);

// Get panels by project
router.get('/project/:projectId', getPanelsByProject);

// Create panel (admin only)
router.post('/', authorizeAdmin, validatePanel, createPanel);

// Reorder panels (admin only)
router.put('/reorder', authorizeAdmin, reorderPanels);

// Update panel (admin only)
router.put('/:id', authorizeAdmin, updatePanel);

// Delete panel (admin only)
router.delete('/:id', authorizeAdmin, deletePanel);

export default router;
