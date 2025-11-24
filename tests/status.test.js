const fs = require('fs');
const path = require('path');
const init = require('../commands/init');
const add = require('../commands/add');
const commit = require('../commands/commit');
const status = require('../commands/status');

const ORIGINAL_DIR = process.cwd();
const TEST_DIR = path.join(__dirname, 'tmp_status');

// 테스트용 폴더 생성
function setupTestDir() {
  // 이전 테스트의 작업 디렉토리 복구
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR);
  process.chdir(TEST_DIR);
}

// HEAD가 가리키는 커밋 해시 가져오기
function getCurrentCommit() {
  const headContent = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();

  if (headContent.startsWith('ref: ')) {
    const ref = headContent.substring(5);
    return fs.readFileSync(path.join('.dvcs', ref), 'utf-8').trim();
  }
  return headContent;
}

describe('status 명령어 테스트', () => {
  beforeEach(() => {
    setupTestDir();
    init();
  });

  test('레포가 없을 때 오류 출력', () => {
    console.log = jest.fn();
    fs.rmSync('.dvcs', { recursive: true });

    status();

    expect(console.log).toHaveBeenCalledWith(
      "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
    );
  });

  test('커밋 없는 상태에서 status 출력', () => {
    console.log = jest.fn();

    status();

    expect(console.log).toHaveBeenCalledWith('Current Branch : master');
    expect(console.log).toHaveBeenCalledWith('Current Commit: \n');
  });

  test('staged 파일이 있는 경우 출력되는지 확인', () => {
    console.log = jest.fn();

    fs.writeFileSync('a.txt', 'hello');
    add('a.txt');

    status();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Changes to be committed:')
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('a.txt'));
  });

  test('modified 상태 파일 출력 확인', () => {
    console.log = jest.fn();

    // commit
    fs.writeFileSync('a.txt', 'hello');
    add('a.txt');
    commit('first');

    // 수정했지만 add 안함
    fs.writeFileSync('a.txt', 'updated');

    status();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Changes not staged for commit:')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('modified: a.txt')
    );
  });

  test('untracked 파일 출력 확인', () => {
    console.log = jest.fn();

    // commit
    fs.writeFileSync('a.txt', 'hello');
    add('a.txt');
    commit('first');

    // 새로운 파일
    fs.writeFileSync('new.txt', 'test');

    status();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Untracked files:')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('new.txt')
    );
  });
});
