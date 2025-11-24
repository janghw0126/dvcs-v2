const fs = require('fs');
const path = require('path');
const commit = require('../commands/commit');
const sha1 = require('../utils/sha1');

const TEST_DIR = path.join(__dirname, 'tmp_commit');
const ORIGINAL_DIR = process.cwd();

// 테스트용 리포지토리 초기화
function setupRepo() {
  process.chdir(ORIGINAL_DIR);
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(TEST_DIR);
  process.chdir(TEST_DIR);

  // .dvcs 구조 생성
  fs.mkdirSync('.dvcs');
  fs.mkdirSync('.dvcs/objects', { recursive: true });
  fs.mkdirSync('.dvcs/refs/heads', { recursive: true });

  // 기본 HEAD 생성
  fs.writeFileSync('.dvcs/HEAD', 'ref: refs/heads/main');
  fs.writeFileSync('.dvcs/refs/heads/main', '');
  fs.writeFileSync('.dvcs/index', '', { encoding: 'utf8' });
}

function createBlob(hash, content) {
  const dir = hash.substring(0, 2);
  const file = hash.substring(2);
  const folder = path.join('.dvcs/objects', dir);

  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, file), content);
}

describe('commit 기능 테스트', () => {
  beforeEach(() => {
    setupRepo();
  });

  test('스테이지에 아무 것도 없으면 커밋 불가', () => {
    console.log = jest.fn();

    fs.writeFileSync('.dvcs/index', '');

    commit(['first commit']);

    expect(console.log).toHaveBeenCalledWith(
      '스테이지에 올라간 파일이 없습니다.'
    );
  });

  test('정상 커밋이 만들어지고 HEAD가 업데이트', () => {
    console.log = jest.fn();

    // 스테이지 파일 구성
    const fileContent = 'hello world';
    const blobHash = sha1(fileContent);

    // blob 저장
    createBlob(blobHash, fileContent);

    // index 구성
    fs.writeFileSync('.dvcs/index', `${blobHash} file.txt\n`);

    commit(['first commit']);

    // HEAD의 commit hash 확인
    const newCommitHash = fs
      .readFileSync('.dvcs/refs/heads/main', 'utf-8')
      .trim();

    expect(newCommitHash).not.toBe(''); // 커밋 해시 있어야 함

    const commitDir = newCommitHash.substring(0, 2);
    const commitFile = newCommitHash.substring(2);

    // 커밋 객체 존재해야 함
    const commitObjectPath = path.join('.dvcs/objects', commitDir, commitFile);
    expect(fs.existsSync(commitObjectPath)).toBe(true);

    // 커밋 내용 검증
    const commitContent = fs.readFileSync(commitObjectPath, 'utf-8');
    expect(commitContent).toContain('tree');
    expect(commitContent).toContain('message first commit');
  });

  test('같은 내용으로 커밋하면 "이미 최신 상태입니다." 출력', () => {
    console.log = jest.fn();

    // 스테이지 구성
    const content = 'abc';
    const blobHash = sha1(content);
    createBlob(blobHash, content);
    fs.writeFileSync('.dvcs/index', `${blobHash} a.txt\n`);

    // 첫 번째 커밋
    commit(['first']);

    // 두 번째 커밋(내용 동일)
    commit(['second']);

    expect(console.log).toHaveBeenCalledWith('이미 최신 상태입니다.');
  });

  test('detached HEAD 상태에서도 커밋이 생성된다', () => {
    console.log = jest.fn();

    // HEAD를 해시로 설정 -> detached HEAD
    fs.writeFileSync('.dvcs/HEAD', 'abcd1234');

    // blob 생성
    const content = 'zzz';
    const blobHash = sha1(content);
    createBlob(blobHash, content);

    // index 구성
    fs.writeFileSync('.dvcs/index', `${blobHash} test.txt\n`);

    commit(['detached commit']);

    const headContent = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();

    expect(headContent).not.toBe('abcd1234');
  });
});
