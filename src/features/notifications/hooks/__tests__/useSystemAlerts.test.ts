import { renderHook } from '@testing-library/react';
import { useSystemAlerts } from '../useSystemAlerts';
import * as DataContext from '../../../context/DataContext';

// DataContext.useData をモックする
jest.mock('../../../context/DataContext', () => ({
    useData: jest.fn(),
}));

const mockUseData = DataContext.useData as jest.Mock;

describe('useSystemAlerts', () => {
    const defaultData = {
        tablets: [],
        iPhones: [],
        featurePhones: [],
        routers: [],
        employees: [],
        areas: [],
        addresses: [],
        isInitialized: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // デフォルトでは初期化済みで空のデータを返す
        mockUseData.mockReturnValue(defaultData);

        // 日付計算のためにシステム時間を固定
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 2, 24)); // 2026-03-24
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('isInitialized=false の場合は空配列を返す', () => {
        mockUseData.mockReturnValue({ ...defaultData, isInitialized: false, iPhones: [{ id: '1', employeeCode: 'unreg' }] });
        const { result } = renderHook(() => useSystemAlerts());
        expect(result.current).toEqual([]);
    });

    test('未登録社員コードのデバイス（unregistered_employee）', () => {
        mockUseData.mockReturnValue({
            ...defaultData,
            iPhones: [{ id: 'iph-1', employeeCode: 'EMP999', addressCode: 'AC001', status: 'in-use' }],
            employees: [{ id: 'emp-1', code: 'EMP001', addressCode: 'AC001', areaCode: 'A01' }], // EMP999は存在しない
            addresses: [{ id: 'add-1', addressCode: 'AC001' }],
            areas: [{ id: 'area-1', areaCode: 'A01' }]
        });
        const { result } = renderHook(() => useSystemAlerts());
        expect(result.current).toHaveLength(1);
        expect(result.current[0].type).toBe('unregistered_employee');
        expect(result.current[0].message).toContain('EMP999');
    });


    test('重複した端末CD（duplicate_terminal）', () => {
        mockUseData.mockReturnValue({
            ...defaultData,
            tablets: [
                { id: 'tab-1', terminalCode: 'TC001', status: 'in-use', addressCode: 'AC001' },
                { id: 'tab-2', terminalCode: 'TC001', status: 'in-use', addressCode: 'AC001' },
            ],
            addresses: [{ id: 'acc-1', addressCode: 'AC001' }],
        });
        const { result } = renderHook(() => useSystemAlerts());
        // duplicateアラートが2件生成される（IDベース）
        const dups = result.current.filter(a => a.type === 'duplicate_terminal');
        expect(dups).toHaveLength(2);
        expect(dups[0].message).toContain('TC001');
    });

    test('契約残30日以内（contract_expiring）: 切れそう', () => {
        mockUseData.mockReturnValue({
            ...defaultData,
            iPhones: [{
                id: 'iph-1',
                employeeCode: 'EMP001',
                addressCode: 'AC001',
                lendDate: '2024-04-10', // 2026-03-24現在、2年契約だと 2026-04-10 が期限（残り17日）
                contractYears: '2',
                status: 'in-use'
            }],
            employees: [{ id: 'emp-1', code: 'EMP001', addressCode: 'AC001', areaCode: 'A01' }],
            addresses: [{ id: 'add-1', addressCode: 'AC001' }],
            areas: [{ id: 'area-1', areaCode: 'A01' }]
        });
        const { result } = renderHook(() => useSystemAlerts());
        const expiring = result.current.filter(a => a.type === 'contract_expiring');
        expect(expiring).toHaveLength(1);
        expect(expiring[0].message).toContain('切れそうです');
        expect(expiring[0].message).toContain('17日後');
    });

    test('契約期限超過（contract_expiring）: 切れています', () => {
        mockUseData.mockReturnValue({
            ...defaultData,
            iPhones: [{
                id: 'iph-1',
                employeeCode: 'EMP001',
                addressCode: 'AC001',
                lendDate: '2024-03-20', // 2年契約で 2026-03-20 が期限（4日超過）
                contractYears: '2',
                status: 'in-use'
            }],
            employees: [{ id: 'emp-1', code: 'EMP001', addressCode: 'AC001', areaCode: 'A01' }],
            addresses: [{ id: 'add-1', addressCode: 'AC001' }],
            areas: [{ id: 'area-1', areaCode: 'A01' }]
        });
        const { result } = renderHook(() => useSystemAlerts());
        const expiring = result.current.filter(a => a.type === 'contract_expiring');
        expect(expiring).toHaveLength(1);
        expect(expiring[0].message).toContain('切れています');
        expect(expiring[0].message).toContain('4日超過');
    });

    test('status !== "in-use" のデバイスは missing_* チェックをスキップする', () => {
        mockUseData.mockReturnValue({
            ...defaultData,
            iPhones: [{
                id: 'iph-1',
                status: 'available', // availableの場合は未承認項目を無視
                employeeCode: '', // 未入力
                addressCode: '' // 未入力
            }],
        });
        const { result } = renderHook(() => useSystemAlerts());
        // availableのためmissingエラーは出ない
        const missing = result.current.filter(a => a.type.startsWith('missing_'));
        expect(missing).toHaveLength(0);
    });
});
