const db = require('./db');
const config = require('./config');
const { MENU, productListKeyboard, orderConfirmKeyboard, adminOrderKeyboard, mainMenuKeyboard } = require('./keyboards');
const { formatPrice } = require('./format');
const { generateOrderCode } = require('./orderCode');
const { todayJalaliDisplay } = require('./jalali');

function startOrderFor(ctx, productId) {
  const product = db.getProductById(productId);
  if (!product) return ctx.reply('این محصول یافت نشد.');
  if (product.stock <= 0) return ctx.reply('❌ متأسفانه این محصول در حال حاضر موجود نیست.');
  ctx.session.order = { step: 'quantity', productId };
  ctx.reply(
    `تعداد «${product.name}» مورد نظر خود را وارد کنید (${product.unit}):\nموجودی فعلی: ${product.stock}`
  );
}

function register(bot) {
  bot.hears(MENU.ORDER, ctx => {
    const inStock = db.getProducts().filter(p => p.stock > 0);
    if (!inStock.length) return ctx.reply('در حال حاضر محصولی برای سفارش موجود نیست.');
    ctx.reply('📦 ثبت سفارش — محصول مورد نظر را انتخاب کنید:', productListKeyboard(inStock, 'orderpick'));
  });

  bot.action(/^order:start:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    startOrderFor(ctx, ctx.match[1]);
  });

  bot.action(/^orderpick:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    startOrderFor(ctx, ctx.match[1]);
  });

  bot.action('order:confirm', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.order;
    if (!draft || draft.step !== 'confirm') return;
    const product = db.getProductById(draft.productId);
    if (!product || product.stock < draft.qty) {
      ctx.session.order = null;
      return ctx.reply('متأسفانه موجودی این محصول کافی نیست. لطفاً دوباره تلاش کنید.', mainMenuKeyboard());
    }

    const code = generateOrderCode();
    const order = {
      code,
      userId: ctx.from.id,
      username: ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name || '',
      productId: product.id,
      productName: product.name,
      qty: draft.qty,
      unit: product.unit,
      unitPrice: product.price,
      totalPrice: product.price * draft.qty,
      city: draft.city,
      address: draft.address,
      phone: draft.phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtJalali: todayJalaliDisplay(),
    };
    db.addOrder(order);
    db.updateProduct(product.id, { stock: Math.max(0, product.stock - draft.qty) });
    ctx.session.order = null;

    await ctx.reply(
      `✅ سفارش شما با موفقیت ثبت شد!\n\n` +
      `🔖 کد سفارش: ${code}\n` +
      `این کد را برای پیگیری سفارش نگه دارید.\n\n` +
      `${product.name} × ${draft.qty} ${product.unit}\n` +
      `مبلغ کل: ${formatPrice(order.totalPrice)}`,
      mainMenuKeyboard()
    );

    const adminMsg =
      `🆕 سفارش جدید — ${code}\n` +
      `👤 ${order.username} (id: ${order.userId})\n` +
      `📦 ${product.name} × ${draft.qty} ${product.unit}\n` +
      `💰 ${formatPrice(order.totalPrice)}\n` +
      `🏙 شهر: ${draft.city}\n` +
      `🏠 آدرس: ${draft.address}\n` +
      `📞 تماس: ${draft.phone}`;
    for (const adminId of config.adminIds) {
      ctx.telegram.sendMessage(adminId, adminMsg, adminOrderKeyboard(code)).catch(() => {});
    }
  });

  bot.action('order:cancel', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.order = null;
    ctx.reply('❌ ثبت سفارش لغو شد.', mainMenuKeyboard());
  });
}

async function handleOrderText(ctx, text) {
  const draft = ctx.session.order;
  if (!draft) return false;

  if (draft.step === 'quantity') {
    const qty = parseInt(text.trim(), 10);
    const product = db.getProductById(draft.productId);
    if (!product) { ctx.session.order = null; await ctx.reply('این محصول دیگر در دسترس نیست.'); return true; }
    if (!Number.isInteger(qty) || qty <= 0) {
      await ctx.reply('لطفاً یک عدد صحیح و مثبت برای تعداد وارد کنید.');
      return true;
    }
    if (qty > product.stock) {
      await ctx.reply(`موجودی کافی نیست. حداکثر تعداد قابل سفارش: ${product.stock}`);
      return true;
    }
    draft.qty = qty;
    draft.step = 'city';
    await ctx.reply('🏙 نام شهر خود را وارد کنید:');
    return true;
  }

  if (draft.step === 'city') {
    if (!text.trim()) { await ctx.reply('لطفاً نام شهر را وارد کنید.'); return true; }
    draft.city = text.trim();
    draft.step = 'address';
    await ctx.reply('🏠 آدرس کامل خود را وارد کنید:');
    return true;
  }

  if (draft.step === 'address') {
    if (!text.trim()) { await ctx.reply('لطفاً آدرس را وارد کنید.'); return true; }
    draft.address = text.trim();
    draft.step = 'phone';
    await ctx.reply('📞 شماره تماس خود را وارد کنید:');
    return true;
  }

  if (draft.step === 'phone') {
    const phone = text.trim();
    if (!/^[0-9+\s-]{7,15}$/.test(phone)) {
      await ctx.reply('شماره تماس معتبر نیست. لطفاً دوباره وارد کنید (فقط عدد).');
      return true;
    }
    draft.phone = phone;
    draft.step = 'confirm';
    const product = db.getProductById(draft.productId);
    const total = product.price * draft.qty;
    await ctx.reply(
      `📋 خلاصه سفارش:\n\n` +
      `محصول: ${product.name}\n` +
      `تعداد: ${draft.qty} ${product.unit}\n` +
      `مبلغ کل: ${formatPrice(total)}\n` +
      `شهر: ${draft.city}\n` +
      `آدرس: ${draft.address}\n` +
      `تماس: ${draft.phone}\n\n` +
      `آیا سفارش ثبت شود؟`,
      orderConfirmKeyboard()
    );
    return true;
  }

  return false;
}

module.exports = { register, handleOrderText };
