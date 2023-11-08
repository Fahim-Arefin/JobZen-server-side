const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const port = process.env.PORT || 5000;
const Job = require("./model/jobs");
const JobApplication = require("./model/JobApplication");
const util = require("./util/util");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

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
app.use(
  cors({
    origin: ["http://localhost:5173"],
    // origin: [
    //   "https://jobzen-45cf0.web.app",
    //   "https://jobzen-45cf0.firebaseapp.com",
    // ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Varify Toke middleware
const varifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

//server
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

// routes
app.get("/", (req, res) => {
  res.send("this is homepage");
});

// Jwt Token Issue
app.post("/jwt", (req, res) => {
  const body = req.body;
  // console.log(body);
  const token = jwt.sign(body, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

app.post("/logout", (req, res) => {
  const body = req.body;
  // console.log("logging out user...", body);
  res.clearCookie("token", { maxAge: 0 });
  res.json({ success: true });
});

// Job Table

// get all jobs or some jobs of specific user
app.get("/jobs", async (req, res) => {
  try {
    const { id } = req.query;
    // console.log(req.cookies);
    // console.log(id);

    console.log("Owner info", req.user);

    // all users all job data
    if (!id) {
      const Jobs = await Job.find({}).sort({ jobPostingDate: -1 });
      res.send(Jobs);
    } else {
      //one users all data

      // varify token
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.user = decoded;
        // verify user (my data or else data)
        if (id !== req.user.id) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        Job.find({ authorId: id })
          .sort({
            jobPostingDate: -1,
          })
          .then((Jobs) => {
            res.send(Jobs);
          })
          .catch((e) => {
            res.send(e);
          });
      });
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

// Application Table
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
        job.jobApplicants = job.jobApplicants + 1;
        job.applicants.push(applicationData);

        // save the job
        const jobData = await job.save();
        res.send(jobData);
        // done
        //
      }
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

// re-write this route for future bcz all application cant be protected here we did it
app.get("/applications", varifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    // all users all Application data
    // should not verify it but done it
    if (!email) {
      const jobApplications = await JobApplication.find({}).sort({
        createdAt: -1,
      });
      res.send(jobApplications);
    } else {
      if (req.user.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      let arr = [];
      const jobs = await Job.find({}).populate("applicants");
      for (let job of jobs) {
        for (let applicant of job.applicants) {
          if (applicant.applicantEmail === email) {
            arr.push(job);
          }
        }
      }
      console.log(arr);

      // remove dupplicate

      // Create a Map to store unique objects based on the "id" property
      const uniqueMap = new Map();

      arr.forEach((obj) => {
        if (!uniqueMap.has(obj._id)) {
          uniqueMap.set(obj._id, obj);
        }
      });

      // Convert the Map values back to an array
      const uniqueArray = Array.from(uniqueMap.values());

      console.log(uniqueArray);

      res.send(uniqueArray.reverse());
    }
  } catch (error) {
    res.send(error);
  }
});
