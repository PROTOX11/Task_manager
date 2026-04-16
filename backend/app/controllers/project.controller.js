import Project from '../models/Project.js';
import Panel from '../models/Panel.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import ProjectRequest from '../models/ProjectRequest.js';
import { emitToUser } from '../services/realtime.service.js';

// Get all projects for the current user
export const getProjects = async (req, res) => {
  try {
    let projects;
    
    if (req.user.role === 'admin') {
      // Admin sees projects they created OR are added as an admin to
      projects = await Project.find({
        $or: [
          { createdBy: req.userId },
          { admins: req.userId }
        ]
      })
        .populate('developers', 'name email')
        .populate('admins', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Developers see only projects they're part of
      projects = await Project.find({ developers: req.userId })
        .populate('developers', 'name email')
        .populate('admins', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

// Get all projects (for admin sidebar)
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('developers', 'name email')
      .populate('admins', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({ message: 'Error fetching all projects', error: error.message });
  }
};

// Create new project (admin only)
export const createProject = async (req, res) => {
  try {
    const { name, description, panels, githubRepository } = req.body;
    const normalizedName = (name || '').trim().toLowerCase();
    if (!normalizedName) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const existingProject = await Project.findOne({
      name: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      createdBy: req.userId,
    });
    if (existingProject) {
      return res.status(409).json({ message: `Project "${existingProject.name}" already exists.` });
    }

    const defaultPanels = [
      { name: 'To Do', description: 'Tasks waiting to be started', color: '#64748b' },
      { name: 'In Progress', description: 'Tasks currently being worked on', color: '#2563eb' },
      { name: 'Done', description: 'Completed tasks', color: '#16a34a' },
    ];
    const panelsToCreate = Array.isArray(panels) && panels.length > 0 ? panels : defaultPanels;

    const project = new Project({
      name,
      description,
      githubRepository: githubRepository || '',
      createdBy: req.userId
    });

    await project.save();

    // Create default panels if provided
    if (panelsToCreate && panelsToCreate.length > 0) {
      const panelDocs = await Panel.insertMany(
        panelsToCreate.map((panel, index) => ({
          name: panel.name,
          projectId: project._id,
          description: panel.description || '',
          order: index,
          color: panel.color || '#007bff'
        }))
      );

      project.panels = panelDocs.map(p => p._id);
      await project.save();
    }

    // Add project to admin's joined projects
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { joinedProjects: project._id }
    });

    const populatedProject = await Project.findById(project._id)
      .populate('developers', 'name email')
      .populate('admins', 'name email')
      .populate('createdBy', 'name email')
      .populate('panels');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
};

// Get project by ID
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('developers', 'name email role')
      .populate('admins', 'name email')
      .populate('createdBy', 'name email')
      .populate('panels');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get task statistics
    const tasks = await Task.find({ projectId: id });
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.approvedByAdmin).length,
      pending: tasks.filter(t => !t.completedByDeveloper).length,
      inReview: tasks.filter(t => t.completedByDeveloper && !t.approvedByAdmin).length
    };

    res.json({ project, taskStats });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
};

// Update project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, githubRepository } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin who created the project
    if (project.createdBy.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    if (name) {
      const duplicate = await Project.findOne({
        _id: { $ne: id },
        createdBy: project.createdBy,
        name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });
      if (duplicate) {
        return res.status(409).json({ message: `Project "${duplicate.name}" already exists.` });
      }
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (githubRepository !== undefined) project.githubRepository = githubRepository;
    if (status) project.status = status;

    await project.save();

    const updatedProject = await Project.findById(id)
      .populate('developers', 'name email')
      .populate('admins', 'name email')
      .populate('createdBy', 'name email')
      .populate('panels');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
};

// Invite developer to project
export const inviteDeveloper = async (req, res) => {
  try {
    const { id } = req.params;
    const { developerId, userId, message } = req.body;
    const targetDeveloperId = developerId || userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can invite developers' });
    }

    // Check if developer exists
    if (!targetDeveloperId) {
      return res.status(400).json({ message: 'Developer id is required' });
    }

    const developer = await User.findById(targetDeveloperId);
    if (!developer || developer.role !== 'developer') {
      return res.status(404).json({ message: 'Developer not found' });
    }

    const projectDevelopers = Array.isArray(project.developers) ? project.developers : [];
    const isAlreadyMember = projectDevelopers.some((memberId) => memberId.toString() === targetDeveloperId.toString());
    if (isAlreadyMember) {
      return res.status(409).json({ message: 'Developer is already in this project' });
    }

    const existingRequest = await ProjectRequest.findOne({
      projectId: id,
      developerId: targetDeveloperId
    });

    if (existingRequest?.status === 'pending') {
      return res.status(409).json({ message: 'Invitation already exists for this developer' });
    }

    if (existingRequest) {
      await ProjectRequest.deleteOne({ _id: existingRequest._id });
    }

    const request = await ProjectRequest.create({
      projectId: id,
      developerId: targetDeveloperId,
      senderId: req.userId,
      status: 'pending',
      message: message || `You have been invited to join ${project.name}`
    });

    emitToUser(developer._id.toString(), 'request:new', {
      request: {
        _id: request._id.toString(),
        projectId: id,
        developerId: targetDeveloperId,
        senderId: req.userId.toString(),
        status: request.status,
        message: request.message
      }
    });

    res.status(201).json({
      message: 'Invitation sent successfully',
      request: {
        id: request._id.toString(),
        projectId: id,
        developerId: targetDeveloperId,
        status: request.status,
        message: request.message
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Invitation already exists for this developer' });
    }
    console.error('Invite developer error:', error);
    res.status(500).json({ message: 'Error inviting developer', error: error.message });
  }
};

// Add admin to project (admin only — grants another admin full project control)
export const addAdminToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ message: 'adminId is required' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only the project creator or existing co-admins can add new admins
    const isCreator = project.createdBy.toString() === req.userId.toString();
    const isCoAdmin = (project.admins || []).some((a) => a.toString() === req.userId.toString());
    if (!isCreator && !isCoAdmin) {
      return res.status(403).json({ message: 'Not authorized to add admins to this project' });
    }

    const targetAdmin = await User.findById(adminId);
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Cannot add the creator as a co-admin (already has full access)
    if (adminId.toString() === project.createdBy.toString()) {
      return res.status(400).json({ message: 'This user is already the project owner' });
    }

    const alreadyAdmin = (project.admins || []).some((a) => a.toString() === adminId.toString());
    if (alreadyAdmin) {
      return res.status(409).json({ message: 'This admin is already added to the project' });
    }

    project.admins = [...(project.admins || []), adminId];
    await project.save();

    // Give the new admin access via joinedProjects so getProjects returns it
    await User.findByIdAndUpdate(adminId, {
      $addToSet: { joinedProjects: project._id }
    });

    res.json({ message: `${targetAdmin.name} added as project admin`, adminId });
  } catch (error) {
    console.error('Add admin to project error:', error);
    res.status(500).json({ message: 'Error adding admin to project', error: error.message });
  }
};

