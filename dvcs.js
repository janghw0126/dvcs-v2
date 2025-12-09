const init = require('./commands/init.js');
const add = require('./commands/add.js');
const commit = require('./commands/commit.js');
const log = require('./commands/log.js');
const branch = require('./commands/branch.js');
const checkout = require('./commands/checkout.js');
const status = require('./commands/status.js');
const merge = require('./commands/merge');
const reset = require('./commands/reset');

// 사용자가 입력한 순수 명령어 받음
const args = process.argv.slice(2);

const command = args[0];
const arg1 = args[1];
const rest = args.slice(1);

switch (command) {
  case 'init':
    init();
    break;

  case 'add':
    add(arg1);
    break;

  case 'commit':
    commit(rest);
    break;

  case 'log':
    log();
    break;

  case 'branch':
    branch(arg1);
    break;

  case 'checkout':
    checkout(arg1);
    break;

  case 'status':
    status();
    break;

  case 'merge':
    merge(arg1);
    break;

  case 'reset':
    const option = args[1];
    const commitHash = args[2];

    reset(commitHash, option);
    break;

  default:
    console.log(`${command} : 존재하지 않는 명령어입니다.`);
}
