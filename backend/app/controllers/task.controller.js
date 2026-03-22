import Task from '../models/Task.js';
import Project from '../models/Project.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get tasks by project
export const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.find({ projectId })
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Get tasks assigned to current developer
export const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedDeveloper: req.userId })
      .populate('projectId', 'name')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Get single task
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email')
      .populate('projectId', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

// Create task (admin only)
export const createTask = async (req, res) => {
  try {
    const { title, description, projectId, panelId, assignedDeveloper, priority, deadline } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = new Task({
      title,
      description,
      projectId,
      panelId,
      assignedDeveloper,
      createdBy: req.userId,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : undefined
    });

    // Handle file attachment
    if (req.file) {
      task.attachmentFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    await task.save();

    // Update project task count
    project.totalTasks += 1;
    await project.updateProgress();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// Update task (admin only)
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedDeveloper, priority, deadline, status, panelId } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedDeveloper) task.assignedDeveloper = assignedDeveloper;
    if (priority) task.priority = priority;
    if (deadline) task.deadline = new Date(deadline);
    if (status) task.status = status;
    if (panelId) task.panelId = panelId;

    // Handle new file attachment
    if (req.file) {
      // Delete old file if exists
      if (task.attachmentFile && task.attachmentFile.path) {
        const oldPath = task.attachmentFile.path;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      task.attachmentFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Mark task as completed by developer
export const completeTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (task.assignedDeveloper?.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    task.completedByDeveloper = true;
    task.completedAt = new Date();
    task.status = 'review';

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Task marked as completed. Waiting for admin approval.',
      task: updatedTask
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Error completing task', error: error.message });
  }
};

// Approve task (admin only)
export const approveTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.completedByDeveloper) {
      return res.status(400).json({ message: 'Task has not been marked as completed by developer' });
    }

    task.approvedByAdmin = true;
    task.approvedAt = new Date();
    task.status = 'completed';

    await task.save();

    // Update project progress
    const project = await Project.findById(task.projectId);
    if (project) {
      project.completedTasks += 1;
      await project.updateProgress();
    }

    const updatedTask = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Task approved successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ message: 'Error approving task', error: error.message });
  }
};

// Reject task completion (admin only) - send back for revisions
export const rejectTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.completedByDeveloper = false;
    task.completedAt = undefined;
    task.status = 'in-progress';

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Task sent back for revisions',
      task: updatedTask,
      reason
    });
  } catch (error) {
    console.error('Reject task error:', error);
    res.status(500).json({ message: 'Error rejecting task', error: error.message });
  }
};

// Delete task (admin only)
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Delete attachment file if exists
    if (task.attachmentFile && task.attachmentFile.path) {
      if (fs.existsSync(task.attachmentFile.path)) {
        fs.unlinkSync(task.attachmentFile.path);
      }
    }

    // Update project task count
    const project = await Project.findById(task.projectId);
    if (project) {
      project.totalTasks = Math.max(0, project.totalTasks - 1);
      if (task.approvedByAdmin) {
        project.completedTasks = Math.max(0, project.completedTasks - 1);
      }
      await project.updateProgress();
    }

    await Task.findByIdAndDelete(id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Download task attachment
export const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.attachmentFile || !task.attachmentFile.path) {
      return res.status(404).json({ message: 'No attachment found for this task' });
    }

    const filePath = task.attachmentFile.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, task.attachmentFile.originalName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Error downloading attachment', error: error.message });
  }
};

// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Developers can only update status of their assigned tasks
    if (req.user.role === 'developer' && task.assignedDeveloper?.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignedDeveloper', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      message: 'Task status updated',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Error updating task status', error: error.message });
  }
};
