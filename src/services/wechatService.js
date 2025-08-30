const axios = require("axios");
const config = require("../../config/config");
const logger = require("../utils/logger");

class WechatService {
  constructor() {
    this.baseUrl = config.wechat.baseUrl;
    this.corpId = config.wechat.corpId;
    this.appSecret = config.wechat.appSecret;
    this.agentId = config.wechat.agentId;
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 获取访问令牌
   */
  async getAccessToken() {
    try {
      // 如果token未过期，直接返回
      if (this.accessToken && Date.now() < this.tokenExpireTime) {
        return this.accessToken;
      }

      const url = `${this.baseUrl}/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.appSecret}`;
      const response = await axios.get(url);
      if (response.data.errcode !== 0) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }

      this.accessToken = response.data.access_token;
      // 提前5分钟过期
      this.tokenExpireTime =
        Date.now() + (response.data.expires_in - 300) * 1000;

      logger.info("access_token获取成功");
      return this.accessToken;
    } catch (error) {
      logger.error("获取access_token失败:", error);
      throw error;
    }
  }

  /**
   * 获取客户群列表
   */
  async getGroupChatList() {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/cgi-bin/externalcontact/groupchat/list?access_token=${accessToken}`;

      const response = await axios.post(url, {
        status_filter: 0,
        owner_filter: {
          userid_list: [], // 空数组表示获取所有群主的群
        },
        limit: 1000,
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取群聊列表失败: ${response.data.errmsg}`);
      }

      logger.info(`获取到${response.data.group_chat_list.length}个客户群`);
      return response.data.group_chat_list;
    } catch (error) {
      logger.error("获取客户群列表失败:", error);
      throw error;
    }
  }

  /**
   * 获取群聊详情
   */
  async getGroupChatDetail(chatId) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/cgi-bin/externalcontact/groupchat/get?access_token=${accessToken}`;

      const response = await axios.post(url, {
        chat_id: chatId,
      });

      if (response.data.errcode !== 0) {
        throw new Error(`获取群聊详情失败: ${response.data.errmsg}`);
      }

      return response.data.group_chat;
    } catch (error) {
      logger.error(`获取群聊详情失败 (chatId: ${chatId}):`, error);
      throw error;
    }
  }

  /**
   * 发送消息到客户群
   */
  async sendMessageToGroup(chatId, content, urlLink) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.baseUrl}/cgi-bin/externalcontact/add_msg_template`;

      // 组合消息内容
      const messageContent = urlLink
        ? `${content}\n\n🔗 查看详情：${urlLink}`
        : content;

      const messageData = {
        chat_type: "group",
        external_userid: [chatId],
        text: {
          content: messageContent,
        },
        msgtype: "text",
      };

      const response = await axios.post(url, messageData, {
        params: {
          access_token: accessToken,
        },
      });

      if (response.data.errcode !== 0) {
        throw new Error(`发送消息失败: ${response.data.errmsg}`);
      }

      logger.info(`消息发送成功 (chatId: ${chatId})`);
      return response.data;
    } catch (error) {
      logger.error(`发送消息失败 (chatId: ${chatId}):`, error);
      throw error;
    }
  }

  /**
   * 批量发送消息到所有客户群
   */
  async broadcastMessage(content, urlLink) {
    try {
      const groupList = await this.getGroupChatList();
      const results = [];

      for (const group of groupList) {
        try {
          // 添加延迟避免频率限制
          if (results.length > 0) {
            await this.sleep(1000);
          }

          const result = await this.sendMessageToGroup(
            group.chat_id,
            content,
            urlLink
          );

          results.push({
            chatId: group.chat_id,
            success: true,
            result: result,
          });
        } catch (error) {
          results.push({
            chatId: group.chat_id,
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
