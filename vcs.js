const init = require('./commands/init.js');
const add = require('./commands/add.js');
const commit = require('./commands/commit.js');
const log = require('./commands/log.js');
const branch = require('./commands/branch.js');
const checkout = require('./commands/checkout.js');

// 사용자가 입력한 순수 명령어 받음
const args = process.argv.slice(2);

const command = args[0];
const filepath = args[1];
const message = args.slice(1);
const branchName = args[1];

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

  case 'log':
    log();
    break;

  case 'branch':
    branch(branchName);
    break;

  case 'checkout':
    checkout(branchName);
    break;

  default:
    console.log(`${command} : 존재하지 않는 명령어입니다.`);
}
