import Workexperience from "../models/Workexperience.js";

export const addWorkExperience = async (req, res) => {
  try {
    const exp = await Workexperience.create({ ...req.body, user: req.user.id });
    res.status(201).json(exp);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: "Job title, company and start date are required" });
    }
    res
      .status(500)
      .json({ message: "Failed to add work experience", error: err.message });
  }
};

export const updateWorkExperience = async (req, res) => {
  try {
    const exp = await Workexperience.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!exp)
      return res.status(404).json({ message: "Work experience not found" });
    res.json(exp);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: "Job title, company and start date are required" });
    }
    res.status(500).json({
      message: "Failed to update work experience",
      error: err.message,
    });
  }
};

export const deleteWorkExperience = async (req, res) => {
  try {
    const deleted = await Workexperience.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted)
      return res.status(404).json({ message: "Work experience not found" });
    res.json({ message: "Work experience deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete work experience",
      error: err.message,
    });
  }
};

export const getWorkExperiences = async (req, res) => {
  try {
    const exp = await Workexperience.find({ user: req.user.id });
    res.json(exp);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch work experiences",
      error: err.message,
    });
  }
};
