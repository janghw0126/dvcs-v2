const init = require('./commands/init.js');
const add = require('./commands/add.js');
const commit = require('./commands/commit.js');

// 사용자가 입력한 순수 명령어 받음
const args = process.argv.slice(2);

const command = args[0];
const filepath = args[1];
const message = args.slice(1);

switch (command) {
  case 'init':
    init();
    break;

  case 'add':
    add(filepath);
    break;

  case 'commit':
    commit(message);
    break;

  default:
    console.log(`${command} : 존재하지 않는 명령어입니다.`);
}
