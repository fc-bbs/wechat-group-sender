const db = require("../database/db");
const logger = require("../utils/logger");

class MessageService {
  /**
   * 获取最新的未发送消息
   */
  async getLatestUnsentMessage() {
    try {
      const sql = `
        SELECT id, wx_url_link, post_text_content, post_time
        FROM post_message 
        WHERE is_sent = 0 OR is_sent IS NULL
        ORDER BY post_time DESC 
        LIMIT 6
      `;

      const rows = await db.query(sql);

      if (rows.length === 0) {
        logger.info("没有找到未发送的消息");
        return null;
      }

      if (rows.length === 1) {
        logger.info(
          `找到一条未发送的消息: ${rows[0].post_text_content} + ${rows[0].wx_url_link}`
        );
        return rows[0];
      }

      // 拼接多条消息
      const combinedMessage = this.combineMultipleMessages(rows);

      logger.info(`找到${rows.length}条未发送的消息`);

      return {
        id: rows.map((row) => row.id),
        post_text_content: combinedMessage.content,
        wx_url_link: null,
        post_time: rows[0].post_time,
        message_count: rows.length,
      };
    } catch (error) {
      logger.error("获取最新消息失败:", error);
      throw error;
    }
  }

  /**
   * 标记消息为已发送
   */
  async markMessageAsSent(messageId) {
    try {
      const sql = `
        UPDATE post_message 
        SET is_sent = 1, sent_time = NOW() 
        WHERE id = ?
      `;

      await db.query(sql, [messageId]);
      logger.info(`消息已标记为已发送: ID=${messageId}`);
    } catch (error) {
      logger.error(`标记消息失败 (ID: ${messageId}):`, error);
      throw error;
    }
  }

  combineMultipleMessages(messages) {
    const parts = [];

    messages.forEach((msg) => {
      let content = msg.post_text_content || "";
      if (content.length > 20) {
        content = content.substring(0, 20) + "...";
      }
      const link = msg.wx_url_link ? `\n ${msg.wx_url_link}` : "";
      parts.push(`${content} ${link}`);
    });

    const combinedContent = parts.join("\n\n");

    return {
      content: combinedContent,
      links: [],
    };
  }

  /**
   * 记录发送日志
   */
  async logSendResult(messageId, results) {
    try {
      const successCount = results.filter((r) => r.success).length;
      const totalCount = results.length;

      // const sql = `
      //   INSERT INTO send_log (message_id, total_groups, success_count, send_time, results)
      //   VALUES (?, ?, ?, NOW(), ?)
      // `;

      // await db.query(sql, [
      //   messageId,
      //   totalCount,
      //   successCount,
      //   JSON.stringify(results),
      // ]);

      logger.info(
        `发送日志已记录: 消息ID=${messageId}, 成功=${successCount}/${totalCount}`
      );
    } catch (error) {
      logger.error("记录发送日志失败:", error);
      // 这里不抛出错误，避免影响主流程
    }
  }
}

module.exports = new MessageService();
