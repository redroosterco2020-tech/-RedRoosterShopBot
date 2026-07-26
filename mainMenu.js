const { mainMenuKeyboard } = require('../keyboards');
const db = require('../db');

function register(bot) {
  bot.start(ctx => {
    const settings = db.getSettings();
    ctx.reply(
      `👋 به ربات فروش ${settings.shopName || 'سیلو'} خوش آمدید!\n\n` +
      'از منوی زیر یکی از گزینه‌ها را انتخاب کنید:',
      mainMenuKeyboard()
    );
  });

  bot.command('menu', ctx => {
    ctx.reply('📋 منوی اصلی:', mainMenuKeyboard());
  });

  bot.help(ctx => {
    ctx.reply(
      'راهنمای ربات:\n' +
      '🛍 فروشگاه — مشاهده و جستجوی محصولات\n' +
      '🥚 محصولات — لیست سریع محصولات\n' +
      '💰 قیمت روز — قیمت لحظه‌ای محصولات\n' +
      '📦 ثبت سفارش — ثبت سفارش جدید\n' +
      '🚚 پیگیری سفارش — پیگیری با کد سفارش\n' +
      '🔔 اطلاع‌رسانی — اطلاع از موجود شدن محصول\n' +
      '💬 ارتباط با پشتیبانی — گفتگوی مستقیم با مدیر\n' +
      '📍 اطلاعات — درباره ما، قوانین و ساعات کاری',
      mainMenuKeyboard()
    );
  });
}

module.exports = { register };
