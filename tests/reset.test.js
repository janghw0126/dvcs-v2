const fs = require('fs');
const path = require('path');

const init = require('../commands/init');
const add = require('../commands/add');
const commit = require('../commands/commit');
const reset = require('../commands/reset');

const ORIGINAL_DIR = process.cwd();
const TEST_DIR = path.join(__dirname, 'tmp_reset');

function setupTestDir() {
  // 이전 테스트의 작업 디렉토리 복구
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR);
  process.chdir(TEST_DIR);
}

// 현재 커밋 가져오는 함수
function getCurrentCommit() {
  const headContent = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();
  if (headContent.startsWith('ref: ')) {
    const ref = headContent.substring(5);
    return fs.readFileSync(path.join('.dvcs', ref), 'utf-8').trim();
  }
  return headContent;
}

describe('reset 기능 테스트', () => {
  beforeEach(() => {
    setupTestDir();
    init();
  });

  test('레포지토리가 없을 때 에러 출력', () => {
    console.log = jest.fn();

    // .dvcs 삭제
    fs.rmSync('.dvcs', { recursive: true });

    reset('12345');

    expect(console.log).toHaveBeenCalledWith(
      "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
    );
  });

  test('존재하지 않는 커밋으로 reset 시 에러 출력', () => {
    console.log = jest.fn();

    reset('abcdef1234567890');

    expect(console.log).toHaveBeenCalledWith(
      "[Error] 커밋 'abcdef1234567890'가 존재하지 않습니다."
    );
  });

  test('브랜치 HEAD일 때 reset <- 브랜치 포인터가 변경되는지 확인', () => {
    console.log = jest.fn();

    // 파일 commit
    fs.writeFileSync('a.txt', 'hello');
    add('a.txt');
    commit('first');

    const firstCommit = getCurrentCommit();

    // 두 번째 커밋 생성
    fs.writeFileSync('a.txt', 'world');
    add('a.txt');
    commit('second');

    const secondCommit = getCurrentCommit();

    // reset -> 첫 커밋으로 이동
    reset(firstCommit);

    const updated = getCurrentCommit();

    expect(updated).toBe(firstCommit);
    expect(updated).not.toBe(secondCommit);
  });

  test('detached HEAD 상태에서도 reset 정상 동작', () => {
    console.log = jest.fn();

    // 커밋 하나 생성
    fs.writeFileSync('a.txt', 'data');
    add('a.txt');
    commit('first');

    const commitHash = getCurrentCommit();

    // HEAD를 detached 상태로 만들기
    fs.writeFileSync('.dvcs/HEAD', commitHash);

    // reset 실행
    reset(commitHash);

    expect(console.log).toHaveBeenCalledWith(
      `이미 HEAD가 커밋 ${commitHash}를 가리키고 있습니다.`
    );
  });

  test('detached 상태에서 다른 커밋으로 reset 시 HEAD 직접 변경', () => {
    console.log = jest.fn();

    // 첫 커밋
    fs.writeFileSync('a.txt', 'one');
    add('a.txt');
    commit('one');

    const commit1 = getCurrentCommit();

    // 두 번째 커밋
    fs.writeFileSync('a.txt', 'two');
    add('a.txt');
    commit('two');

    const commit2 = getCurrentCommit();

    // detached HEAD로 지정
    fs.writeFileSync('.dvcs/HEAD', commit2);

    // reset commit1 실행
    reset(commit1);

    const finalHead = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();

    expect(finalHead).toBe(commit1);
    expect(console.log).toHaveBeenCalledWith(
      `HEAD가 직접 ${commit1}로 이동했습니다 (detached HEAD 상태).`
    );
  });
});
