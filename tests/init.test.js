const fs = require('fs');
const path = require('path');
const init = require('../commands/init');

const ORIGINAL_DIR = process.cwd();
const TEST_DIR = path.join(__dirname, 'tmp_init');

function setupTestDir() {
  // 이전 테스트의 작업 디렉토리 복구
  process.chdir(ORIGINAL_DIR);

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR);
  process.chdir(TEST_DIR);
}

describe('init 기능 테스트', () => {
  beforeEach(() => {
    setupTestDir();
  });

  test('.dvcs 폴더가 정상적으로 생성', () => {
    // console 출력 감지
    console.log = jest.fn();

    init();

    expect(fs.existsSync('.dvcs')).toBe(true);
    expect(fs.existsSync('.dvcs/objects')).toBe(true);
    expect(fs.existsSync('.dvcs/refs')).toBe(true);
    expect(fs.existsSync('.dvcs/refs/heads')).toBe(true);
    expect(fs.existsSync('.dvcs/refs/tags')).toBe(true);

    expect(fs.existsSync('.dvcs/HEAD')).toBe(true);

    expect(console.log).toHaveBeenCalledWith(
      '.dvcs/ 폴더가 생성되었고, 버전 관리를 위한 기본 구조가 준비되었습니다.'
    );
  });

  test('이미 .dvcs가 존재할 경우 재생성하지 않음', () => {
    console.log = jest.fn();

    // 첫 번째 init 호출
    init();

    // 두 번째 init 호출 (이미 존재)
    init();

    expect(console.log).toHaveBeenCalledWith('.dvcs가 이미 존재합니다.');
  });

  test('HEAD 파일이 비어 있는 상태로 생성됨', () => {
    init();

    const headContent = fs.readFileSync('.dvcs/HEAD', 'utf-8').trim();

    expect(headContent).toBe('ref: refs/heads/master');
  });
});
