import express from 'express';
import mongoose from 'mongoose';
import { loadRootEnv } from './shared/env';

loadRootEnv();


const ProductSchema = new mongoose.Schema(
  { name: String, price: Number, stock: Number },
  { timestamps: true }
);

const Product = mongoose.model('Product', ProductSchema);

async function main() {
  await mongoose.connect(process.env.MONGO_PRODUCT_URI!);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.post('/products', async (req, res) => {
    const { name, price, stock } = req.body ?? {};
    if (!name || price == null || stock == null) return res.status(400).json({ message: 'name, price, stock required' });

    const product = await Product.create({ name, price, stock });
    res.json({ id: product.id, name: product.get('name'), price: product.get('price'), stock: product.get('stock') });
  });

  app.get('/products', async (_req, res) => {
    const items = await Product.find().lean();
    res.json(items.map((p: any) => ({ id: p._id.toString(), name: p.name, price: p.price, stock: p.stock })));
  });

  const port = Number(process.env.PRODUCT_PORT || 3002);
  app.listen(port, () => console.log(`Product Service running on :${port}`));
}

main().catch((e) => {
  console.error('Product service failed', e);
  process.exit(1);
});
