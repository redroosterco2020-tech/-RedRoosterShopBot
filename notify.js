const db = require('./db');
const { MENU } = require('./keyboards');

function register(bot) {
  bot.hears(MENU.NOTIFY, ctx => {
    const outOfStock = db.getProducts().filter(p => p.stock === 0);
    if (!outOfStock.length) {
      return ctx.reply('در حال حاضر همه‌ی محصولات موجود هستند. با انتخاب یک محصول ناموجود از بخش «🥚 محصولات» یا «🛍 فروشگاه» می‌توانید برای اطلاع از موجود شدن آن ثبت‌نام کنید.');
    }
    const lines = outOfStock.map(p => `• ${p.name}`).join('\n');
    ctx.reply(
      '🔔 اطلاع‌رسانی موجودی\n\n' +
      'محصولات ناموجود فعلی:\n' + lines +
      '\n\nبرای هر کدام که مایل بودید، از صفحه‌ی همان محصول روی دکمه‌ی «🔔 اطلاع بده وقتی موجود شد» بزنید تا به‌محض موجود شدن به شما پیام دهیم.'
    );
  });

  bot.action(/^notify:sub:(.+)$/, async ctx => {
    await ctx.answerCbQuery('ثبت شد ✅');
    const product = db.getProductById(ctx.match[1]);
    if (!product) return;
    db.subscribe(product.id, ctx.chat.id);
    ctx.reply(`🔔 باشه! به‌محض موجود شدن «${product.name}» به شما اطلاع می‌دهیم.`);
  });
}

async function notifyRestock(bot, product) {
  const subscribers = db.popSubscribers(product.id);
  for (const chatId of subscribers) {
    bot.telegram.sendMessage(chatId, `🎉 «${product.name}» دوباره موجود شد!`).catch(() => {});
  }
}

module.exports = { register, notifyRestock };
