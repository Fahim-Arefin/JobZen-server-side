const cloudinary = require("cloudinary").v2;
//define a Job model
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
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
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
});

// jobSchema.post("findOneAndDelete", async function (deletedJob) {
//   try {
//     // If the job is found
//     if (
//       deletedJob &&
//       deletedJob.applicants &&
//       deletedJob.applicants.length > 0
//     ) {
//       // Remove all associated applications
//       const applicationIds = deletedJob.applicants.map(
//         (applicant) => applicant._id
//       );
//       await this.model.db
//         .model("Application")
//         .deleteMany({ _id: { $in: applicationIds } });
//       console.log(`Deleted ${applicationIds.length} associated applications`);
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

jobSchema.post("findOneAndDelete", async function (deletedJob) {
  try {
    if (
      deletedJob &&
      deletedJob.applicants &&
      deletedJob.applicants.length > 0
    ) {
      // Populate applicants to get resume links
      // const populatedJob = await this.model
      //   .findById(deletedJob._id)
      //   .populate("applicants");

      const populatedJob = await deletedJob.populate("applicants");

      // console.log(`populated job ${populatedJob}`);

      const applicantsWithResumeLinks = populatedJob.applicants.map(
        (applicant) => applicant.resumeLink
      );

      // console.log(`all resume links ${applicantsWithResumeLinks}`);

      // Extract public IDs of images from Cloudinary
      const publicIds = applicantsWithResumeLinks.map((resumeLink) => {
        // return resumeLink.split("/").slice(-2).join("/");
        // Extract the part "pdfs/oygfcuumzggbwutzr9z1" from the Cloudinary URL
        const parts = resumeLink.split("/");
        return parts.slice(-2).join("/").replace(".pdf", "");
      });

      // console.log(`all public ids ${publicIds}`);

      // Delete images from Cloudinary
      if (publicIds && publicIds.length > 0) {
        for (const publicId of publicIds) {
          await cloudinary.uploader.destroy(publicId);
          console.log(
            `Deleted image with public ID: ${publicId} from Cloudinary`
          );
        }
      }
      // Remove all associated applications
      const applicationIds = deletedJob.applicants.map(
        (applicant) => applicant._id
      );

      // console.log(`Applicant Id : ${applicationIds}`);
      // Delete associated applications
      await this.model.db
        .model("Application")
        .deleteMany({ _id: { $in: applicationIds } });
      console.log(`Deleted ${applicationIds.length} associated applications`);
    }
  } catch (error) {
    console.log(error);
  }
});

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
