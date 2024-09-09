const express = require('express');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');
const app = express();

const proxy = httpProxy.createProxyServer({ changeOrigin: true });

let targets = require('./data.json').targets;

const loadTargets = () => {
  delete require.cache[require.resolve('./data.json')];
  targets = require('./data.json').targets;
};

const saveTargets = () => {
  fs.writeFileSync('./data.json', JSON.stringify({ targets }, null, 2));
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/url', (req, res) => {
  const newUrl = req.query.url;
  const deleteUrl = req.query.delete;

  const normalizeUrl = (url) => {
    return url.replace(/\/+$/, '').replace(/^https?:\/\//, '');
  };

  const isValidUrl = (url) => {
    const urlPattern = /^(https?:\/\/)([\da-z.-]+)(:\d+)?(\/[^\s]*)?$/;
    return urlPattern.test(url);
  };

  if (newUrl) {
    if (!isValidUrl(newUrl)) {
      return res.status(400).send('الرابط غير صالح');
    }

    const normalizedNewUrl = normalizeUrl(newUrl);
    const urlExists = targets.some(target => normalizeUrl(target) === normalizedNewUrl);

    if (urlExists) {
      res.status(400).send('الرابط موجود مسبقًا.');
    } else {
      const emptyIndex = targets.indexOf("");
      if (emptyIndex !== -1) {
        targets[emptyIndex] = newUrl;
      } else {
        targets.push(newUrl);
      }
      saveTargets();
      loadTargets();
      const id = targets.indexOf(newUrl) + 1;
      const fullUrl = `https://${req.headers.host}/${id}`;
      res.status(200).send(`رابط الطلبات الخاص بك هو :\n ${fullUrl}`);
    }
  } else if (deleteUrl) {
    const index = targets.findIndex(target => normalizeUrl(target) === normalizeUrl(deleteUrl));
    if (index !== -1) {
      targets[index] = "";
      saveTargets();
      loadTargets();
      res.status(200).send('تم حذف الرابط بنجاح.');
    } else {
      res.status(404).send('لم يتم العثور على الرابط.');
    }
  } else {
    res.status(400).send('حدث خطأ ما');
  }
});

app.use('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10) - 1;

  if (id >= 0 && id < targets.length && targets[id] !== "") {
    const target = targets[id];
    proxy.web(req, res, { target }, (err) => {
      console.error(`Proxy error for target: ${target}`, err);
      res.status(500).send(`Proxy error: ${err.message}`);
    });
  } else {
    res.status(404).send('غير متاح حتى الان');
  }
});

app.listen(8080, () => {
  console.log('Proxy server is running on port 8080');
});
