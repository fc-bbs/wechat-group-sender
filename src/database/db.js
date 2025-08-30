const mysql = require("mysql2/promise");
const config = require("../../config/config");
const logger = require("../utils/logger");

class Database {
  constructor() {
    this.config = config.database;
    this.pool = null;
  }

  async init() {
    try {
      this.pool = mysql.createPool({
        ...this.config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      logger.info("数据库连接池初始化成功");
    } catch (error) {
      logger.error("数据库连接失败:", error);
      throw error;
    }
  }

  async getConnection() {
    return await this.pool.getConnection();
  }

  async query(sql, params = []) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info("数据库连接池已关闭");
    }
  }
}

module.exports = new Database();
