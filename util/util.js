module.exports.isApplicationDeadlineExpired = (applicationDeadline) => {
  const deadlineDate = new Date(applicationDeadline);
  const currentDate = new Date();
  return currentDate > deadlineDate;
};
