const db = require('./db');
const { MENU } = require('./keyboards');
const { formatPrice, statusLabel } = require('./format');

function register(bot) {
  bot.hears(MENU.TRACK, ctx => {
    ctx.session.awaiting = 'tracking';
    ctx.reply('🚚 لطفاً کد سفارش خود را ارسال کنید (مثال: SB-A2K9X):');
  });
}

async function handleTrackingText(ctx, text) {
  const order = db.getOrderByCode(text);
  if (!order) {
    await ctx.reply('❌ سفارشی با این کد پیدا نشد. لطفاً کد را بررسی و دوباره ارسال کنید.');
    return true;
  }
  await ctx.reply(
    `🔖 سفارش ${order.code}\n` +
    `📦 ${order.productName} × ${order.qty} ${order.unit}\n` +
    `💰 ${formatPrice(order.totalPrice)}\n` +
    `📅 تاریخ ثبت: ${order.createdAtJalali || ''}\n` +
    `📍 وضعیت فعلی: ${statusLabel(order.status)}`
  );
  return true;
}

module.exports = { register, handleTrackingText };
