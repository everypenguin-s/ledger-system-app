import { parseAndValidateEmployees } from '../employee-import-validator';

// ヘッダー定義（Excelのヘッダー行に対応）
const HEADERS = [
    '社員コード(必須)',
    '苗字(必須)',
    '名前(必須)',
    '苗字カナ',
    '名前カナ',
    '性別',
    'メールアドレス(必須)',
    '生年月日',
    'エリアコード',
    '事業所コード',
    '入社年月日',
    '権限(必須)',
    'パスワード(必須)',
];

/** 正常なデータ行を生成するヘルパー */
const makeValidRow = (overrides: Partial<Record<string, any>> = {}): any[] => {
    const defaults: Record<string, any> = {
        '社員コード(必須)': 'EMP001',
        '苗字(必須)': '山田',
        '名前(必須)': '太郎',
        '苗字カナ': 'ヤマダ',
        '名前カナ': 'タロウ',
        '性別': '1',
        'メールアドレス(必須)': 'yamada@example.com',
        '生年月日': '1990-04-15',
        'エリアコード': 'A01',
        '事業所コード': 'AC001',
        '入社年月日': '2015-04-01',
        '権限(必須)': 'ユーザー',
        'パスワード(必須)': '12345678',
    };
    const merged = { ...defaults, ...overrides };
    return HEADERS.map(h => merged[h] ?? '');
};

// ──────────────────────────────────────────────
// 正常系
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - 正常系', () => {
    test('正常な1行データは validEmployees に格納される', () => {
        const rows = [makeValidRow()];
        const { validEmployees, errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors).toHaveLength(0);
        expect(validEmployees).toHaveLength(1);
        expect(validEmployees[0].code).toBe('EMP001');
    });

    test('role が「管理者」のとき admin に変換される', () => {
        const rows = [makeValidRow({ '権限(必須)': '管理者' })];
        const { validEmployees } = parseAndValidateEmployees(rows, HEADERS);
        expect(validEmployees[0].role).toBe('admin');
    });

    test('role が「ユーザー」のとき user に変換される', () => {
        const rows = [makeValidRow({ '権限(必須)': 'ユーザー' })];
        const { validEmployees } = parseAndValidateEmployees(rows, HEADERS);
        expect(validEmployees[0].role).toBe('user');
    });

    test('半角カナは全角カナに自動変換される（ｱｲｳ → アイウ）', () => {
        const rows = [makeValidRow({ '苗字カナ': 'ﾔﾏﾀﾞ', '名前カナ': 'ﾀﾛｳ' })];
        const { validEmployees, errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors).toHaveLength(0);
        expect(validEmployees[0].nameKana).toContain('ヤマダ');
    });

    test('空行はスキップされる', () => {
        const rows = [[], makeValidRow()];
        const { validEmployees } = parseAndValidateEmployees(rows, HEADERS);
        expect(validEmployees).toHaveLength(1);
    });

    test('日付形式 yyyy/mm/dd も受け付ける', () => {
        const rows = [makeValidRow({ '生年月日': '1990/04/15', '入社年月日': '2015/04/01' })];
        const { validEmployees, errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors).toHaveLength(0);
        expect(validEmployees[0].birthDate).toBe('1990-04-15');
    });

    test('日付形式 yyyy年mm月dd日 も受け付ける', () => {
        const rows = [makeValidRow({ '生年月日': '1990年4月15日', '入社年月日': '2015年4月1日' })];
        const { validEmployees, errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors).toHaveLength(0);
    });
});

// ──────────────────────────────────────────────
// エラー系：社員コード
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - 社員コードバリデーション', () => {
    test('社員コードが空のときエラー', () => {
        const rows = [makeValidRow({ '社員コード(必須)': '' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('社員コード(必須)が未入力'))).toBe(true);
    });

    test('社員コードに全角文字が含まれているときエラー', () => {
        const rows = [makeValidRow({ '社員コード(必須)': 'ＥＭＰ００１' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('全角文字'))).toBe(true);
    });

    test('社員コードがファイル内で重複しているときエラー', () => {
        const rows = [makeValidRow(), makeValidRow({ 'メールアドレス(必須)': 'other@example.com' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('ファイル内で重複'))).toBe(true);
    });
});

// ──────────────────────────────────────────────
// エラー系：メールアドレス
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - メールアドレスバリデーション', () => {
    test('メールアドレスが空のときエラー', () => {
        const rows = [makeValidRow({ 'メールアドレス(必須)': '' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('メールアドレス(必須)が未入力'))).toBe(true);
    });

    test('メールアドレスに全角文字が含まれているときエラー', () => {
        const rows = [makeValidRow({ 'メールアドレス(必須)': 'yamada＠example.com' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('全角文字'))).toBe(true);
    });

    test('メールアドレスの形式が不正なときエラー', () => {
        const rows = [makeValidRow({ 'メールアドレス(必須)': 'not-an-email' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('形式が正しくありません'))).toBe(true);
    });

    test('ファイル内でメールアドレスが重複しているときエラー', () => {
        const rows = [
            makeValidRow(),
            makeValidRow({ '社員コード(必須)': 'EMP002' }),
        ];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('ファイル内で重複'))).toBe(true);
    });
});

