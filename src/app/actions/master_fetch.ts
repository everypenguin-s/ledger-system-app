'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { getSetupUserServer } from './auth_setup';
import type { PaginationParams } from './device_fetch';

const getSupabaseAdmin = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
};

export async function getHighlightPage({
    admin, 
    tableName, 
    highlightId, 
    pageSize, 
    applyFilters, 
    sortCriteria
}: {
    admin: any;
    tableName: string;
    highlightId: string;
    pageSize: number;
    applyFilters: (q: any) => any;
    sortCriteria: { column: string; ascending: boolean }[];
}): Promise<number | undefined> {
    // 1. Get the target record's sort values
    const { data: target, error: targetError } = await admin.from(tableName).select('*').eq('id', highlightId).single();
    if (targetError || !target) return undefined;

    if (sortCriteria.length === 0) return undefined;

    const primarySort = sortCriteria[0];
    const targetVal = target[primarySort.column];

    // 2. Count records strictly before the target's primary value
    let countBeforeQuery = admin.from(tableName).select('*', { count: 'exact', head: true });
    countBeforeQuery = applyFilters(countBeforeQuery);
    
    if (targetVal === null) {
        if (primarySort.ascending) {
            // NULLS LAST assumed: all non-null values come before NULL
            countBeforeQuery = countBeforeQuery.not(primarySort.column, 'is', null);
        } else {
            // NULLS LAST assumed: no values come before NULL in descending order
            countBeforeQuery = countBeforeQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // matches nothing
        }
    } else {
        if (primarySort.ascending) {
            countBeforeQuery = countBeforeQuery.lt(primarySort.column, targetVal);
        } else {
            countBeforeQuery = countBeforeQuery.gt(primarySort.column, targetVal);
        }
    }
    
    const { count: countBefore, error: countError } = await countBeforeQuery;
    if (countError) return undefined;

    // 3. Find target's position among records with the same primary value
    let tieQuery = admin.from(tableName).select('id');
    tieQuery = applyFilters(tieQuery);
    if (targetVal === null) {
        tieQuery = tieQuery.is(primarySort.column, null);
    } else {
        tieQuery = tieQuery.eq(primarySort.column, targetVal);
    }
    
    for (const { column, ascending } of sortCriteria) {
        tieQuery = tieQuery.order(column, { ascending, nullsFirst: false });
    }
    if (!sortCriteria.some(s => s.column === 'id')) {
        tieQuery = tieQuery.order('id', { ascending: true });
    }

    const { data: ties, error: tieError } = await tieQuery;
    if (tieError || !ties) return undefined;

    const innerIndex = ties.findIndex((t: any) => t.id === highlightId);
    if (innerIndex === -1) return undefined;

    const totalIndex = (countBefore || 0) + innerIndex;
    return Math.ceil((totalIndex + 1) / pageSize);
}

const checkAuth = async () => {
    // 1. 初期セットアップアカウント（999999）のクッキーを先に確認する
    //    このアカウントは Supabase Auth を持たないため、専用クッキーで認証する
    const setupUser = await getSetupUserServer();
    if (setupUser) return setupUser;

    // 2. 通常の Supabase Auth セッションを確認する
    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore as any });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    return user;
};

