/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
                module: 'commonjs',
                moduleResolution: 'node',
                esModuleInterop: true,
            },
        }],
    },
    testMatch: [
        '**/__tests__/**/*.test.(ts|tsx)',
        '**/?(*.)+(spec|test).(ts|tsx)',
    ],
    collectCoverageFrom: [
        'src/lib/utils/**/*.ts',
        'src/features/employees/logic/**/*.ts',
        'src/features/notifications/hooks/**/*.ts',
        'src/features/context/DataContext.tsx',
        '!src/**/*.d.ts',
    ],
    transformIgnorePatterns: [
        '/node_modules/(?!(@supabase|jose|uuid|react-hot-toast)/)'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    testPathIgnorePatterns: ['/node_modules/', '/.next/'],
    extensionsToTreatAsEsm: [],
};

module.exports = config;