// ──────────────────────────────────────────────
// エラー系：日付フィールド
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - 日付バリデーション', () => {
    test('生年月日の形式が不正なときエラー', () => {
        const rows = [makeValidRow({ '生年月日': '19900415' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('生年月日'))).toBe(true);
    });

    test('生年月日が未来の日付のときエラー', () => {
        const rows = [makeValidRow({ '生年月日': '2099-01-01' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('生年月日'))).toBe(true);
    });

    test('生年月日 > 入社年月日（クロスフィールドエラー）', () => {
        const rows = [makeValidRow({ '生年月日': '2000-01-01', '入社年月日': '1999-01-01' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('入社年月日') && e.includes('生年月日'))).toBe(true);
    });
});

// ──────────────────────────────────────────────
// エラー系：パスワード
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - パスワードバリデーション', () => {
    test('パスワードが空のときエラー', () => {
        const rows = [makeValidRow({ 'パスワード(必須)': '' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('パスワード(必須)が未入力'))).toBe(true);
    });

    test('パスワードが7文字以下のときエラー', () => {
        const rows = [makeValidRow({ 'パスワード(必須)': '1234567' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('8文字以上'))).toBe(true);
    });

    test('パスワードが17文字以上のときエラー', () => {
        const rows = [makeValidRow({ 'パスワード(必須)': '12345678901234567' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('8文字以上'))).toBe(true);
    });

    test('パスワードに全角文字が含まれているときエラー', () => {
        const rows = [makeValidRow({ 'パスワード(必須)': '１２３４５６７８' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('全角文字'))).toBe(true);
    });

    test('パスワードが数字以外の半角文字を含む場合エラー', () => {
        const rows = [makeValidRow({ 'パスワード(必須)': 'abc12345' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('半角数字のみ'))).toBe(true);
    });
});

// ──────────────────────────────────────────────
// エラー系：権限
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - 権限バリデーション', () => {
    test('権限が空のときエラー', () => {
        const rows = [makeValidRow({ '権限(必須)': '' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('権限(必須)が未入力'))).toBe(true);
    });

    test('権限が「管理者」でも「ユーザー」でもないときエラー', () => {
        const rows = [makeValidRow({ '権限(必須)': 'admin' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS);
        expect(errors.some(e => e.includes('無効な値'))).toBe(true);
    });
});

// ──────────────────────────────────────────────
// マスタ照合バリデーション
// ──────────────────────────────────────────────
describe('parseAndValidateEmployees - マスタ照合バリデーション', () => {
    const areaList = [{ areaCode: 'A01', areaName: '東日本', id: 'A01', version: 1, updatedAt: '' }];
    const addressList = [{ addressCode: 'AC001', officeName: '渋谷', id: 'add-001', no: '1', tel: '', fax: '', type: '', zipCode: '', address: '', notes: '', division: '', area: '', mainPerson: '', branchNumber: '', specialNote: '', labelName: '', labelZip: '', labelAddress: '', attentionNote: '', accountingCode: '', version: 1, updatedAt: '' }];

    test('エリアコードがマスタに存在しない場合エラー', () => {
        const rows = [makeValidRow({ 'エリアコード': 'UNKNOWN' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS, areaList, addressList);
        expect(errors.some(e => e.includes('エリアマスタに存在しません'))).toBe(true);
    });

    test('エリアコードがマスタに存在する場合はエラーなし', () => {
        const rows = [makeValidRow({ 'エリアコード': 'A01' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS, areaList, addressList);
        expect(errors.filter(e => e.includes('エリア'))).toHaveLength(0);
    });

    test('事業所コードがマスタに存在しない場合エラー', () => {
        const rows = [makeValidRow({ '事業所コード': 'UNKNOWN' })];
        const { errors } = parseAndValidateEmployees(rows, HEADERS, areaList, addressList);
        expect(errors.some(e => e.includes('事業所マスタに存在しません'))).toBe(true);
    });
});