// --- Employees ---
export async function fetchEmployeesPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const keyMap: Record<string, string> = {
        code: 'employee_code',
        name: 'name',
        nameKana: 'name_kana',
        email: 'email',
        joinDate: 'join_date',
        role: 'authority',
        areaCode: 'area_code',
        addressCode: 'address_code',
    };

    let query = admin.from('employees').select('*', { count: 'exact' });

    if (searchTerm) {
        query = query.or(`employee_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,name_kana.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Consolidate sorting and pagination to DB-side for performance
    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`employee_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,name_kana.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        if (sortCriteria && sortCriteria.length > 0) {
            for (const { key, order } of sortCriteria) {
                const dbKey = keyMap[key] || key;
                q = q.order(dbKey, { ascending: order === 'asc', nullsFirst: false });
            }
        } else {
            // Default sort: employee_code
            q = q.order('employee_code', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: keyMap[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'employee_code', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin,
            tableName: 'employees',
            highlightId,
            pageSize,
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`employee_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,name_kana.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    query = applyFiltersAndSort(admin.from('employees').select('*', { count: 'exact' }));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let { data, count, error } = await query.range(from, to);
    
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('employees').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
    } else if (error) {
        throw new Error(error.message);
    }

    return {
        data: data || [],
        totalCount: count || 0,
        highlightPage
    };
}


export async function fetchEmployeesAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const allData: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
        let query = admin.from('employees')
            .select('*')
            .order('employee_code', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (searchTerm) {
            query = query.or(`employee_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,name_kana.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
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

// --- Addresses (Offices) ---
export async function fetchAddressesPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`no.ilike.%${searchTerm}%,address_code.ilike.%${searchTerm}%,office_name.ilike.%${searchTerm}%,tel.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,supervisor.ilike.%${searchTerm}%`);
        }

        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                no: 'no',
                addressCode: 'address_code',
                officeName: 'office_name',
                tel: 'tel',
                fax: 'fax',
                type: 'category',
                zipCode: 'zip',
                address: 'address',
                notes: 'notes',
                supervisor: 'supervisor',
                area: 'area'
            };
            for (const { key, order } of sortCriteria) {
                const dbKey = keyMap[key] || key;
                q = q.order(dbKey, { ascending: order === 'asc', nullsFirst: false });
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
            addressCode: 'address_code',
            officeName: 'office_name',
            tel: 'tel',
            fax: 'fax',
            type: 'category',
            zipCode: 'zip',
            address: 'address',
            notes: 'notes',
            supervisor: 'supervisor',
            area: 'area'
        };
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: km[s.key] || s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'no', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin,
            tableName: 'addresses',
            highlightId,
            pageSize,
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`no.ilike.%${searchTerm}%,address_code.ilike.%${searchTerm}%,office_name.ilike.%${searchTerm}%,tel.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,supervisor.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    let query = applyFiltersAndSort(admin.from('addresses').select('*', { count: 'exact' }));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let { data, count, error } = await query.range(from, to);
    
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('addresses').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
    } else if (error) {
        throw new Error(error.message);
    }

    return {
        data: data || [],
        totalCount: count || 0,
        highlightPage
    };
}

export async function fetchAddressesAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();
    
    const allData: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
        let query = admin.from('addresses')
            .select('*')
            .order('no', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (searchTerm) {
            query = query.or(`no.ilike.%${searchTerm}%,address_code.ilike.%${searchTerm}%,office_name.ilike.%${searchTerm}%,tel.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,supervisor.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
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

// --- Areas ---
export async function fetchAreasPaginatedAction({ page, pageSize, searchTerm, sortCriteria, highlightId }: PaginationParams) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const applyFiltersAndSort = (baseQuery: any) => {
        let q = baseQuery;
        if (searchTerm) {
            q = q.or(`area_code.ilike.%${searchTerm}%,area_name.ilike.%${searchTerm}%`);
        }

        if (sortCriteria && sortCriteria.length > 0) {
            const keyMap: Record<string, string> = {
                areaCode: 'area_code',
                areaName: 'area_name'
            };
            for (const { key, order } of sortCriteria) {
                const dbKey = keyMap[key] || key;
                q = q.order(dbKey, { ascending: order === 'asc', nullsFirst: false });
            }
        } else {
            q = q.order('area_code', { ascending: true });
        }
        return q;
    };

    let highlightPage: number | undefined;
    if (highlightId) {
        const criteria: { column: string; ascending: boolean }[] = [];
        if (sortCriteria && sortCriteria.length > 0) {
            sortCriteria.forEach(s => criteria.push({ column: s.key === 'areaCode' ? 'area_code' : s.key === 'areaName' ? 'area_name' : s.key, ascending: s.order === 'asc' }));
        } else {
            criteria.push({ column: 'area_code', ascending: true });
        }

        highlightPage = await getHighlightPage({
            admin,
            tableName: 'areas',
            highlightId,
            pageSize,
            applyFilters: (q) => {
                if (searchTerm) {
                    return q.or(`area_code.ilike.%${searchTerm}%,area_name.ilike.%${searchTerm}%`);
                }
                return q;
            },
            sortCriteria: criteria
        });
    }

    let query = applyFiltersAndSort(admin.from('areas').select('*', { count: 'exact' }));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let { data, count, error } = await query.range(from, to);
    
    if (error && error.code === 'PGRST103') {
        const fallbackQuery = applyFiltersAndSort(admin.from('areas').select('*', { count: 'exact' }))
            .range(0, pageSize - 1);
        const fallback = await fallbackQuery;
        if (fallback.error) throw new Error(fallback.error.message);
        data = fallback.data;
        count = fallback.count;
    } else if (error) {
        throw new Error(error.message);
    }

    return {
        data: data || [],
        totalCount: count || 0,
        highlightPage
    };
}

export async function fetchAreasAllAction(searchTerm?: string) {
    await checkAuth();
    const admin = getSupabaseAdmin();

    const allData: any[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
        let query = admin.from('areas')
            .select('*')
            .order('area_code', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);
        
        if (searchTerm) {
            query = query.or(`area_code.ilike.%${searchTerm}%,area_name.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
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
