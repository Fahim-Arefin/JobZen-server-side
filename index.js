const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const port = process.env.PORT || 5000;
const Job = require("./model/jobs");

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

// get all jobs
app.get("/jobs", async (req, res) => {
  try {
    const Jobs = await Job.find({});
    res.send(Jobs);
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
