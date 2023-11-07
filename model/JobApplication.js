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
  createdAt: {
    type: Date,
    required: true,
  },
});

const Application = mongoose.model("Application", jobApplicationSchema);

module.exports = Application;
