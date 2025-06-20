const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

/* app.use('/api/subject', require('./routes/subject'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/occupation', require('./routes/occupation')); */
app.use('/api/register', require('./routes/register.js'));
app.use('/api/login', require('./routes/login.js'));
app.use('/api/products', require('./routes/product.js'));

app.listen(PORT, () => {
    console.log('Server running at http://localhost: ' + PORT);
});


