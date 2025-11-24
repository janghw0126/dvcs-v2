const fs = require('fs');
const path = require('path');
const add = require('../commands/add.js');
const sha1 = require('../utils/sha1.js');

describe('add 명령어 테스트', () => {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const objectsPath = path.join(repoPath, 'objects');
  const indexPath = path.join(repoPath, 'index');

  // 테스트용 파일명
  const testFile = 'test.txt';

  beforeEach(() => {
    // 테스트 디렉토리 초기화
    if (fs.existsSync('.dvcs')) fs.rmSync('.dvcs', { recursive: true });
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);

    fs.mkdirSync(repoPath);
    fs.mkdirSync(objectsPath, { recursive: true });
  });

  // 예외 테스트
  describe('예외 처리 테스트', () => {
    test('추가하려는 파일이 존재하지 않을 때 예외 메시지 출력', () => {
      console.log = jest.fn();

      add(testFile);

      expect(console.log).toHaveBeenCalledWith(
        `파일을 찾을 수 없습니다: ${testFile}`
      );
    });

    test('dvcs init을 실행하지 않았을 때 예외 메시지 출력', () => {
      fs.rmSync(repoPath, { recursive: true });

      console.log = jest.fn();
      add(testFile);

      expect(console.log).toHaveBeenCalledWith(
        "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
      );
    });
  });

  // 정상 동작 테스트
  describe('정상 동작 테스트', () => {
    test('새로운 파일을 add하면 blob과 index가 생성', () => {
      fs.writeFileSync(testFile, 'hello world');

      add(testFile);

      const content = fs.readFileSync(testFile);
      const hash = sha1(content);
      const blobDir = path.join(objectsPath, hash.substring(0, 2));
      const blobFile = path.join(blobDir, hash.substring(2));

      expect(fs.existsSync(blobFile)).toBe(true);

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent.trim()).toBe(`${hash} ${testFile}`);
    });

    test('이미 스테이지된 파일이 그대로일 경우 "이미 스테이지에 있습니다." 출력', () => {
      fs.writeFileSync(testFile, 'original');

      // 첫 번째 파일 add
      add(testFile);

      console.log = jest.fn();

      // 두 번째 파일 add <- 내용 변화 X
      add(testFile);

      expect(console.log).toHaveBeenCalledWith(
        '파일이 이미 스테이지에 있습니다.'
      );
    });

    test('스테이지된 파일이 변경되었을 경우 업데이트', () => {
      fs.writeFileSync(testFile, 'old');
      // 원래 버전 스테이지
      add(testFile);

      fs.writeFileSync(testFile, 'new');
      console.log = jest.fn();
      // 변경된 파일 버전 스테이지
      add(testFile);

      const newHash = sha1(Buffer.from('new'));
      const indexContent = fs.readFileSync(indexPath, 'utf-8').trim();

      expect(indexContent).toBe(`${newHash} ${testFile}`);
      expect(console.log).toHaveBeenCalledWith(
        '스테이지된 파일이 수정되었습니다.'
      );
    });
  });
});
