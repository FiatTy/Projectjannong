const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

// Routes
const productRoute = require('./routes/product');
const cartRoute = require('./routes/cart');
const registerRoute = require('./routes/register.js')
const loginRoute = require('./routes/login.js')

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Use routes
app.use('/api/products', productRoute);
app.use('/api/cart', cartRoute);
app.use('/api/register', registerRoute);
app.use('/api/login', loginRoute);


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
