const db = require('./db');
const { MENU } = require('./keyboards');
const { formatPrice, stockLine } = require('./format');
const { todayJalaliDisplay } = require('./jalali');

function register(bot) {
  bot.hears(MENU.PRICE_TODAY, ctx => {
    const products = db.getProducts();
    const byCategory = {};
    products.forEach(p => {
      const key = p.categoryLabel || p.category;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(p);
    });

    let msg = `💰 قیمت روز — ${todayJalaliDisplay()}\n\n`;
    Object.entries(byCategory).forEach(([label, list]) => {
      msg += `${label}\n`;
      list.forEach(p => {
        msg += `• ${p.name}: ${formatPrice(p.price)} / ${p.unit} — ${stockLine(p)}\n`;
      });
      msg += '\n';
    });
    msg += 'ℹ️ قیمت‌ها ممکن است بسته به موجودی روزانه تغییر کند.';
    ctx.reply(msg.trim());
  });
}

module.exports = { register };
