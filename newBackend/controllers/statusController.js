const { tasks, finalVideoTasks } = require("../services/taskService");

const getTaskStatus = (req, res) => {
  const taskId = req.params.taskId;
  const task = tasks.get(taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  res.json({
    success: true,
    taskId,
    status: task.status,
    audioUrl: task.audioUrl || null,
    animationVideoUrl: task.animationVideoUrl || null,
    error: task.error || null,
  });
};

const getFinalVideoStatus = (req, res) => {
  const folderName = req.params.folderName;
  const task = finalVideoTasks.get(folderName);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  res.json({
    success: true,
    folderName,
    status: task.status,
    videoUrls: task.videoUrls || [],
    error: task.error || null,
  });
};

module.exports = {
  getTaskStatus,
  getFinalVideoStatus,
};