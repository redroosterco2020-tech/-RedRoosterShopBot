const db = require('./db');
const { MENU } = require('./keyboards');
const { Markup } = require('telegraf');
const { productCard } = require('./format');
const { productDetailKeyboard } = require('./keyboards');

function register(bot) {
  bot.hears(MENU.PRODUCTS, ctx => {
    const products = db.getProducts();
    const rows = products.map(p => [Markup.button.callback(`${p.name}${p.isNew ? ' 🆕' : ''}`, `prod:${p.id}`)]);
    rows.push([Markup.button.callback('🆕 محصولات جدید', 'products:new')]);
    ctx.reply('🥚 محصولات — یک مورد را برای مشاهده‌ی جزئیات انتخاب کنید:', Markup.inlineKeyboard(rows));
  });

  bot.action('products:new', async ctx => {
    await ctx.answerCbQuery();
    const newest = db.getProducts().filter(p => p.isNew);
    if (!newest.length) return ctx.reply('در حال حاضر محصول جدیدی ثبت نشده است.');
    for (const p of newest) {
      await ctx.reply(productCard(p), productDetailKeyboard(p));
    }
  });
}

module.exports = { register };
