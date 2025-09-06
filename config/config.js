require("dotenv").config();

module.exports = {
  wechat: {
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    guid: process.env.GUID,
    baseUrl: "https://chat-api.juhebot.com/open/GuidRequest",
  },
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    timezone: "+08:00",
  },
  app: {
    cronSchedule: process.env.CRON_SCHEDULE || "*/2[]\0 78i* * * *",
    logLevel: process.env.LOG_LEVEL || "info",
  },
};
