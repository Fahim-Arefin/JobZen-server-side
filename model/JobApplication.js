//define a jobApplication model
const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema({
  applicantName: {
    type: String,
    required: true,
  },
  applicantEmail: {
    type: String,
    required: true,
  },
  resumeLink: {
    type: String,
    required: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  // jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  createdAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
  },
  feedback: {
    type: String,
  },
});

const Application = mongoose.model("Application", jobApplicationSchema);

module.exports = Application;
