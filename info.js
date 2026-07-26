const db = require('../db');
const { MENU, infoSubmenuKeyboard } = require('../keyboards');

function register(bot) {
  bot.hears(MENU.INFO, ctx => {
    ctx.reply('📍 اطلاعات — یکی از موارد زیر را انتخاب کنید:', infoSubmenuKeyboard());
  });

  bot.action('info:about', async ctx => {
    await ctx.answerCbQuery();
    const s = db.getSettings();
    ctx.reply(s.about || 'اطلاعاتی ثبت نشده است.');
  });

  bot.action('info:rules', async ctx => {
    await ctx.answerCbQuery();
    const s = db.getSettings();
    ctx.reply(s.rules || 'قوانینی ثبت نشده است.');
  });

  bot.action('info:hours', async ctx => {
    await ctx.answerCbQuery();
    const s = db.getSettings();
    ctx.reply(s.workingHours || 'ساعات کاری ثبت نشده است.');
  });

  bot.action('info:location', async ctx => {
    await ctx.answerCbQuery();
    const s = db.getSettings();
    if (s.locationText) await ctx.reply(s.locationText);
    if (s.locationMapUrl) await ctx.reply(`🗺 مشاهده روی نقشه:\n${s.locationMapUrl}`);
  });

  bot.action('info:social', async ctx => {
    await ctx.answerCbQuery();
    const s = db.getSettings();
    const social = s.social || {};
    const lines = [];
    if (social.instagram) lines.push(`📸 اینستاگرام: ${social.instagram}`);
    if (social.telegramChannel) lines.push(`📢 کانال تلگرام: ${social.telegramChannel}`);
    if (social.whatsapp) lines.push(`🟢 واتس‌اپ: ${social.whatsapp}`);
    ctx.reply(lines.length ? lines.join('\n') : 'شبکه اجتماعی ثبت نشده است.');
  });
}

module.exports = { register };
