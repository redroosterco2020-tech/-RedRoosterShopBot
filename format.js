function formatPrice(n) {
  return Number(n || 0).toLocaleString('fa-IR') + ' تومان';
}

function stockLine(product) {
  return product.stock > 0
    ? `✅ موجود (${product.stock} ${product.unit})`
    : '❌ ناموجود';
}

function productCard(product) {
  const badge = product.isNew ? ' 🆕' : '';
  return (
    `${product.name}${badge}\n` +
    `━━━━━━━━━━━━━\n` +
    `💰 قیمت: ${formatPrice(product.price)} / ${product.unit}\n` +
    `📦 وضعیت: ${stockLine(product)}\n` +
    (product.desc ? `📝 ${product.desc}\n` : '')
  );
}

const STATUS_LABELS = {
  pending: '🟡 در انتظار بررسی',
  ready: '📦 آماده ارسال',
  shipped: '🚚 ارسال شده',
  delivered: '✅ تحویل شده',
  cancelled: '❌ لغو شده',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

module.exports = { formatPrice, stockLine, productCard, statusLabel, STATUS_LABELS };
