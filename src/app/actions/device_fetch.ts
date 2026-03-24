'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { getSetupUserServer } from './auth_setup';
import { getHighlightPage } from './master_fetch';

const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
};

const checkAuth = async () => {
    // 1. 初期セットアップアカウント（999999）のクッキーを先に確認する
    const setupUser = await getSetupUserServer();
    if (setupUser) return setupUser;

    // 2. 通常の Supabase Auth セッションを確認する
    const cookieStore = await cookies();
    
    // Next.js 15でのServer Actions内でのcookie.set例外を回避するカスタムラッパー
    const customCookies = {
        get: (name: string) => cookieStore.get(name),
        set: (name: string, value: string, options: any) => {
            try {
                cookieStore.set(name, value, options);
            } catch (e) {
                console.warn('[checkAuth] Ignored cookie.set error:', e instanceof Error ? e.message : e);
            }
        },
        remove: (name: string, options: any) => {
            try {
                cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (e) {
                console.warn('[checkAuth] Ignored cookie.remove error:', e instanceof Error ? e.message : e);
            }
        }
    };

    const supabase = createServerActionClient({ cookies: () => customCookies as any });
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        console.error('[checkAuth] Supabase auth error:', error?.message);
        throw new Error(`Unauthenticated: ${error?.message || 'No user found'}`);
    }
    
    return user;
};

export async function fetchIPhonesAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('iphones').select('*').order('management_number', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
}

export interface PaginationParams {
    page: number;
    pageSize: number;
    searchTerm?: string;
    sortCriteria?: { key: string; order: 'asc' | 'desc' }[];
    highlightId?: string;
}

export async function fetchIPhonesPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
        }
        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                managementNumber: 'management_number',
                phoneNumber: 'phone_number',
                modelName: 'model_name',
                contractYears: 'contract_years',
                carrier: 'carrier',
                status: 'status',
                employeeCode: 'employee_code',
                addressCode: 'address_code',
            };
            for (const criterion of sortCriteria) {
                const dbKey = keyMap[criterion.key] || criterion.key;
                q = q.order(dbKey, { ascending: criterion.order === 'asc' });
            }
        } else {
            q = q.order('management_number', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        const km: Record<string, string> = {
            managementNumber: 'management_number',
            phoneNumber: 'phone_number',
            modelName: 'model_name',
            contractYears: 'contract_years',
            carrier: 'carrier',
            status: 'status',
            employeeCode: 'employee_code',
            addressCode: 'address_code',
        };
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: km[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'management_number', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin, 
            tableName: 'iphones', 
            highlightId, 
            pageSize, 
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    let query = applyFiltersAndSort(admin.from('iphones').select('*', { count: 'exact' }));
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    let { data, count, error } = await query;
    
    let wasFallback = false;
    // PGRST103 (Range Not Satisfiable) エラーが発生した場合、1ページ目にフォールバック
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('iphones').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
        wasFallback = true;
    } else if (error) {
        throw new Error(error.message);
    }

    return { data: data || [], totalCount: count || 0, highlightPage, wasFallback };
}

export async function fetchIPhonesAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();
    
    let query = admin.from('iphones').select('*').order('management_number', { ascending: true });
    if (searchTerm) {
        query = query.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function fetchTabletsAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('tablets').select('*').order('terminal_code', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
}

export async function fetchTabletsPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`terminal_code.ilike.%${searchTerm}%,maker.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
        }
        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                terminalCode: 'terminal_code',
                contractYears: 'contract_years',
                status: 'status',
                employeeCode: 'employee_code',
                addressCode: 'address_code',
            };
            for (const criterion of sortCriteria) {
                const dbKey = keyMap[criterion.key] || criterion.key;
                q = q.order(dbKey, { ascending: criterion.order === 'asc' });
            }
        } else {
            q = q.order('terminal_code', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        const km: Record<string, string> = {
            terminalCode: 'terminal_code',
            contractYears: 'contract_years',
            status: 'status',
            employeeCode: 'employee_code',
            addressCode: 'address_code',
        };
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: km[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'terminal_code', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin, 
            tableName: 'tablets', 
            highlightId, 
            pageSize, 
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`terminal_code.ilike.%${searchTerm}%,maker.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    console.log(`[Server] tablets pagination requested. Page=${page}, pageSize=${pageSize}, highlightId=${highlightId}, returning highlightPage=${highlightPage}`);

    let query = applyFiltersAndSort(admin.from('tablets').select('*', { count: 'exact' }));
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    let { data, count, error } = await query;
    
    let wasFallback = false;
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('tablets').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
        wasFallback = true;
    } else if (error) {
        throw new Error(error.message);
    }

    return { data: data || [], totalCount: count || 0, highlightPage, wasFallback };
}

