const fs = require('fs');
const path = require('path');
const init = require('../commands/init');
const log = require('../commands/log');

const ORIGINAL_DIR = process.cwd();
const TEST_DIR = path.join(__dirname, 'tmp_log');

function setupTestDir() {
  // 이전 테스트의 작업 디렉토리 복구
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  process.chdir(TEST_DIR);
  init();
  console.log = jest.fn();
}

function createCommit(hash, content) {
  const dir = hash.substring(0, 2);
  const file = hash.substring(2);

  const objDir = path.join('.dvcs/objects', dir);
  fs.mkdirSync(objDir, { recursive: true });

  fs.writeFileSync(path.join(objDir, file), content);
}

describe('log 기능 테스트', () => {
  beforeEach(() => {
    setupTestDir();
    // 모든 테스트에서 console.log 캡처
    console.log = jest.fn();
  });

  test('커밋이 없는 경우 로그 출력 안 함', () => {
    fs.writeFileSync('.dvcs/HEAD', '');
    log();

    // HEAD는 있지만 비어 있기 때문에 로그가 없음
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('commit -')
    );
  });

  test('단일 커밋 로그 출력', () => {
    const commitHash = 'abcd1234ef';
    const commitContent = ['tree treehash', 'message first commit'].join('\n');

    createCommit(commitHash, commitContent);

    fs.writeFileSync('.dvcs/HEAD', commitHash);

    log();

    expect(console.log).toHaveBeenCalledWith(`commit - ${commitHash}`);
    expect(console.log).toHaveBeenCalledWith('commit message - first commit\n');
  });

  test('부모 커밋까지 역순으로 순회 출력', () => {
    const parentHash = '111111aaaa';
    const childHash = '222222bbbb';

    createCommit(parentHash, 'tree ptree\nmessage parent commit');
    createCommit(
      childHash,
      `tree ctree\nparent ${parentHash}\nmessage child commit`
    );

    fs.writeFileSync('.dvcs/HEAD', childHash);

    log();

    expect(console.log).toHaveBeenCalledWith(`commit - ${childHash}`);
    expect(console.log).toHaveBeenCalledWith('commit message - child commit\n');

    expect(console.log).toHaveBeenCalledWith(`commit - ${parentHash}`);
    expect(console.log).toHaveBeenCalledWith(
      'commit message - parent commit\n'
    );
  });

  test('HEAD가 브랜치를 가리킬 때 브랜치에서 commit hash를 읽음', () => {
    const commitHash = '9999aaaabbbb';
    const commitContent = 'tree xxyyzz\nmessage branch commit';

    createCommit(commitHash, commitContent);

    // master 브랜치 생성
    const masterPath = path.join('.dvcs/refs/heads/master');
    fs.writeFileSync(masterPath, commitHash);

    // HEAD가 master를 가리키도록 설정
    fs.writeFileSync('.dvcs/HEAD', 'ref: refs/heads/master');

    log();

    expect(console.log).toHaveBeenCalledWith(`commit - ${commitHash}`);
    expect(console.log).toHaveBeenCalledWith(
      'commit message - branch commit\n'
    );
  });
});
