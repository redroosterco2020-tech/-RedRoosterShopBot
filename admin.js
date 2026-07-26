const db = require('./db');
const config = require('./config');
const { formatPrice, statusLabel, STATUS_LABELS } = require('./format');
const { notifyRestock } = require('./notify');

function requireAdmin(ctx) {
  if (!config.isAdmin(ctx.from?.id)) {
    ctx.reply('⛔️ این دستور فقط برای مدیر ربات در دسترس است.');
    return false;
  }
  return true;
}

function register(bot) {
  bot.command('admin', ctx => {
    if (!requireAdmin(ctx)) return;
    ctx.reply(
      '🛠 دستورات مدیریتی:\n\n' +
      '/products — لیست محصولات به‌همراه شناسه و موجودی\n' +
      '/setstock <شناسه> <تعداد> — تغییر موجودی محصول\n' +
      '/setprice <شناسه> <قیمت> — تغییر قیمت محصول (به تومان)\n' +
      '/orders — لیست سفارش‌های در انتظار\n' +
      '/setstatus <کد سفارش> <status> — تغییر وضعیت سفارش\n' +
      `   status یکی از: ${Object.keys(STATUS_LABELS).join(' | ')}\n` +
      '/broadcast <متن> — ارسال پیام به تمام مشتریانی که تاکنون سفارش ثبت کرده‌اند'
    );
  });

  bot.command('products', ctx => {
    if (!requireAdmin(ctx)) return;
    const products = db.getProducts();
    const lines = products.map(p => `${p.id} — ${p.name} — موجودی: ${p.stock} — ${formatPrice(p.price)}`);
    ctx.reply('📋 محصولات:\n\n' + lines.join('\n'));
  });

  bot.command('setprice', ctx => {
    if (!requireAdmin(ctx)) return;
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const [, id, priceStr] = parts;
    const price = parseInt(priceStr, 10);
    if (!id || !Number.isInteger(price) || price < 0) {
      return ctx.reply('فرمت درست: /setprice <شناسه محصول> <قیمت به تومان>\nمثال: /setprice rooster 400000');
    }
    const product = db.getProductById(id);
    if (!product) return ctx.reply('محصولی با این شناسه یافت نشد. از /products استفاده کنید.');
    db.updateProduct(id, { price });
    ctx.reply(`✅ قیمت «${product.name}» به ${formatPrice(price)} به‌روزرسانی شد.`);
  });

  bot.command('setstock', async ctx => {
    if (!requireAdmin(ctx)) return;
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const [, id, qtyStr] = parts;
    const qty = parseInt(qtyStr, 10);
    if (!id || !Number.isInteger(qty) || qty < 0) {
      return ctx.reply('فرمت درست: /setstock <شناسه محصول> <تعداد>\nمثال: /setstock rooster 12');
    }
    const product = db.getProductById(id);
    if (!product) return ctx.reply('محصولی با این شناسه یافت نشد. از /products استفاده کنید.');
    const wasOutOfStock = product.stock === 0;
    db.updateProduct(id, { stock: qty });
    ctx.reply(`✅ موجودی «${product.name}» به ${qty} به‌روزرسانی شد.`);
    if (wasOutOfStock && qty > 0) {
      await notifyRestock(bot, product);
    }
  });

  bot.command('orders', ctx => {
    if (!requireAdmin(ctx)) return;
    const pending = db.getOrders().filter(o => o.status === 'pending' || o.status === 'ready');
    if (!pending.length) return ctx.reply('سفارش در انتظاری وجود ندارد.');
    const lines = pending.map(o =>
      `${o.code} — ${o.productName} × ${o.qty} — ${o.username} — ${statusLabel(o.status)}`
    );
    ctx.reply('📦 سفارش‌های در جریان:\n\n' + lines.join('\n'));
  });

  bot.command('setstatus', async ctx => {
    if (!requireAdmin(ctx)) return;
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const [, code, status] = parts;
    if (!code || !STATUS_LABELS[status]) {
      return ctx.reply(`فرمت درست: /setstatus <کد سفارش> <status>\nstatus یکی از: ${Object.keys(STATUS_LABELS).join(' | ')}`);
    }
    await updateOrderStatusAndNotify(ctx, code, status);
  });

  bot.action(/^admin:status:(.+):(.+)$/, async ctx => {
    if (!config.isAdmin(ctx.from?.id)) return ctx.answerCbQuery('⛔️ غیرمجاز');
    await ctx.answerCbQuery();
    const [, code, status] = ctx.match;
    await updateOrderStatusAndNotify(ctx, code, status);
  });

  bot.command('broadcast', ctx => {
    if (!requireAdmin(ctx)) return;
    const text = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();
    if (!text) return ctx.reply('فرمت درست: /broadcast <متن پیام>');
    const orders = db.getOrders();
    const uniqueUserIds = [...new Set(orders.map(o => o.userId))];
    if (!uniqueUserIds.length) return ctx.reply('هنوز مشتری‌ای ثبت نشده است.');
    uniqueUserIds.forEach(userId => {
      ctx.telegram.sendMessage(userId, `📢 ${text}`).catch(() => {});
    });
    ctx.reply(`✅ پیام برای ${uniqueUserIds.length} مشتری ارسال شد.`);
  });
}

async function updateOrderStatusAndNotify(ctx, code, status) {
  const order = db.updateOrderStatus(code, status);
  if (!order) return ctx.reply('سفارشی با این کد پیدا نشد.');
  await ctx.reply(`✅ وضعیت سفارش ${code} به «${statusLabel(status)}» تغییر کرد.`);
  ctx.telegram.sendMessage(
    order.userId,
    `📦 وضعیت سفارش ${order.code} به‌روزرسانی شد:\n${statusLabel(status)}`
  ).catch(() => {});
}

module.exports = { register };
