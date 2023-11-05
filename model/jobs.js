//define a Job model
const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
  bannerUrl: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  jobCategory: {
    type: String,
    required: true,
  },
  salaryRange: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  jobApplicants: {
    type: Number,
    required: true,
  },
  jobPostingDate: {
    type: Date,
    required: true,
  },
  applicationDeadline: {
    type: Date,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
});

const Job = mongoose.model("Job", citySchema);

module.exports = Job;
