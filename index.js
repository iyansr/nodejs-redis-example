const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const app = express();

const PORT = process.env.PORT || 5000;
const PORT_REDIS = process.env.REDIS_PORT || 6379;

const client = redis.createClient(PORT_REDIS);

app.get('/', (req, res) => {
  res.json({
    message: 'Worked',
    status: 200
  });
});

const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} repos </h2>`;
};

async function getRepos(req, res, next) {
  try {
    console.log('Fetching Data...');
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    //set data to redis
    client.setex(username, 3600, repos);

    // res.send(data);
    res.send(setResponse(username, repos));
  } catch (err) {
    console.log(err);
    res.status(500);
  }
}

//cache middleware
const cache = (req, res, next) => {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
};

//tambahkan cache agar masuk ke redis
app.get('/repos/:username', cache, getRepos);

app.listen(PORT, () => {
  console.log(`running on port ${PORT}`);
});
