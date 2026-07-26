require('dotenv').config();

const adminIds = (process.env.ADMIN_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);

module.exports = {
  token: process.env.BOT_TOKEN,
  adminIds,
  isAdmin(userId) {
    return adminIds.includes(Number(userId));
  },
};
