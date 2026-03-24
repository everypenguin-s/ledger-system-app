import { calculateAge, calculateServicePeriod, getWeekRange } from '../../../lib/utils/dateHelpers';

// ロケール時刻（JST）として2026-03-24を固定する
// UTC時刻ではなくローカル時刻で指定（タイムゾーン問題を回避）
const MOCK_TODAY_LOCAL = new Date(2026, 2, 24, 12, 0, 0, 0); // 2026-03-24 12:00:00 ローカル時刻

beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_TODAY_LOCAL);
});

afterAll(() => {
    jest.useRealTimers();
});

// ──────────────────────────────────────────────
// calculateAge
// ──────────────────────────────────────────────
describe('calculateAge', () => {
    test('通常ケース：誕生日が過ぎていれば正しい年齢を返す', () => {
        // 1990-01-01 生まれ → 2026-03-24 現在 = 36歳
        expect(calculateAge('1990-01-01')).toBe(36);
    });

    test('誕生日当日は加齢される', () => {
        // 2000-03-24 生まれ → 2026-03-24 = 26歳
        expect(calculateAge('2000-03-24')).toBe(26);
    });

    test('誕生日が明日ならまだ加齢されない', () => {
        // 2000-03-25 生まれ → 2026-03-24 = まだ25歳
        expect(calculateAge('2000-03-25')).toBe(25);
    });

    test('空文字列の場合は 0 を返す', () => {
        expect(calculateAge('')).toBe(0);
    });

    test('不正な日付文字列の場合は 0 を返す', () => {
        expect(calculateAge('invalid-date')).toBe(0);
    });

    test('入社年が今年と同じ場合（今年生まれた）は 0歳', () => {
        // 2026-01-01 生まれ → 2026-03-24 = 0歳
        expect(calculateAge('2026-01-01')).toBe(0);
    });

    test('返り値は 0 以上', () => {
        // マイナスにならないことを確認
        expect(calculateAge('1950-06-15')).toBeGreaterThanOrEqual(0);
    });
});

// ──────────────────────────────────────────────
// calculateServicePeriod
// ──────────────────────────────────────────────
describe('calculateServicePeriod', () => {
    test('通常ケース：2020-01-01 入社 → 6年2ヶ月', () => {
        // 2026-03-24 - 2020-01-01 = 6年2ヶ月（日: 24 >= 1 なのでmonths補正なし）
        const result = calculateServicePeriod('2020-01-01');
        expect(result.years).toBe(6);
        expect(result.months).toBe(2);
    });

    test('入社当日なら 0年0ヶ月', () => {
        const result = calculateServicePeriod('2026-03-24');
        expect(result.years).toBe(0);
        expect(result.months).toBe(0);
    });

    test('月をまたぐ場合（day補正あり）：2025-04-25入社 → 0年10ヶ月', () => {
        // 2026-03-24 - 2025-04-25
        // 年: 2026-2025 = 1
        // 月: 3-4 = -1 → -1 + 12 = 11、かつ年-1 → 0年
        // 日補正: 24 < 25 → months-- → 10ヶ月
        const result = calculateServicePeriod('2025-04-25');
        expect(result.years).toBe(0);
        expect(result.months).toBe(10);
    });

    test('空文字列の場合は { years:0, months:0 }', () => {
        const result = calculateServicePeriod('');
        expect(result.years).toBe(0);
        expect(result.months).toBe(0);
    });

    test('不正な入社日の場合は { years:0, months:0 }', () => {
        const result = calculateServicePeriod('not-a-date');
        expect(result.years).toBe(0);
        expect(result.months).toBe(0);
    });

    test('返り値の years と months は 0 以上', () => {
        const result = calculateServicePeriod('2020-06-15');
        expect(result.years).toBeGreaterThanOrEqual(0);
        expect(result.months).toBeGreaterThanOrEqual(0);
    });

    test('months は常に 0-11 の範囲', () => {
        const result = calculateServicePeriod('2020-06-15');
        expect(result.months).toBeLessThan(12);
    });
});

// ──────────────────────────────────────────────
// getWeekRange
// ──────────────────────────────────────────────
describe('getWeekRange', () => {
    test('起点の日曜日が週の start になる', () => {
        // 2026-03-24（火曜）→ start は日曜（getDay() === 0）
        const { start } = getWeekRange(new Date(2026, 2, 24)); // ローカル時刻
        expect(start.getDay()).toBe(0); // 日曜
    });

    test('start は週の月曜ではなく日曜', () => {
        const { start } = getWeekRange(new Date(2026, 2, 24));
        expect(start.getDate()).toBe(22); // 2026-03-22（日曜）
    });

    test('end は start + 6日（土曜）', () => {
        const { end } = getWeekRange(new Date(2026, 2, 24));
        expect(end.getDay()).toBe(6); // 土曜
    });

    test('end の日付は start + 6', () => {
        const { start, end } = getWeekRange(new Date(2026, 2, 24));
        expect(end.getDate()).toBe(start.getDate() + 6);
    });

    test('start の時刻は 00:00:00.000', () => {
        const { start } = getWeekRange(new Date(2026, 2, 24, 12));
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
    });

    test('end の時刻は 23:59:59.999', () => {
        const { end } = getWeekRange(new Date(2026, 2, 24, 12));
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
        expect(end.getSeconds()).toBe(59);
        expect(end.getMilliseconds()).toBe(999);
    });

    test('日曜日を渡すとその日が start になる', () => {
        // 2026-03-22 は日曜
        const { start } = getWeekRange(new Date(2026, 2, 22));
        expect(start.getDay()).toBe(0);
        expect(start.getDate()).toBe(22);
    });

    test('土曜日を渡すとその日が end になる', () => {
        // 2026-03-28 は土曜
        const { end } = getWeekRange(new Date(2026, 2, 28));
        expect(end.getDay()).toBe(6);
        expect(end.getDate()).toBe(28);
    });
});
