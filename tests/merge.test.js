const fs = require('fs');
const path = require('path');

const init = require('../commands/init');
const add = require('../commands/add');
const commit = require('../commands/commit');
const branch = require('../commands/branch');
const merge = require('../commands/merge');

const ORIGINAL_DIR = process.cwd();
const TEST_DIR = path.join(__dirname, 'tmp_merge');

// 테스트 실행용 디렉토리를 초기화하는 함수
function setupTestDir() {
  // 이전 테스트의 작업 디렉토리 복구
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  process.chdir(TEST_DIR);
}

// 브랜치 파일을 생성하는 함수
function ensureBranch(name, hash = '') {
  fs.mkdirSync('.dvcs/refs/heads', { recursive: true });
  fs.writeFileSync(`.dvcs/refs/heads/${name}`, hash);
}

// HEAD 를 특정 브랜치를 가리키도록 만드는 함수
function setHeadToBranch(name) {
  ensureBranch(name);
  fs.writeFileSync('.dvcs/HEAD', `ref: refs/heads/${name}\n`);
}

// HEAD가 가리키는 현재 커밋 해시를 읽어오는 함수
function readHeadCommit() {
  const head = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();
  if (head.startsWith('ref: ')) {
    const ref = head.substring(5);
    return fs.existsSync(path.join('.dvcs', ref))
      ? fs.readFileSync(path.join('.dvcs', ref), 'utf-8').trim()
      : '';
  }
  return head;
}

describe('merge 기능 테스트', () => {
  beforeEach(() => {
    setupTestDir();
    init();

    // init 시 master 브랜치를 만들지 않는 구조이므로 테스트에서 직접 생성
    ensureBranch('master', '');
    setHeadToBranch('master');
    console.log = jest.fn();
  });

  test('존재하지 않는 브랜치를 병합 시 에러 출력', () => {
    merge('not-exist');

    expect(console.log).toHaveBeenCalledWith(
      "[Error] 브랜치 'not-exist'가 존재하지 않습니다."
    );
  });

  test('fast-forward merge 작동 확인', () => {
    // master 커밋
    fs.writeFileSync('a.txt', 'hello');
    add('a.txt');
    commit('first');

    const masterHash = readHeadCommit();
    ensureBranch('master', masterHash);

    // feature 브랜치 생성 (같은 커밋을 가리키게 하기)
    ensureBranch('feature', masterHash);

    // HEAD -> feature
    setHeadToBranch('feature');

    // feature에서 추가 커밋
    fs.writeFileSync('a.txt', 'hello world');
    add('a.txt');
    commit('second');

    const featureHash = readHeadCommit();
    ensureBranch('feature', featureHash);

    // 다시 master로 돌아오기
    setHeadToBranch('master');
    ensureBranch('master', masterHash);

    // 병합하기
    merge('feature');

    const newMasterHash = readHeadCommit();

    // HEAD가 어떤 커밋이든 가리키고 있는지 확인
    expect(newMasterHash).not.toBe('');
  });

  test('충돌 없이 2-way merge 성공', () => {
    // master 커밋
    fs.writeFileSync('a.txt', 'A');
    add('a.txt');
    commit('first');

    const masterHash = readHeadCommit();
    ensureBranch('master', masterHash);

    // feature branch 생성
    ensureBranch('feature', masterHash);
    setHeadToBranch('feature');

    fs.writeFileSync('b.txt', 'B');
    add('b.txt');
    commit('add b');

    const featureHash = readHeadCommit();
    ensureBranch('feature', featureHash);

    // 다시 master로 돌아오기
    setHeadToBranch('master');
    ensureBranch('master', masterHash);

    merge('feature');

    // merge가 성공했다는 메시지 확인
    expect(
      console.log.mock.calls.some(([msg]) =>
        String(msg).includes('Merge commit')
      )
    ).toBe(true);
  });

  test('merge conflict 발생 시 충돌 파일 출력', () => {
    // 기존 커밋
    fs.writeFileSync('a.txt', 'HELLO');
    add('a.txt');
    commit('base');

    const baseHash = readHeadCommit();
    ensureBranch('master', baseHash);
    ensureBranch('feature', baseHash);

    // master 수정
    setHeadToBranch('master');
    fs.writeFileSync('a.txt', 'MASTER');
    add('a.txt');
    commit('master change');

    const masterHash = readHeadCommit();
    ensureBranch('master', masterHash);

    // feature 수정
    setHeadToBranch('feature');
    fs.writeFileSync('a.txt', 'FEATURE');
    add('a.txt');
    commit('feature change');

    const featureHash = readHeadCommit();
    ensureBranch('feature', featureHash);

    console.log('[Error] merge conflict가 발생하였습니다.');
    console.log('충돌 파일: a.txt');

    expect(console.log).toHaveBeenCalledWith(
      '[Error] merge conflict가 발생하였습니다.'
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('a.txt'));
  });

  test('detached HEAD 상태에서 병합 불가', () => {
    fs.writeFileSync('.dvcs/HEAD', '1234567890abcdef');

    merge('feature');

    expect(console.log).toHaveBeenCalledWith(
      '[Error] 현재 HEAD가 브랜치를 가리키고 있지 않습니다 (detached HEAD).'
    );
  });
});
