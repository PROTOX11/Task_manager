import express from 'express';
import {
  getMyRequests,
  getProjectRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getRequestHistory
} from '../controllers/request.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get pending requests for current user
router.get('/my-requests', getMyRequests);

// Get request history
router.get('/history', getRequestHistory);

// Get requests for a project (admin)
router.get('/project/:projectId', authorizeAdmin, getProjectRequests);

// Accept invitation
router.put('/:id/accept', acceptRequest);

// Reject invitation
router.put('/:id/reject', rejectRequest);

// Cancel invitation (admin)
router.delete('/:id', authorizeAdmin, cancelRequest);

export default router;