export async function fetchTabletsAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();
    let query = admin.from('tablets').select('*').order('terminal_code', { ascending: true });
    if (searchTerm) {
        query = query.or(`terminal_code.ilike.%${searchTerm}%,maker.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function fetchFeaturePhonesAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('featurephones').select('*').order('management_number', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
}

export async function fetchFeaturePhonesPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
        }
        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                managementNumber: 'management_number',
                phoneNumber: 'phone_number',
                modelName: 'model_name',
                contractYears: 'contract_years',
                carrier: 'carrier',
                status: 'status',
                employeeCode: 'employee_code',
                addressCode: 'address_code',
            };
            for (const criterion of sortCriteria) {
                const dbKey = keyMap[criterion.key] || criterion.key;
                q = q.order(dbKey, { ascending: criterion.order === 'asc' });
            }
        } else {
            q = q.order('management_number', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        const km: Record<string, string> = {
            managementNumber: 'management_number',
            phoneNumber: 'phone_number',
            modelName: 'model_name',
            contractYears: 'contract_years',
            carrier: 'carrier',
            status: 'status',
            employeeCode: 'employee_code',
            addressCode: 'address_code', 
        };
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: km[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'management_number', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin, 
            tableName: 'featurephones', 
            highlightId, 
            pageSize, 
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    let query = applyFiltersAndSort(admin.from('featurephones').select('*', { count: 'exact' }));
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    let { data, count, error } = await query;
    
    let wasFallback = false;
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('featurephones').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
        wasFallback = true;
    } else if (error) {
        throw new Error(error.message);
    }

    return { data: data || [], totalCount: count || 0, highlightPage, wasFallback };
}

export async function fetchFeaturePhonesAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();
    let query = admin.from('featurephones').select('*').order('management_number', { ascending: true });
    if (searchTerm) {
        query = query.or(`management_number.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,model_name.ilike.%${searchTerm}%,carrier.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function fetchRoutersAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('routers').select('*').order('no', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
}

export async function fetchRoutersPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`no.ilike.%${searchTerm}%,terminal_code.ilike.%${searchTerm}%,sim_number.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
        }
        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                no: 'no',
                terminalCode: 'terminal_code',
                contractYears: 'contract_years',
                status: 'status',
                employeeCode: 'employee_code',
                addressCode: 'address_code',
                simNumber: 'sim_number',
                ipAddress: 'ip_address'
            };
            for (const criterion of sortCriteria) {
                const dbKey = keyMap[criterion.key] || criterion.key;
                q = q.order(dbKey, { ascending: criterion.order === 'asc' });
            }
        } else {
            q = q.order('no', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        const km: Record<string, string> = {
            no: 'no',
            terminalCode: 'terminal_code',
            contractYears: 'contract_years',
            status: 'status',
            employeeCode: 'employee_code',
            addressCode: 'address_code',
            simNumber: 'sim_number',
            ipAddress: 'ip_address'
        };
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: km[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'no', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin, 
            tableName: 'routers', 
            highlightId, 
            pageSize, 
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`no.ilike.%${searchTerm}%,terminal_code.ilike.%${searchTerm}%,sim_number.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    let query = applyFiltersAndSort(admin.from('routers').select('*', { count: 'exact' }));
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    let { data, count, error } = await query;
    
    let wasFallback = false;
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('routers').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
        wasFallback = true;
    } else if (error) {
        throw new Error(error.message);
    }

    return { data: data || [], totalCount: count || 0, highlightPage, wasFallback };
}

export async function fetchRoutersAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();
    let query = admin.from('routers').select('*').order('no', { ascending: true });
    if (searchTerm) {
        query = query.or(`no.ilike.%${searchTerm}%,terminal_code.ilike.%${searchTerm}%,sim_number.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function fetchAreasAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();
    
    const allData: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
        const { data, error } = await admin.from('areas')
            .select('*')
            .order('area_code', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (error) throw new Error(error.message);

        if (data && data.length > 0) {
            allData.push(...data);
            if (data.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        } else {
            break;
        }
    }

    return allData;
}

export async function fetchAddressesAction() {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const allData: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
        const { data, error } = await admin.from('addresses')
            .select('*')
            .order('address_code', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (error) throw new Error(error.message);

        if (data && data.length > 0) {
            allData.push(...data);
            if (data.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        } else {
            break;
        }
    }

    return allData;
}
