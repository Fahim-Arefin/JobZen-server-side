const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const port = process.env.PORT || 5000;
const Job = require("./model/jobs");
const JobApplication = require("./model/JobApplication");
const util = require("./util/util");

//connection with mongoose
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8wioxsd.mongodb.net/JobZen?retryWrites=true&w=majority`
  ) //connected to farmStand database
  .then(() => {
    console.log("Mongo connnection successful: ");
  })
  .catch((e) => {
    console.log("Mongo connection failed !!");
    console.log(e);
  });

//middleware
app.use(cors());
app.use(express.json());

//server
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

// routes
app.get("/", (req, res) => {
  res.send("this is homepage");
});

// get all jobs or some jobs of specific user
app.get("/jobs", async (req, res) => {
  try {
    const { id } = req.query;
    // console.log(id);
    // all users all data
    if (!id) {
      const Jobs = await Job.find({}).sort({ jobPostingDate: -1 });
      res.send(Jobs);
    } else {
      //one users all data
      const Jobs = await Job.find({ authorId: id }).sort({
        jobPostingDate: -1,
      });
      res.send(Jobs);
    }
  } catch (error) {
    res.send(error);
  }
});

// get a Job
app.get("/jobs/:id", async (req, res) => {
  const { id } = req.params;
  const data = await Job.findById(id);
  // console.log(data);
  res.send(data);
});

// add a job
app.post("/jobs", async (req, res) => {
  try {
    const body = req.body;
    const job = new Job(body);
    const data = await job.save();
    console.log("crated successfully");
    res.status(201).send(data);
  } catch (error) {
    console.log("Error Creation");
    console.log(error);
    res.send(error);
  }
});

// update Job
app.put("/jobs/:id", async (req, res) => {
  const { id } = req.params;
  const job = req.body;
  const response = await Job.findByIdAndUpdate(id, job, {
    runValidators: true,
    new: true,
  });
  res.send(response);
});

// delete a job
app.delete("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Job.findByIdAndDelete(id);
    res.send("Deleted Successfully");
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

// Application create route
app.post("/applications", async (req, res) => {
  /*
    steps: 
    --------
    1.Find the jobs based on jobId given in body
    2.Checks if it is my job or not 
    3.Checks if deadline is over or not
    4.Create the post
    5.push it to the job (only id will be stored)
    6.save the job
  */

  try {
    const body = req.body;
    const { id } = req.query;

    //1. Find the jobs based on jobId given in body
    const job = await Job.findById(body.jobId);
    //2. checks if it is my job or not
    if (job.authorId === id) {
      res.json({ message: "Can't Apply your created job" });
    } else {
      const isExpired = util.isApplicationDeadlineExpired(
        job.applicationDeadline
      );
      //3. check if deadline is over or not
      if (isExpired) {
        res.json({ message: "The application deadline has expired." });
      } else {
        // 4.Create the post
        const Application = new JobApplication(body);
        const applicationData = await Application.save();

        // 5.push it to the job (only id will be stored)
        job.applicants.push(applicationData);

        // save the job
        const jobData = await job.save();
        res.send(jobData);
      }
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});
