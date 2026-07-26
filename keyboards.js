const { Markup } = require('telegraf');

const MENU = {
  SHOP: '🛍 فروشگاه',
  PRODUCTS: '🥚 محصولات',
  PRICE_TODAY: '💰 قیمت روز',
  ORDER: '📦 ثبت سفارش',
  TRACK: '🚚 پیگیری سفارش',
  NOTIFY: '🔔 اطلاع‌رسانی',
  SUPPORT: '💬 ارتباط با پشتیبانی',
  INFO: '📍 اطلاعات',
};

function mainMenuKeyboard() {
  return Markup.keyboard([
    [MENU.SHOP, MENU.PRODUCTS],
    [MENU.PRICE_TODAY, MENU.ORDER],
    [MENU.TRACK, MENU.NOTIFY],
    [MENU.SUPPORT, MENU.INFO],
  ]).resize();
}

function shopSubmenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 مشاهده همه محصولات', 'shop:list_all')],
    [Markup.button.callback('🗂 دسته‌بندی محصولات', 'shop:categories')],
    [Markup.button.callback('🔎 جستجوی محصول', 'shop:search')],
    [Markup.button.callback('📊 موجودی لحظه‌ای', 'shop:inventory')],
  ]);
}

function categoriesKeyboard(categories) {
  const rows = categories.map(c => [Markup.button.callback(c.label, `cat:${c.key}`)]);
  return Markup.inlineKeyboard(rows);
}

function productListKeyboard(products, prefix = 'prod') {
  const rows = products.map(p => [
    Markup.button.callback(`${p.name}${p.isNew ? ' 🆕' : ''}${p.stock === 0 ? ' (ناموجود)' : ''}`, `${prefix}:${p.id}`),
  ]);
  return Markup.inlineKeyboard(rows);
}

function productDetailKeyboard(product) {
  const rows = [];
  if (product.stock > 0) {
    rows.push([Markup.button.callback('📦 سفارش این محصول', `order:start:${product.id}`)]);
  } else {
    rows.push([Markup.button.callback('🔔 اطلاع بده وقتی موجود شد', `notify:sub:${product.id}`)]);
  }
  return Markup.inlineKeyboard(rows);
}

function infoSubmenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🏡 درباره ما', 'info:about')],
    [Markup.button.callback('📜 قوانین', 'info:rules')],
    [Markup.button.callback('🕘 ساعات کاری', 'info:hours')],
    [Markup.button.callback('📍 موقعیت روی نقشه', 'info:location')],
    [Markup.button.callback('🌐 شبکه‌های اجتماعی', 'info:social')],
  ]);
}

function orderConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ ثبت نهایی سفارش', 'order:confirm')],
    [Markup.button.callback('❌ انصراف', 'order:cancel')],
  ]);
}

function adminOrderKeyboard(code) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📦 آماده ارسال', `admin:status:${code}:ready`),
      Markup.button.callback('🚚 ارسال شده', `admin:status:${code}:shipped`),
    ],
    [
      Markup.button.callback('✅ تحویل شده', `admin:status:${code}:delivered`),
      Markup.button.callback('❌ لغو سفارش', `admin:status:${code}:cancelled`),
    ],
  ]);
}

module.exports = {
  MENU,
  mainMenuKeyboard,
  shopSubmenuKeyboard,
  categoriesKeyboard,
  productListKeyboard,
  productDetailKeyboard,
  infoSubmenuKeyboard,
  orderConfirmKeyboard,
  adminOrderKeyboard,
};
