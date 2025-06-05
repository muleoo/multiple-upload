import base62 from 'base62';


// export function getFilename () {
//   base62.setCharacterSet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
//   let code = String(Date.now() / 7173 + Math.random(0, 1) * 17779);
//   return code.substr(0, 8);
// }

// 综合多个随机因子，尽可能减少碰撞概率
// 生成一个8位的唯一文件名
export function getFilename() {
  base62.setCharacterSet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

  // 获取高精度时间戳
  const timestamp = Date.now();

  // 生成两个独立的随机数
  const randomPart1 = Math.floor(Math.random() * 10000);
  const randomPart2 = Math.floor(Math.random() * 10000);

  // 使用performance.now()作为额外熵源（如果可用）
  const performanceTime = window.performance && window.performance.now ?
    Math.floor(window.performance.now() * 100) % 1000 :
    Math.floor(Math.random() * 1000);

  // 综合多个随机源
  let uniqueNumber = (
    (timestamp % 10000000) +
    (randomPart1 % 1000) +
    (randomPart2 % 100) +
    performanceTime
  ) % 90000000; // 最大值设为90000000而不是100000000

  // 加上10000000确保第一位不是0（范围变为10000000-99999999）
  uniqueNumber += 10000000;

  return uniqueNumber.toString();
}