const express = require("express");
const app = express();
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const port = process.env.PORT || 5000;
const Job = require("./model/jobs");
const JobApplication = require("./model/JobApplication");
const util = require("./util/util");
const path = require("path");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

//connection with mongoose
// -------------------------------------------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------------------------------------------

//middleware
// -------------------------------------------------------------------------------------------------------------------

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

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary as storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pdfs", // Set your desired folder name in Cloudinary
    allowed_formats: ["pdf"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
// multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

// -------------------------------------------------------------------------------------------------------------------

//server
// -------------------------------------------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
// -------------------------------------------------------------------------------------------------------------------

// routes
// -------------------------------------------------------------------------------------------------------------------
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
// ==========================================================

// get all jobs or some jobs of specific user
app.get("/jobs", async (req, res) => {
  try {
    const { id } = req.query;
    // console.log(req.cookies);
    // console.log(id);

    // console.log("Owner info", req.user);

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

// ==========================================================

// Application Table
// ==========================================================
// Application create route
app.post("/applications", upload.single("resume"), async (req, res) => {
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
    const { applicantName, applicantEmail, jobId, createdAt } = req.body;
    const file = req.file?.path;
    const { id } = req.query;

    //1. Find the jobs based on jobId given in body
    const job = await Job.findById(jobId);
    //2. checks if it is my job or not
    if (job.authorId === id) {
      res.json({ message: "Can't apply your own job" });
    } else {
      const isExpired = util.isApplicationDeadlineExpired(
        job.applicationDeadline
      );
      //3. check if deadline is over or not
      if (isExpired) {
        res.json({ message: "Sorry !! The application deadline has expired." });
      } else {
        // 4.Create the post
        const data = {
          applicantName,
          applicantEmail,
          jobId,
          createdAt,
          resumeLink: file,
          status: "pending",
          feedback: "",
        };
        const Application = new JobApplication(data);
        const applicationData = await Application.save();

        // 5.push it to the job (only id will be stored)
        job.jobApplicants = job.jobApplicants + 1;
        job.applicants.push(applicationData);

        // save the job
        const jobData = await job.save();

        // Send Mail to applicant

        // Sendinblue API endpoint for sending a transactional email
        const sendinblueEndpoint = "https://api.sendinblue.com/v3/smtp/email";

        // Sendinblue API request headers
        const headers = {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API,
        };

        // Sendinblue API request body

        // Sendinblue API request body
        const requestBody = {
          sender: { email: "fahimarefin57@gmail.com" },
          to: [{ email: applicantEmail }],
          subject: "Successfully recieved resume",
          htmlContent: `<h1> Hello ${applicantName} </h1> <br/> 
          <p> Your Resume has been recieved! Please wait patiantly for resposne. Keep an eye to portal or email for response </p>`,
        };

        // Send the email using Sendinblue API
        axios
          .post(sendinblueEndpoint, requestBody, {
            headers: headers,
          })
          .then((response) => {
            console.log("Email sent successfully:", response.data);
            // res.status(200).json({ message: "Email sent successfully" });
            res.send(jobData);
          })
          .catch((error) => {
            console.error(
              "Error sending email:",
              error.response ? error.response.data : error.message
            );
            console.log(error);
            // res.status(500).json({ error: "Error sending email" });
            res.send(jobData);
          });
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
      let item = [];
      const jobs = await Job.find({}).populate("applicants");
      for (let job of jobs) {
        for (let applicant of job.applicants) {
          if (applicant.applicantEmail === email) {
            // arr.push(job);
            item.push({
              _id: job._id,
              salaryRange: job.salaryRange,
              jobTitle: job.jobTitle,
              bannerUrl: job.bannerUrl,
              applicantName: applicant.applicantName,
              applicantEmail: applicant.applicantEmail,
              createdAt: applicant.createdAt,
              status: applicant.status,
              feedback: applicant.feedback,
            });
          }
        }
      }
      // console.log(arr);
      // console.log(item);

      // // remove dupplicate
      // // Create a Map to store unique objects based on the "id" property
      // const uniqueMap = new Map();
      // item.forEach((obj) => {
      //   if (!uniqueMap.has(obj._id)) {
      //     uniqueMap.set(obj._id, obj);
      //   }
      // });

      // // Convert the Map values back to an array
      // const uniqueArray = Array.from(uniqueMap.values());
      // res.send(uniqueArray.reverse());
      res.send(item.reverse());
    }
  } catch (error) {
    res.send(error);
  }
});

// get specific job applicants
app.get("/applications/:id", varifyToken, async (req, res) => {
  const { id } = req.params;
  const data = await JobApplication.find({ jobId: id });
  res.send(data);
});

// download pdf
// Express route to download a PDF by ID
app.get("/downlaod/:id", async (req, res) => {
  try {
    const item = await JobApplication.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "PDF not found" });
    }

    // Get the file name from the URL
    const fileName = path.basename(item.resumeLink);

    // Set the content-disposition header to trigger download
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // Redirect the client to the Cloudinary URL for the file
    res.redirect(item.resumeLink);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// update a application
app.patch("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, jobName } = req.query;
    const { status, feedback } = req.body;
    await JobApplication.findByIdAndUpdate(id, {
      status,
      feedback,
    });

    // Send Mail to applicant

    // Sendinblue API endpoint for sending a transactional email
    const sendinblueEndpoint = "https://api.sendinblue.com/v3/smtp/email";

    // Sendinblue API request headers
    const headers = {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API,
    };

    // Sendinblue API request body

    // Sendinblue API request body

    let sub, content;
    if (status === "accept") {
      sub = "Congratulation !! Your have been selected";
      content =
        "You are selected for the job. Please Check mail for further info";
    } else {
      sub = "Unfortunately !! You are rejected for the job";
      content =
        "You are rejected !! Please keep working hard and apply next time,";
    }

    const requestBody = {
      sender: { email: "fahimarefin57@gmail.com" },
      to: [{ email }],
      subject: sub,
      htmlContent: `<h1> Hello ${name}</h1> <br/> 
          <h3>You applied for this job ${jobName}</h3> <br/>
          <p> ${content} </p>`,
    };

    // Send the email using Sendinblue API
    axios
      .post(sendinblueEndpoint, requestBody, {
        headers: headers,
      })
      .then((response) => {
        console.log("Email sent successfully:", response.data);
        // res.status(200).json({ message: "Email sent successfully" });
      })
      .catch((error) => {
        console.error(
          "Error sending email:",
          error.response ? error.response.data : error.message
        );
        console.log(error);
        // res.status(500).json({ error: "Error sending email" });
      });

    res.send({ message: "Successfull Update" });
  } catch (error) {
    console.log(error);
    res.send({ message: "Error Update" });
  }
});

// ==========================================================

// -------------------------------------------------------------------------------------------------------------------
