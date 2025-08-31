const db = require("../database/db");
const logger = require("../utils/logger");

class MessageService {
  /**
   * 获取最新的未发送消息
   */
  async getLatestUnsentMessage() {
    try {
      const sql = `
        SELECT wx_url_link, post_text_content, post_time
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
        id: rows.map((rows) => rows.id),
        post_text_content: combinedMessage.content,
        wx_url_link: combinedMessage.links,
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
    let combinedContent = `今日资讯 (${messages.length}条)\n\n`;
    let combinedLinks = [];

    messages.forEach((message, index) => {
      const number = index + 1;

      // 提取帖子内容，限制长度避免消息过长
      let content = message.post_text_content || "";
      if (content.length > 20) {
        content = content.substring(0, 20) + "...";
      }

      combinedContent += `${content}\n`;

      // 收集短链接
      if (message.wx_url_link) {
        combinedLinks.push(message.wx_url_link);
      }
    });

    combinedContent += `\n 点击链接查看详情`;

    return {
      content: combinedContent,
      links: combinedLinks,
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

  /**
   * 获取发送统计
   */
  async getSendStats(days = 7) {
    try {
      const sql = `
        SELECT 
          DATE(send_time) as date,
          COUNT(*) as message_count,
          SUM(total_groups) as total_sends,
          SUM(success_count) as success_sends
        FROM send_log 
        WHERE send_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(send_time)
        ORDER BY date DESC
      `;

      const rows = await db.query(sql, [days]);
      return rows;
    } catch (error) {
      logger.error("获取发送统计失败:", error);
      throw error;
    }
  }
}

module.exports = new MessageService();