// Leave project (developer)
export const leaveProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if developer is in project
    if (!project.developers.includes(req.userId)) {
      return res.status(400).json({ message: 'You are not a member of this project' });
    }

    // Remove developer from project
    project.developers = project.developers.filter(
      dev => dev.toString() !== req.userId.toString()
    );
    await project.save();

    // Remove project from user's joined projects
    await User.findByIdAndUpdate(req.userId, {
      $pull: { joinedProjects: id }
    });

    // Unassign developer from tasks in this project
    await Task.updateMany(
      { projectId: id, assignedDeveloper: req.userId },
      { $unset: { assignedDeveloper: '' }, status: 'pending' }
    );

    res.json({ message: 'Successfully left the project' });
  } catch (error) {
    console.error('Leave project error:', error);
    res.status(500).json({ message: 'Error leaving project', error: error.message });
  }
};

// Remove project member (admin only)
export const removeProjectMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove project members' });
    }

    if (memberId.toString() === project.createdBy.toString()) {
      return res.status(400).json({ message: 'Project owner cannot be removed' });
    }

    const member = await User.findById(memberId);
    if (!member || member.role !== 'developer') {
      return res.status(404).json({ message: 'Member not found' });
    }

    const projectDevelopers = Array.isArray(project.developers) ? project.developers : [];
    const isMember = projectDevelopers.some((dev) => dev.toString() === memberId.toString());
    if (!isMember) {
      return res.status(400).json({ message: 'User is not a member of this project' });
    }

    project.developers = projectDevelopers.filter(
      (dev) => dev.toString() !== memberId.toString()
    );
    await project.save();

    await ProjectRequest.deleteMany({
      projectId: id,
      developerId: memberId
    });

    await User.findByIdAndUpdate(memberId, {
      $pull: { joinedProjects: id }
    });

    await Task.updateMany(
      { projectId: id, assignedDeveloper: memberId },
      { $unset: { assignedDeveloper: '' }, status: 'pending' }
    );

    res.json({
      message: 'Project member removed successfully'
    });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ message: 'Error removing project member', error: error.message });
  }
};

// Delete project (admin only)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is admin who created the project
    if (project.createdBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    // Delete all related data
    await Panel.deleteMany({ projectId: id });
    await Task.deleteMany({ projectId: id });
    await ProjectRequest.deleteMany({ projectId: id });

    // Remove project from all users' joined projects
    await User.updateMany(
      { joinedProjects: id },
      { $pull: { joinedProjects: id } }
    );

    await Project.findByIdAndDelete(id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

// Get project statistics
export const getProjectStats = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const tasks = await Task.find({ projectId: id });
    
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.approvedByAdmin).length,
      pendingTasks: tasks.filter(t => !t.completedByDeveloper).length,
      inReviewTasks: tasks.filter(t => t.completedByDeveloper && !t.approvedByAdmin).length,
      totalDevelopers: project.developers.length,
      progress: project.progress,
      tasksByPriority: {
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      tasksByStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        completed: tasks.filter(t => t.status === 'completed').length
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ message: 'Error fetching project stats', error: error.message });
  }
};
