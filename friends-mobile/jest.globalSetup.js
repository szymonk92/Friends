// Run tests in a UTC+ zone so local-midnight vs UTC date bugs (issue #09) fail in CI.
module.exports = () => {
  process.env.TZ = 'Europe/Warsaw';
};
