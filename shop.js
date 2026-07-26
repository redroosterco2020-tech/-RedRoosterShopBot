const db = require('./db');
const { MENU, shopSubmenuKeyboard, categoriesKeyboard, productListKeyboard, productDetailKeyboard } = require('./keyboards');
const { productCard, stockLine } = require('./format');

const CATEGORIES = [
  { key: 'eggs', label: '🥚 تخم‌مرغ و تخم نطفه‌دار' },
  { key: 'chicks', label: '🐣 جوجه' },
  { key: 'young', label: '🐤 نیمچه و پولت' },
  { key: 'adult', label: '🐔 مرغ و خروس' },
];

function register(bot) {
  bot.hears(MENU.SHOP, ctx => {
    ctx.reply('🛍 فروشگاه — یکی از گزینه‌ها را انتخاب کنید:', shopSubmenuKeyboard());
  });

  bot.action('shop:list_all', async ctx => {
    await ctx.answerCbQuery();
    const products = db.getProducts();
    if (!products.length) return ctx.reply('در حال حاضر محصولی ثبت نشده است.');
    await ctx.reply('📋 همه‌ی محصولات:', productListKeyboard(products));
  });

  bot.action('shop:categories', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('🗂 یک دسته را انتخاب کنید:', categoriesKeyboard(CATEGORIES));
  });

  bot.action(/^cat:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    const key = ctx.match[1];
    const products = db.getProducts().filter(p => p.category === key);
    const cat = CATEGORIES.find(c => c.key === key);
    if (!products.length) return ctx.reply('محصولی در این دسته ثبت نشده است.');
    await ctx.reply(`${cat ? cat.label : ''} — محصولات این دسته:`, productListKeyboard(products));
  });

  bot.action('shop:search', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.awaiting = 'search';
    await ctx.reply('🔎 نام محصول مورد نظر خود را تایپ و ارسال کنید:');
  });

  bot.action('shop:inventory', async ctx => {
    await ctx.answerCbQuery();
    const products = db.getProducts();
    const lines = products.map(p => `${p.name}: ${stockLine(p)}`);
    await ctx.reply('📊 موجودی لحظه‌ای:\n\n' + lines.join('\n'));
  });

  bot.action(/^prod:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    const product = db.getProductById(ctx.match[1]);
    if (!product) return ctx.reply('این محصول یافت نشد (ممکن است حذف شده باشد).');
    await ctx.reply(productCard(product), productDetailKeyboard(product));
  });
}

async function handleSearchText(ctx, text) {
  const q = text.trim().toLowerCase();
  const results = db.getProducts().filter(p => p.name.toLowerCase().includes(q));
  if (!results.length) {
    await ctx.reply('❌ محصولی با این نام پیدا نشد. دوباره تلاش کنید یا از «دسته‌بندی محصولات» استفاده کنید.');
    return true;
  }
  await ctx.reply(`🔎 نتایج جستجو برای «${text}»:`, productListKeyboard(results));
  return true;
}

module.exports = { register, handleSearchText, CATEGORIES };
