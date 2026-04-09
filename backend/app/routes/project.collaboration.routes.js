import express from 'express';
import { body } from 'express-validator';
import {
  getProjectChatMessages,
  getProjectTypingStatus,
  sendProjectChatMessage,
  setProjectTypingStatus,
  streamProjectChat,
  getProjectMeetings,
  createProjectMeeting
} from '../controllers/project.collaboration.controller.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/:projectId/chat', getProjectChatMessages);
router.get('/:projectId/chat/stream', streamProjectChat);
router.get('/:projectId/chat/typing', getProjectTypingStatus);
router.post(
  '/:projectId/chat',
  [
    body('content').trim().notEmpty().withMessage('Message content is required')
  ],
  sendProjectChatMessage
);
router.post('/:projectId/chat/typing', setProjectTypingStatus);

router.get('/:projectId/meetings', getProjectMeetings);
router.post('/:projectId/meetings', authorizeAdmin, createProjectMeeting);

export default router;
