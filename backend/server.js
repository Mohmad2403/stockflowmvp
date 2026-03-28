const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('StockFlow API is running 🚀');
});

mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
});
const User = mongoose.model('User', userSchema);

const orgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  defaultLowStockThreshold: { type: Number, default: 5 }
});
const Organization = mongoose.model('Organization', orgSchema);

const productSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: null }
}, { timestamps: true });
productSchema.index({ orgId: 1, sku: 1 }, { unique: true });
const Product = mongoose.model('Product', productSchema);

function authMiddleware(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, orgName } = req.body;
    if (!email || !password || !orgName) return res.status(400).json({ message: 'All fields required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const org = await Organization.create({ name: orgName });
    const user = await User.create({ email: email.toLowerCase(), password: hashed, orgId: org._id });
    const token = jwt.sign({ userId: user._id, orgId: org._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, orgName: org.name } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    const org = await Organization.findById(user.orgId);
    const token = jwt.sign({ userId: user._id, orgId: user.orgId, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, orgName: org.name } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/products', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ orgId: req.user.orgId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/products', authMiddleware, async (req, res) => {
  try {
    const { name, sku, description, quantity, costPrice, sellingPrice, lowStockThreshold } = req.body;
    if (!name || !sku) return res.status(400).json({ message: 'Name and SKU required' });
    const dup = await Product.findOne({ orgId: req.user.orgId, sku });
    if (dup) return res.status(400).json({ message: 'SKU already exists' });
    const product = await Product.create({ orgId: req.user.orgId, name, sku, description: description || '', quantity: quantity || 0, costPrice: costPrice || 0, sellingPrice: sellingPrice || 0, lowStockThreshold: lowStockThreshold || null });
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { name, sku, description, quantity, costPrice, sellingPrice, lowStockThreshold } = req.body;
    if (sku && sku !== product.sku) {
      const dup = await Product.findOne({ orgId: req.user.orgId, sku });
      if (dup) return res.status(400).json({ message: 'SKU already exists' });
    }
    Object.assign(product, { name: name || product.name, sku: sku || product.sku, description: description !== undefined ? description : product.description, quantity: quantity !== undefined ? quantity : product.quantity, costPrice: costPrice !== undefined ? costPrice : product.costPrice, sellingPrice: sellingPrice !== undefined ? sellingPrice : product.sellingPrice, lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : product.lowStockThreshold });
    await product.save();
    res.json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, orgId: req.user.orgId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ orgId: req.user.orgId });
    const org = await Organization.findById(req.user.orgId);
    const globalThreshold = org ? org.defaultLowStockThreshold : 5;
    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockItems = products.filter(p => {
      const threshold = p.lowStockThreshold !== null && p.lowStockThreshold !== undefined ? p.lowStockThreshold : globalThreshold;
      return p.quantity <= threshold;
    });
    res.json({ totalProducts, totalQuantity, lowStockItems, globalThreshold });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/settings', authMiddleware, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ defaultLowStockThreshold: org.defaultLowStockThreshold, orgName: org.name });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { defaultLowStockThreshold } = req.body;
    const org = await Organization.findByIdAndUpdate(req.user.orgId, { defaultLowStockThreshold }, { new: true });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ defaultLowStockThreshold: org.defaultLowStockThreshold, orgName: org.name });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
