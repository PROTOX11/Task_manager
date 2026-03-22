import ProjectRequest from '../models/ProjectRequest.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// Get pending requests for current developer
export const getMyRequests = async (req, res) => {
  try {
    const requests = await ProjectRequest.find({
      developerId: req.userId,
      status: 'pending'
    })
      .populate('projectId', 'name description')
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

// Get all requests for a project (admin)
export const getProjectRequests = async (req, res) => {
  try {
    const { projectId } = req.params;

    const requests = await ProjectRequest.find({ projectId })
      .populate('developerId', 'name email')
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get project requests error:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

// Accept project invitation
export const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ProjectRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if request belongs to current user
    if (request.developerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Update request status
    request.status = 'accepted';
    await request.save();

    // Add developer to project
    await Project.findByIdAndUpdate(request.projectId, {
      $addToSet: { developers: req.userId }
    });

    // Add project to user's joined projects
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { joinedProjects: request.projectId }
    });

    const project = await Project.findById(request.projectId)
      .populate('developers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Invitation accepted successfully',
      project
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: 'Error accepting request', error: error.message });
  }
};

// Reject project invitation
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ProjectRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if request belongs to current user
    if (request.developerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Update request status
    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Invitation rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Error rejecting request', error: error.message });
  }
};

// Cancel invitation (admin)
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ProjectRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if current user is the sender
    if (request.senderId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    await ProjectRequest.findByIdAndDelete(id);

    res.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Error cancelling request', error: error.message });
  }
};

// Get request history
export const getRequestHistory = async (req, res) => {
  try {
    const requests = await ProjectRequest.find({ developerId: req.userId })
      .populate('projectId', 'name description')
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get request history error:', error);
    res.status(500).json({ message: 'Error fetching request history', error: error.message });
  }
};
