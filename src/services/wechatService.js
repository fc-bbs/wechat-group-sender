const axios = require("axios");
const config = require("../../config/config");
const logger = require("../utils/logger");

class WechatService {
  constructor() {
    this.baseUrl = config.wechat.baseUrl;
    this.app_key = config.wechat.appKey;
    this.app_secret = config.wechat.appSecret;
    this.guid = config.wechat.guid;
  }

  /**
   * 获取客户群列表
   */
  async getGroupChatList() {
    try {
      const url = `${this.baseUrl}`;

      const response = await axios.post(url, {
        app_key: `${this.app_key}`,
        app_secret: `${this.app_secret}`,
        path: "/room/get_room_list",
        data: {
          guid: `${this.guid}`,
          start_index: 0,
          limit: 10,
        },
      });

      if (response.data.error_code !== 0) {
        throw new Error(`获取群聊列表失败: ${response.data.error_message}`);
      }

      const roomIds = response.data.data.roomdata.datas.map(
        (room) => `R:${room.roomid}`
      );

      logger.info(`获取到${response.data.data.total}个客户群`);

      return roomIds;
    } catch (error) {
      logger.error("获取客户群列表失败:", error);
      throw error;
    }
  }

  /**
   * 发送消息到客户群
   */
  async sendMessageToGroup(conversationId, content) {
    try {
      const url = `${this.baseUrl}`;

      const messageData = {
        app_key: this.app_key,
        app_secret: this.app_secret,
        path: "/msg/send_text",
        data: {
          guid: this.guid,
          conversation_id: conversationId,
          content: content,
        },
      };

      const response = await axios.post(url, messageData);

      if (response.data.error_code !== 0) {
        throw new Error(`发送消息失败: ${response.data.error_message}`);
      }

      logger.info(`消息发送成功 (conversationId: ${conversationId})`);
      return response.data;
    } catch (error) {
      logger.error(`发送消息失败 (conversationId: ${conversationId}):`, error);
      throw error;
    }
  }

  /**
   * 批量发送消息到所有客户群
   */
  async broadcastMessage(content) {
    try {
      const roomIds = await this.getGroupChatList();
      const results = [];

      for (const conversationId of roomIds) {
        try {
          // 添加延迟避免频率限制
          if (results.length > 0) {
            await this.sleep(1000);
          }

          const result = await this.sendMessageToGroup(conversationId, content);

          results.push({
            conversationId: conversationId,
            success: true,
            result: result,
          });
        } catch (error) {
          results.push({
            conversationId: conversationId,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      logger.info(
        `群发完成: 成功${successCount}个，失败${
          results.length - successCount
        }个`
      );

      return results;
    } catch (error) {
      logger.error("批量发送消息失败:", error);
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new WechatService();
