const { Telegraf, session } = require('telegraf');
const config = require('./config');

if (!config.token) {
  console.error('❌ متغیر BOT_TOKEN تنظیم نشده است. فایل .env را بر اساس .env.example بسازید.');
  process.exit(1);
}

const bot = new Telegraf(config.token);
bot.use(session());
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

const mainMenu = require('./mainMenu');
const shop = require('./shop');
const products = require('./products');
const priceToday = require('./priceToday');
const order = require('./order');
const tracking = require('./tracking');
const notify = require('./notify');
const support = require('./support');
const info = require('./info');
const admin = require('./admin');

mainMenu.register(bot);
shop.register(bot);
products.register(bot);
priceToday.register(bot);
order.register(bot);
tracking.register(bot);
notify.register(bot);
support.register(bot);
info.register(bot);
admin.register(bot);

bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return next();

  const consumedByOrder = await order.handleOrderText(ctx, text);
  if (consumedByOrder) return;

  const consumedByAddProduct = await admin.handleAddProductText(ctx, text);
  if (consumedByAddProduct) return;

  const awaiting = ctx.session.awaiting;
  if (awaiting === 'search') {
    ctx.session.awaiting = null;
    return shop.handleSearchText(ctx, text);
  }
  if (awaiting === 'tracking') {
    ctx.session.awaiting = null;
    return tracking.handleTrackingText(ctx, text);
  }
  if (awaiting === 'support') {
    ctx.session.awaiting = null;
    return support.handleSupportMessage(ctx);
  }

  return next();
});

bot.on('photo', async (ctx, next) => {
  if (ctx.session?.awaiting === 'support') {
    ctx.session.awaiting = null;
    return support.handleSupportMessage(ctx);
  }
  return next();
});

bot.catch((err, ctx) => {
  console.error(`⚠️ خطا برای ${ctx.updateType}:`, err);
  try { ctx.reply('متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید یا /menu را بزنید.'); } catch (e) { /* noop */ }
});

if (require.main === module) {
  bot.launch().then(() => {
    console.log('🤖 ربات فروش سیلو با موفقیت اجرا شد.');
  });
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = bot;
