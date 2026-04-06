import Project from '../models/Project.js';
import User from '../models/User.js';
import ProjectChatMessage from '../models/ProjectChatMessage.js';
import ProjectMeeting from '../models/ProjectMeeting.js';
import Notification from '../models/Notification.js';

const typingState = new Map();

const populateProjectMembers = (query) =>
  query
    .populate('developers', 'name email role')
    .populate('createdBy', 'name email role');

const hasProjectAccess = (project, user) => {
  if (!project || !user) return false;
  const projectOwnerId = project.createdBy?._id?.toString?.() || project.createdBy?.toString?.();
  const userId = user._id?.toString?.() || user.id?.toString?.();

  if (user.role === 'admin' && projectOwnerId === userId) {
    return true;
  }

  return Array.isArray(project.developers) &&
    project.developers.some((dev) => (dev?._id?.toString?.() || dev?.toString?.()) === userId);
};

const buildConversationFilter = (projectId, userId, conversationWith) => {
  if (!conversationWith) {
    return {
      projectId,
      recipientId: null
    };
  }

  return {
    projectId,
    $or: [
      { senderId: userId, recipientId: conversationWith },
      { senderId: conversationWith, recipientId: userId }
    ]
  };
};

const formatMember = (member) => ({
  id: member._id.toString(),
  name: member.name,
  email: member.email,
  role: member.role
});

const getConversationKey = (projectId, recipientId) => `${projectId}:${recipientId || 'public'}`;

const pruneTypingState = () => {
  const now = Date.now();
  for (const [key, value] of typingState.entries()) {
    const active = Array.from(value.entries()).filter(([, expiresAt]) => expiresAt > now);
    if (active.length === 0) {
      typingState.delete(key);
      continue;
    }
    typingState.set(key, new Map(active));
  }
};

const setTypingState = ({ projectId, senderId, senderName, recipientId }) => {
  pruneTypingState();
  const key = getConversationKey(projectId, recipientId);
  const conversation = typingState.get(key) || new Map();
  conversation.set(senderId.toString(), {
    senderId: senderId.toString(),
    senderName,
    expiresAt: Date.now() + 4000
  });
  typingState.set(key, conversation);
};

const getTypingParticipants = ({ projectId, recipientId, viewerId }) => {
  pruneTypingState();
  const key = getConversationKey(projectId, recipientId);
  const conversation = typingState.get(key) || new Map();
  return Array.from(conversation.values()).filter((participant) => participant.senderId !== viewerId);
};

export const getProjectChatMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const conversationWith = req.query.conversationWith?.toString() || '';

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const filter = buildConversationFilter(projectId, req.userId, conversationWith || null);

    const messages = await ProjectChatMessage.find(filter)
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role')
      .sort({ createdAt: 1 });

    res.json({
      messages,
      members: [
        formatMember(project.createdBy),
        ...project.developers.map(formatMember)
      ]
    });
  } catch (error) {
    console.error('Get project chat messages error:', error);
    res.status(500).json({ message: 'Error fetching chat messages', error: error.message });
  }
};

export const getProjectTypingStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const recipientId = req.query.recipientId?.toString() || null;

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const typingUsers = getTypingParticipants({
      projectId,
      recipientId,
      viewerId: req.userId.toString()
    });

    res.json({ typingUsers });
  } catch (error) {
    console.error('Get project typing status error:', error);
    res.status(500).json({ message: 'Error fetching typing status', error: error.message });
  }
};

export const setProjectTypingStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { recipientId } = req.body;

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to chat in this project' });
    }

    setTypingState({
      projectId,
      senderId: req.userId,
      senderName: req.user.name,
      recipientId: recipientId || null
    });

    res.json({ message: 'Typing status updated' });
  } catch (error) {
    console.error('Set project typing status error:', error);
    res.status(500).json({ message: 'Error updating typing status', error: error.message });
  }
};

export const sendProjectChatMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, recipientId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to chat in this project' });
    }

    let recipient = null;
    if (recipientId) {
      recipient = await User.findById(recipientId).select('name email role');
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
    }

    const message = new ProjectChatMessage({
      projectId,
      senderId: req.userId,
      recipientId: recipient?._id || null,
      content: content.trim()
    });

    await message.save();

    if (recipient) {
      await Notification.create({
        userId: recipient._id,
        senderId: req.userId,
        projectId,
        type: 'project_chat_dm',
        title: 'New private message',
        message: `${req.user.name || 'A teammate'} sent you a private message in ${project.name}.`,
        read: false
      });
    }

    const populatedMessage = await ProjectChatMessage.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role');

    res.status(201).json({
      message: 'Chat message sent successfully',
      chatMessage: populatedMessage
    });
  } catch (error) {
    console.error('Send project chat message error:', error);
    res.status(500).json({ message: 'Error sending chat message', error: error.message });
  }
};

export const getProjectMeetings = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    const meetings = await ProjectMeeting.find({ projectId })
      .populate('createdBy', 'name email role')
      .sort({ scheduledFor: 1, createdAt: -1 });

    res.json({
      meetings
    });
  } catch (error) {
    console.error('Get project meetings error:', error);
    res.status(500).json({ message: 'Error fetching meetings', error: error.message });
  }
};

export const createProjectMeeting = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, scheduledFor, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Meeting title is required' });
    }

    if (!scheduledFor) {
      return res.status(400).json({ message: 'Meeting date and time is required' });
    }

    const project = await populateProjectMembers(Project.findById(projectId));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({ message: 'Not authorized to schedule meetings for this project' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can schedule meetings' });
    }

    const meeting = new ProjectMeeting({
      projectId,
      createdBy: req.userId,
      title: title.trim(),
      scheduledFor: new Date(scheduledFor),
      notes: notes || ''
    });

    await meeting.save();

    const populatedMeeting = await ProjectMeeting.findById(meeting._id)
      .populate('createdBy', 'name email role');

    res.status(201).json({
      message: 'Meeting scheduled successfully',
      meeting: populatedMeeting
    });
  } catch (error) {
    console.error('Create project meeting error:', error);
    res.status(500).json({ message: 'Error scheduling meeting', error: error.message });
  }
};
