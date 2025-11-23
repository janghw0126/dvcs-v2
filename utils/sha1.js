function sha1(content) {
  // Buffer 형태로 들어온 경우 문자열로 변환
  if (Buffer.isBuffer(content)) {
    content = content.toString('utf-8');
  }

  // 5개의 상태 변수 선언
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  // 입력 문자열의 각 문자를 순회하며 해시 상태 갱신
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);

    // 해시 상태값 5개를 비트 연산으로 섞기
    h0 = (h0 ^ code) >>> 0;
    h1 = (h1 + (code << 1)) >>> 0;
    h2 = (h2 ^ (code >>> 1)) >>> 0;
    h3 = ((h3 << 3) | (h3 >>> 29)) ^ code;
    h4 = (h4 + code + ((h4 << 5) - h4)) >>> 0;

    // 상태값을 한 칸씩 회전
    const temp = h0;
    h0 = h1;
    h1 = h2;
    h2 = h3;
    h3 = h4;
    h4 = temp;
  }

  // 32비트 정수를 16진수 문자열로 변환
  function toHex(n) {
    return ('00000000' + n.toString(16)).slice(-8);
  }

  // 5개 32비트 상태값을 이어붙여서 40자리 해시 반환
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4)
  ).toLowerCase();
}

module.exports = sha1;
