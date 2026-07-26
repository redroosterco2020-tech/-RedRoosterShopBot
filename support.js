const db = require('./db');
const config = require('./config');
const { MENU } = require('./keyboards');

function register(bot) {
  bot.hears(MENU.SUPPORT, ctx => {
    ctx.session.awaiting = 'support';
    ctx.reply('💬 پیام خود را بنویسید تا مستقیم برای پشتیبانی ارسال شود. (متن یا عکس)');
  });

  bot.on('message', async (ctx, next) => {
    const isAdminChat = config.isAdmin(ctx.from?.id) && ctx.chat.type === 'private';
    const replyTo = ctx.message.reply_to_message;
    if (isAdminChat && replyTo) {
      const link = db.resolveSupportMessage(replyTo.message_id);
      if (link) {
        const replyText = ctx.message.text || ctx.message.caption || '';
        if (replyText) {
          await ctx.telegram.sendMessage(link.chatId, `💬 پاسخ پشتیبانی:\n${replyText}`).catch(() => {});
          await ctx.reply('✅ پاسخ برای کاربر ارسال شد.');
        }
        return;
      }
    }
    return next();
  });
}

async function handleSupportMessage(ctx) {
  const userLabel = ctx.from.username ? '@' + ctx.from.username : (ctx.from.first_name || 'کاربر');
  for (const adminId of config.adminIds) {
    try {
      const forwarded = await ctx.telegram.forwardMessage(adminId, ctx.chat.id, ctx.message.message_id);
      db.linkSupportMessage(forwarded.message_id, ctx.chat.id, userLabel);
      await ctx.telegram.sendMessage(
        adminId,
        `☝️ پیام پشتیبانی از ${userLabel} (id: ${ctx.from.id})\nبرای پاسخ، روی همین پیام Reply بزنید.`
      );
    } catch (e) { /* ignore per-admin failure */ }
  }
  await ctx.reply('✅ پیام شما برای پشتیبانی ارسال شد. به‌زودی پاسخ داده می‌شود.');
}

module.exports = { register, handleSupportMessage };
