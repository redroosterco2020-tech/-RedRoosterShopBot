const db = require('./db');
const config = require('./config');
const { Markup } = require('telegraf');
const { formatPrice, statusLabel, STATUS_LABELS } = require('./format');
const { notifyRestock } = require('./notify');
const { CATEGORIES } = require('./shop');

function requireAdmin(ctx) {
  if (!config.isAdmin(ctx.from?.id)) {
    ctx.reply('⛔️ این دستور فقط برای مدیر ربات در دسترس است.');
    return false;
  }
  return true;
}

function nextProductId(existing) {
  let n = existing.length + 1;
  let id = 'p' + n;
  while (existing.some(p => p.id === id)) { n++; id = 'p' + n; }
  return id;
}

function register(bot) {
  bot.command('admin', ctx => {
    if (!requireAdmin(ctx)) return;
    ctx.reply(
      '🛠 دستورات مدیریتی:\n\n' +
      '/products — لیست محصولات به‌همراه شناسه و موجودی\n' +
      '/addproduct — افزودن محصول جدید (به‌صورت گام‌به‌گام)\n' +
      '/setstock <شناسه> <تعداد> — تغییر موجودی محصول\n' +
      '/setprice <شناسه> <قیمت> — تغییر قیمت محصول (به تومان)\n' +
      '/setsocial <whatsapp|telegram|instagram> <لینک> — تغییر لینک شبکه اجتماعی\n' +
      '/setabout <متن> — تغییر متن «درباره ما»\n' +
      '/setrules <متن> — تغییر متن «قوانین»\n' +
      '/sethours <متن> — تغییر متن «ساعات کاری»\n' +
      '/setlocationtext <متن> — تغییر متن آدرس\n' +
      '/setlocationmap <لینک> — تغییر لینک نقشه\n' +
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

  bot.command('addproduct', ctx => {
    if (!requireAdmin(ctx)) return;
    ctx.session.newProduct = { step: 'name' };
    ctx.reply('📝 نام محصول جدید را وارد کنید:');
  });

  bot.action(/^addprod:cat:(.+)$/, async ctx => {
    if (!config.isAdmin(ctx.from?.id)) return ctx.answerCbQuery('⛔️ غیرمجاز');
    await ctx.answerCbQuery();
    const draft = ctx.session.newProduct;
    if (!draft || draft.step !== 'category') return;
    const cat = CATEGORIES.find(c => c.key === ctx.match[1]);
    if (!cat) return;
    draft.category = cat.key;
    draft.categoryLabel = cat.label;
    draft.step = 'price';
    ctx.reply('💰 قیمت محصول را به تومان وارد کنید (فقط عدد):');
  });

  bot.action('addprod:confirm', async ctx => {
    if (!config.isAdmin(ctx.from?.id)) return ctx.answerCbQuery('⛔️ غیرمجاز');
    await ctx.answerCbQuery();
    const draft = ctx.session.newProduct;
    if (!draft || draft.step !== 'confirm') return;
    const products = db.getProducts();
    const id = nextProductId(products);
    const newProduct = {
      id, name: draft.name, category: draft.category, categoryLabel: draft.categoryLabel,
      unit: draft.unit, price: draft.price, stock: draft.stock, isNew: true, desc: draft.desc || '',
    };
    products.push(newProduct);
    db.saveProducts(products);
    ctx.session.newProduct = null;
    await ctx.reply(`✅ محصول «${newProduct.name}» با شناسه «${id}» اضافه شد.\nاز همین شناسه برای /setstock و /setprice استفاده کنید.`);
  });

  bot.action('addprod:cancel', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.newProduct = null;
    ctx.reply('❌ افزودن محصول لغو شد.');
  });

  bot.command('setabout', ctx => {
    if (!requireAdmin(ctx)) return;
    const text = ctx.message.text.replace(/^\/setabout\s*/, '').trim();
    if (!text) return ctx.reply('فرمت درست: /setabout <متن>\nمثال: /setabout سیلو، تأمین‌کننده مستقیم تخم‌مرغ و جوجه محلی است.');
    const settings = db.getSettings();
    settings.about = text;
    db.saveSettings(settings);
    ctx.reply('✅ متن «درباره ما» به‌روزرسانی شد.');
  });

  bot.command('setrules', ctx => {
    if (!requireAdmin(ctx)) return;
    const text = ctx.message.text.replace(/^\/setrules\s*/, '').trim();
    if (!text) return ctx.reply('فرمت درست: /setrules <متن>');
    const settings = db.getSettings();
    settings.rules = text;
    db.saveSettings(settings);
    ctx.reply('✅ متن «قوانین» به‌روزرسانی شد.');
  });

  bot.command('sethours', ctx => {
    if (!requireAdmin(ctx)) return;
    const text = ctx.message.text.replace(/^\/sethours\s*/, '').trim();
    if (!text) return ctx.reply('فرمت درست: /sethours <متن>\nمثال: /sethours شنبه تا چهارشنبه ۸ تا ۲۰');
    const settings = db.getSettings();
    settings.workingHours = text;
    db.saveSettings(settings);
    ctx.reply('✅ متن «ساعات کاری» به‌روزرسانی شد.');
  });

  bot.command('setlocationtext', ctx => {
    if (!requireAdmin(ctx)) return;
    const text = ctx.message.text.replace(/^\/setlocationtext\s*/, '').trim();
    if (!text) return ctx.reply('فرمت درست: /setlocationtext <متن آدرس>');
    const settings = db.getSettings();
    settings.locationText = text;
    db.saveSettings(settings);
    ctx.reply('✅ متن آدرس به‌روزرسانی شد.');
  });

  bot.command('setlocationmap', ctx => {
    if (!requireAdmin(ctx)) return;
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const link = parts[1];
    if (!link) return ctx.reply('فرمت درست: /setlocationmap <لینک گوگل مپ>\nمثال: /setlocationmap https://maps.google.com/?q=35.6892,51.3890');
    const settings = db.getSettings();
    settings.locationMapUrl = link;
    db.saveSettings(settings);
    ctx.reply('✅ لینک نقشه به‌روزرسانی شد.');
  });

  bot.command('setsocial', ctx => {
    if (!requireAdmin(ctx)) return;
    const parts = ctx.message.text.split(' ').filter(Boolean);
    const [, platform, link] = parts;
    const validPlatforms = ['whatsapp', 'telegram', 'instagram'];
    if (!platform || !validPlatforms.includes(platform) || !link) {
      return ctx.reply(
        'فرمت درست: /setsocial <whatsapp|telegram|instagram> <لینک>\n' +
        'مثال: /setsocial whatsapp https://wa.me/989123456789\n' +
        'مثال: /setsocial telegram https://t.me/your_channel'
      );
    }
    const settings = db.getSettings();
    if (!settings.social) settings.social = {};
    const key = platform === 'telegram' ? 'telegramChannel' : platform;
    settings.social[key] = link;
    db.saveSettings(settings);
    ctx.reply(`✅ لینک ${platform === 'telegram' ? 'کانال تلگرام' : platform} به‌روزرسانی شد.`);
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

// این تابع در روتر متنیِ مرکزی (bot.js) فراخوانی می‌شود؛ اگر true برگرداند یعنی پیام مصرف شده است.
async function handleAddProductText(ctx, text) {
  const draft = ctx.session.newProduct;
  if (!draft) return false;
  if (!config.isAdmin(ctx.from?.id)) { ctx.session.newProduct = null; return false; }

  if (draft.step === 'name') {
    if (!text.trim()) { await ctx.reply('لطفاً یک نام معتبر وارد کنید.'); return true; }
    draft.name = text.trim();
    draft.step = 'category';
    await ctx.reply('🗂 دسته این محصول را انتخاب کنید:', Markup.inlineKeyboard(
      CATEGORIES.map(c => [Markup.button.callback(c.label, `addprod:cat:${c.key}`)])
    ));
    return true;
  }

  if (draft.step === 'price') {
    const price = parseInt(text.trim(), 10);
    if (!Number.isInteger(price) || price < 0) { await ctx.reply('لطفاً یک عدد صحیح برای قیمت وارد کنید.'); return true; }
    draft.price = price;
    draft.step = 'stock';
    await ctx.reply('📦 موجودی اولیه را وارد کنید (عدد):');
    return true;
  }

  if (draft.step === 'stock') {
    const stock = parseInt(text.trim(), 10);
    if (!Number.isInteger(stock) || stock < 0) { await ctx.reply('لطفاً یک عدد صحیح برای موجودی وارد کنید.'); return true; }
    draft.stock = stock;
    draft.step = 'unit';
    await ctx.reply('📏 واحد شمارش را وارد کنید (مثلاً «قطعه» یا «شانه (۳۰ عددی)»):');
    return true;
  }

  if (draft.step === 'unit') {
    if (!text.trim()) { await ctx.reply('لطفاً واحد شمارش را وارد کنید.'); return true; }
    draft.unit = text.trim();
    draft.step = 'desc';
    await ctx.reply('📝 یک توضیح کوتاه برای محصول بنویسید (یا بنویسید «ندارد»):');
    return true;
  }

  if (draft.step === 'desc') {
    draft.desc = (text.trim() === 'ندارد') ? '' : text.trim();
    draft.step = 'confirm';
    await ctx.reply(
      `📋 بررسی محصول جدید:\n\n` +
      `نام: ${draft.name}\n` +
      `دسته: ${draft.categoryLabel}\n` +
      `قیمت: ${formatPrice(draft.price)}\n` +
      `موجودی: ${draft.stock} ${draft.unit}\n` +
      `توضیح: ${draft.desc || '—'}\n\n` +
      `ثبت شود؟`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ ثبت محصول', 'addprod:confirm')],
        [Markup.button.callback('❌ انصراف', 'addprod:cancel')],
      ])
    );
    return true;
  }

  return false;
}

module.exports = { register, handleAddProductText };
