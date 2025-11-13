const crypto = require('crypto');

function sha1(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
}

module.exports = sha1;
