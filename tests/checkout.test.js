const fs = require('fs');
const path = require('path');
const checkout = require('../commands/checkout');

// 테스트용 임시 폴더 생성
const TEST_DIR = path.join(__dirname, 'tmp_checkout');
const ORIGINAL_DIR = process.cwd();

function setupTestRepo() {
  // 테스트 폴더 초기화
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });

  process.chdir(TEST_DIR);

  fs.writeFileSync('file.txt', 'hi');

  // .dvcs 구조 생성
  fs.mkdirSync('.dvcs');
  fs.mkdirSync('.dvcs/objects', { recursive: true });
  fs.mkdirSync('.dvcs/refs/heads', { recursive: true });

  // index 생성
  fs.writeFileSync('.dvcs/index', '');
}

// commit 생성
function createCommit(hash, treeContent) {
  const dir = hash.substring(0, 2);
  const file = hash.substring(2);

  const objDir = path.join('.dvcs/objects', dir);
  fs.mkdirSync(objDir, { recursive: true });
  fs.writeFileSync(path.join(objDir, file), treeContent);
}

describe('checkout 기능 테스트', () => {
  beforeEach(() => {
    setupTestRepo();
  });

  test('존재하지 않는 브랜치 체크', () => {
    console.log = jest.fn();

    checkout('no-branch');

    expect(console.log).toHaveBeenCalledWith(
      "브랜치 'no-branch'는 존재하지 않습니다."
    );
  });

  test('커밋되지 않은 변경사항이 있을 때 checkout 실패', () => {
    console.log = jest.fn();

    // HEAD 파일 작성하여 커밋 해시 저장
    fs.writeFileSync('.dvcs/HEAD', 'ref: refs/heads/main');
    fs.writeFileSync('.dvcs/refs/heads/main', 'abcd1234');

    // commit 객체 만들기
    createCommit('abcd1234', 'tree treehash\n');
    createCommit('treehash', '100644 blob blobhash file.txt\n');
    createCommit('blobhash', '원래내용');

    // index에 file.txt 등록
    fs.writeFileSync('.dvcs/index', 'blobhash file.txt\n');

    // 워킹 디렉토리에 수정된 파일 저장
    fs.writeFileSync('file.txt', '수정됨');

    checkout('main');

    expect(console.log).toHaveBeenCalledWith(
      '[Error] 커밋되지 않은 변경 사항이 있어 브랜치를 변경할 수 없습니다.'
    );
  });

  test('정상 checkout 후 HEAD 변경 및 파일 복원', () => {
    console.log = jest.fn();

    fs.writeFileSync('.dvcs/HEAD', 'ref: refs/heads/main');
    fs.writeFileSync('.dvcs/refs/heads/main', 'abcd1234');

    createCommit('abcd1234', 'tree treehash\n');
    createCommit('treehash', '100644 blob blobhash file.txt\n');
    createCommit('blobhash', '복원될내용');

    // checkout 전 워킹 트리에 다른 내용 넣기
    fs.writeFileSync('file.txt', '복원될내용');
    fs.writeFileSync('.dvcs/index', 'blobhash file.txt\n');

    checkout('main');

    // HEAD 메시지 포함 확인
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('브랜치가 main으로 체크아웃 되었습니다.')
    );

    // 워킹트리 파일이 blob 내용으로 복원되었는지 확인
    const restored = fs.readFileSync('file.txt', 'utf-8');
    expect(restored).toBe('복원될내용');

    // index도 tree 기준으로 다시 작성되었는지 확인
    const indexContent = fs.readFileSync('.dvcs/index', 'utf-8').trim();
    expect(indexContent).toBe('blobhash file.txt');
  });
});
