/**
 * DataContext.tsx のデータマッパー関数のユニットテスト
 * mapTabletFromDb / mapIPhoneFromDb / mapEmployeeFromDb / mapAreaFromDb / mapAddressFromDb
 */
import {
    mapTabletFromDb,
    mapIPhoneFromDb,
    mapFeaturePhoneFromDb,
    mapRouterFromDb,
    mapEmployeeFromDb,
    mapAreaFromDb,
    mapAddressFromDb,
} from '../DataContext';

// ──────────────────────────────────────────────
// mapTabletFromDb
// ──────────────────────────────────────────────
describe('mapTabletFromDb', () => {
    const dbRow = {
        id: 'tab-001',
        terminal_code: 'TC001',
        maker: 'Apple',
        model_number: 'iPad Pro',
        address_code: 'AC001',
        cost_bearer: '自社',
        address: '東京都渋谷区',
        notes: 'テスト端末',
        lend_history: '2024-01-01',
        status: 'in-use',
        contract_years: '3',
        employee_code: 'EMP001',
        version: 2,
        updated_at: '2026-01-01T00:00:00Z',
    };

    test('全フィールドが正しくマッピングされる', () => {
        const result = mapTabletFromDb(dbRow);
        expect(result.id).toBe('tab-001');
        expect(result.terminalCode).toBe('TC001');
        expect(result.maker).toBe('Apple');
        expect(result.modelNumber).toBe('iPad Pro');
        expect(result.addressCode).toBe('AC001');
        expect(result.costBearer).toBe('自社');
        expect(result.status).toBe('in-use');
        expect(result.version).toBe(2);
    });

    test('null値は空文字列に変換される', () => {
        const result = mapTabletFromDb({ ...dbRow, notes: null, employee_code: null });
        expect(result.notes).toBe('');
        expect(result.employeeCode).toBe('');
    });

    test('undefined値は空文字列に変換される', () => {
        const result = mapTabletFromDb({ ...dbRow, maker: undefined });
        expect(result.maker).toBe('');
    });

    test('statusがない場合はavailableがデフォルト', () => {
        const result = mapTabletFromDb({ ...dbRow, status: undefined });
        expect(result.status).toBe('available');
    });

    test('versionはNumber型に変換される', () => {
        const result = mapTabletFromDb({ ...dbRow, version: '5' });
        expect(result.version).toBe(5);
    });

    test('versionがnullの場合は1', () => {
        const result = mapTabletFromDb({ ...dbRow, version: null });
        expect(result.version).toBe(1);
    });
});

// ──────────────────────────────────────────────
// mapIPhoneFromDb
// ──────────────────────────────────────────────
describe('mapIPhoneFromDb', () => {
    const dbRow = {
        id: 'iph-001',
        carrier: 'docomo',
        phone_number: '090-1234-5678',
        management_number: 'MG001',
        employee_code: 'EMP001',
        address_code: 'AC001',
        cost_bearer: '自社',
        smart_address_id: 'SA001',
        smart_address_pw: 'pw123',
        lend_date: '2025-01-01',
        receipt_date: '2025-01-05',
        notes: 'メモ',
        return_date: '',
        model_name: 'iPhone 15',
        status: 'in-use',
        contract_years: '2',
        version: 1,
        updated_at: '2026-01-01T00:00:00Z',
    };

    test('全フィールドが正しくマッピングされる', () => {
        const result = mapIPhoneFromDb(dbRow);
        expect(result.id).toBe('iph-001');
        expect(result.carrier).toBe('docomo');
        expect(result.phoneNumber).toBe('090-1234-5678');
        expect(result.managementNumber).toBe('MG001');
        expect(result.modelName).toBe('iPhone 15');
        expect(result.lendDate).toBe('2025-01-01');
    });

    test('null値は空文字列に変換される', () => {
        const result = mapIPhoneFromDb({ ...dbRow, return_date: null, receipt_date: null });
        expect(result.returnDate).toBe('');
        expect(result.receiptDate).toBe('');
    });
});

