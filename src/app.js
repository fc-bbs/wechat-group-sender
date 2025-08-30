const cron = require("node-cron");
const db = require("./database/db");
const wechatService = require("./services/wechatService");
const messageService = require("./services/messageService");
const logger = require("./utils/logger");
const config = require("../config/config");

class App {
  constructor() {
    this.isRunning = false;
  }

  async init() {
    try {
      logger.info("应用启动中...");

      // 初始化数据库
      await db.init();

      // 测试企业微信连接
      await this.testWechatConnection();

      // 启动定时任务
      this.startCronJob();

      // 设置优雅退出
      this.setupGracefulShutdown();

      logger.info("应用启动成功");
    } catch (error) {
      logger.error("应用启动失败:", error);
      process.exit(1);
    }
  }

  async testWechatConnection() {
    try {
      await wechatService.getAccessToken();
      logger.info("企业微信连接测试成功");
    } catch (error) {
      logger.error("企业微信连接测试失败:", error);
      throw error;
    }
  }

  startCronJob() {
    logger.info(`定时任务已启动，执行频率: ${config.app.cronSchedule}`);

    cron.schedule(config.app.cronSchedule, async () => {
      if (this.isRunning) {
        logger.warn("上一个任务还在执行中，跳过本次执行");
        return;
      }

      this.isRunning = true;
      try {
        await this.executeTask();
      } catch (error) {
        logger.error("定时任务执行失败:", error);
      } finally {
        this.isRunning = false;
      }
    });

    // 立即执行一次（可选）
    // this.executeTask();
  }

  async executeTask() {
    logger.info("开始执行群发任务...");

    try {
      // 1. 获取最新未发送的消息
      const message = await messageService.getLatestUnsentMessage();

      if (!message) {
        logger.info("没有需要发送的消息");
        return;
      }

      // 2. 发送消息到所有客户群
      const results = await wechatService.broadcastMessage(
        message.post_text_content,
        message.wx_url_link
      );

      // 3. 标记消息为已发送
      await messageService.markMessageAsSent(message.id);

      // 4. 记录发送日志
      await messageService.logSendResult(message.id, results);

      const successCount = results.filter((r) => r.success).length;
      logger.info(`群发任务完成: 成功发送到${successCount}个群`);
    } catch (error) {
      logger.error("群发任务执行失败:", error);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`收到${signal}信号，开始优雅关闭...`);

      try {
        // 等待当前任务完成
        while (this.isRunning) {
          logger.info("等待当前任务完成...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // 关闭数据库连接
        await db.close();

        logger.info("应用已优雅关闭");
        process.exit(0);
      } catch (error) {
        logger.error("关闭过程中出现错误:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

// 启动应用
const app = new App();
app.init().catch((error) => {
  logger.error("应用启动失败:", error);
  process.exit(1);
});

module.exports = app;
