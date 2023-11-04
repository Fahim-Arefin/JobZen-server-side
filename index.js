const express = require("express");
const app = express();
const cors = require("cors");

const port = process.env.PORT || 5000;

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