// ──────────────────────────────────────────────
// mapEmployeeFromDb
// ──────────────────────────────────────────────
describe('mapEmployeeFromDb', () => {
    const dbRow = {
        id: 'emp-001',
        employee_code: 'EMP001',
        name: '山田 太郎',
        name_kana: 'ヤマダ タロウ',
        email: 'yamada@example.com',
        gender: '男性',
        birthday: '1990-04-15',
        join_date: '2015-04-01',
        age_at_month_end: 35,
        years_in_service: 10,
        months_in_service: 11,
        area_code: 'A01',
        address_code: 'AC001',
        authority: 'admin',
        auth_id: 'auth-uuid-001',
        version: 3,
        updated_at: '2026-01-01T00:00:00Z',
    };

    test('役割が authority=admin のとき role=admin になる', () => {
        const result = mapEmployeeFromDb(dbRow);
        expect(result.role).toBe('admin');
    });

    test('authority=user のとき role=user になる', () => {
        const result = mapEmployeeFromDb({ ...dbRow, authority: 'user' });
        expect(result.role).toBe('user');
    });

    test('authority が admin 以外はすべて user になる', () => {
        const result = mapEmployeeFromDb({ ...dbRow, authority: 'superadmin' });
        expect(result.role).toBe('user');
    });

    test('birthday が有効な日付ならば age が計算される（0以上）', () => {
        const result = mapEmployeeFromDb(dbRow);
        expect(result.age).toBeGreaterThanOrEqual(0);
    });

    test('birthday が空の場合は age_at_month_end の値（35）が使われる', () => {
        const result = mapEmployeeFromDb({ ...dbRow, birthday: '' });
        expect(result.age).toBe(35);
    });

    test('versionはNumber型に変換される', () => {
        const result = mapEmployeeFromDb(dbRow);
        expect(result.version).toBe(3);
    });
});

// ──────────────────────────────────────────────
// mapAreaFromDb
// ──────────────────────────────────────────────
describe('mapAreaFromDb', () => {
    const dbRow = {
        area_code: 'AREA01',
        area_name: '東日本エリア',
        version: 1,
        updated_at: '2026-01-01T00:00:00Z',
    };

    test('id と areaCode が同じ値になる', () => {
        const result = mapAreaFromDb(dbRow);
        expect(result.id).toBe('AREA01');
        expect(result.areaCode).toBe('AREA01');
    });

    test('areaName が正しくマッピングされる', () => {
        const result = mapAreaFromDb(dbRow);
        expect(result.areaName).toBe('東日本エリア');
    });

    test('null値は空文字列に変換される', () => {
        const result = mapAreaFromDb({ ...dbRow, area_name: null });
        expect(result.areaName).toBe('');
    });
});

// ──────────────────────────────────────────────
// mapAddressFromDb
// ──────────────────────────────────────────────
describe('mapAddressFromDb', () => {
    const dbRow = {
        id: 'addr-001',
        no: '001',
        address_code: 'AC001',
        office_name: '渋谷オフィス',
        tel: '03-1234-5678',
        fax: '03-1234-5679',
        category: '本社',
        zip: '150-0001',
        address: '東京都渋谷区',
        notes: '',
        department: '営業部',
        area: '東日本',
        supervisor: '田中部長',
        branch_no: '01',
        remarks: '特記事項なし',
        label_name: '渋谷',
        label_zip: '150-0001',
        label_address: '東京都渋谷区',
        caution: '',
        accounting_code: 'ACC001',
        version: 1,
        updated_at: '2026-01-01T00:00:00Z',
    };

    test('officeName が正しくマッピングされる', () => {
        const result = mapAddressFromDb(dbRow);
        expect(result.officeName).toBe('渋谷オフィス');
    });

    test('type（カテゴリ）が category からマッピングされる', () => {
        const result = mapAddressFromDb(dbRow);
        expect(result.type).toBe('本社');
    });

    test('division が department からマッピングされる', () => {
        const result = mapAddressFromDb(dbRow);
        expect(result.division).toBe('営業部');
    });

    test('null値は空文字列に変換される', () => {
        const result = mapAddressFromDb({ ...dbRow, tel: null, fax: null });
        expect(result.tel).toBe('');
        expect(result.fax).toBe('');
    });
});
