module.exports.isApplicationDeadlineExpired = (applicationDeadline) => {
  // Parse the application deadline string into a Date object
  const deadlineDate = new Date(applicationDeadline);

  // Get the current date and time
  const currentDate = new Date();

  // Compare the application deadline with the current date
  return currentDate > deadlineDate;
};
