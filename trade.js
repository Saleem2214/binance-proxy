const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/api/trade', async (req, res) => {
  const { action, symbol, side, quantity, apiKey, apiSecret, lastPrice } = req.body;

  // التحقق من وجود المفاتيح
  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'Missing API keys' });
  }

  // جلب السعر الحالي
  if (action === 'check') {
    try {
      const priceRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.price);
      let percentChange = 0;
      if (lastPrice && lastPrice > 0) {
        percentChange = ((currentPrice - lastPrice) / lastPrice) * 100;
      }
      return res.json({ currentPrice, percentChange });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // تنفيذ أمر شراء أو بيع
  if (action === 'execute') {
    if (!symbol || !side || !quantity) {
      return res.status(400).json({ error: 'Missing order parameters' });
    }
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
      const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
      const orderRes = await fetch(`https://fapi.binance.com/fapi/v1/order?${queryString}&signature=${signature}`, {
        method: 'POST',
        headers: { 'X-MBX-APIKEY': apiKey }
      });
      const orderData = await orderRes.json();
      return res.json(orderData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // إذا لم يتم التعرف على الإجراء
  res.status(400).json({ error: 'Invalid action' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
