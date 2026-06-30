const requireSecret = (name) => {
  const value = process.env[name];
  if (!value && !process.env.JEST_WORKER_ID && process.env.NODE_ENV !== 'test') throw new Error(`${name} is required`);
  return value || `test_${name.toLowerCase()}`;
};

module.exports = {
  JWT_SECRET: requireSecret('JWT_SECRET'),
  REFRESH_TOKEN_SECRET: requireSecret('REFRESH_TOKEN_SECRET'),
};
