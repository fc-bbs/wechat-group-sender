// 在项目根目录创建 test.js
const messageService = require("./src/services/messageService");
const wechatService = require("./src/services/wechatService");

async function test() {
  try {
    // 测试获取群列表
    const groups = await wechatService.getGroupChatList();
    console.log("客户群列表:", groups);

    // 测试发送消息
    if (groups.length > 0) {
      await wechatService.sendMessageToGroup(
        groups[0].chat_id,
        "这是一条测试消息",
        "https://example.com"
      );
    }
  } catch (error) {
    console.error("测试失败:", error);
  }
}

test();
