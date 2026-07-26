const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function readJSON(name, fallback) {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJSON(name, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

function getProducts() {
  return readJSON('products.json', []);
}
function saveProducts(list) {
  writeJSON('products.json', list);
}
function getProductById(id) {
  return getProducts().find(p => p.id === id) || null;
}
function updateProduct(id, patch) {
  const list = getProducts();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  saveProducts(list);
  return list[idx];
}

function getOrders() {
  return readJSON('orders.json', []);
}
function saveOrders(list) {
  writeJSON('orders.json', list);
}
function addOrder(order) {
  const list = getOrders();
  list.push(order);
  saveOrders(list);
  return order;
}
function getOrderByCode(code) {
  return getOrders().find(o => o.code === code.trim().toUpperCase()) || null;
}
function updateOrderStatus(code, status) {
  const list = getOrders();
  const idx = list.findIndex(o => o.code === code.trim().toUpperCase());
  if (idx === -1) return null;
  list[idx].status = status;
  list[idx].updatedAt = new Date().toISOString();
  saveOrders(list);
  return list[idx];
}

function getSubscribers() {
  return readJSON('subscribers.json', {});
}
function saveSubscribers(obj) {
  writeJSON('subscribers.json', obj);
}
function subscribe(productId, chatId) {
  const subs = getSubscribers();
  if (!subs[productId]) subs[productId] = [];
  if (!subs[productId].includes(chatId)) subs[productId].push(chatId);
  saveSubscribers(subs);
}
function popSubscribers(productId) {
  const subs = getSubscribers();
  const list = subs[productId] || [];
  delete subs[productId];
  saveSubscribers(subs);
  return list;
}

function getSupportMap() {
  return readJSON('support.json', {});
}
function saveSupportMap(obj) {
  writeJSON('support.json', obj);
}
function linkSupportMessage(forwardedMessageId, chatId, userLabel) {
  const map = getSupportMap();
  map[forwardedMessageId] = { chatId, userLabel, at: new Date().toISOString() };
  saveSupportMap(map);
}
function resolveSupportMessage(forwardedMessageId) {
  const map = getSupportMap();
  return map[forwardedMessageId] || null;
}

function getSettings() {
  return readJSON('settings.json', {});
}
function saveSettings(obj) {
  writeJSON('settings.json', obj);
}

module.exports = {
  getProducts, saveProducts, getProductById, updateProduct,
  getOrders, saveOrders, addOrder, getOrderByCode, updateOrderStatus,
  getSubscribers, saveSubscribers, subscribe, popSubscribers,
  getSupportMap, saveSupportMap, linkSupportMessage, resolveSupportMessage,
  getSettings, saveSettings,
};
