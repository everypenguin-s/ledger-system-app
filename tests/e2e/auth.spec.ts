import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  // auth.setup.ts によってすでにログイン済み状態でのテスト
  test('ログイン状態でトップページまたはダッシュボードにアクセスできる', async ({ page }) => {
    // baseURL が http://localhost:3000 なので '/' にアクセス
    await page.goto('/');
    // システムにリダイレクトされるか、そのまま維持されることを確認
    // （未認証の場合は/loginにリダイレクトされるため）
    await expect(page).not.toHaveURL(/\/login/);
  });

  // 未認証状態をテストするため別コンテキストを使用する
  test('未認証の場合はログインページにリダイレクトされる', async ({ browser }) => {
    // storageState なしの新しいコンテキストを作成
    const context = await browser.newContext({ storageState: undefined });
    const unauthPage = await context.newPage();

    await unauthPage.goto('/');
    
    // アプリのミドルウェアによって /login にリダイレクトされるはず
    await expect(unauthPage).toHaveURL(/\/login/);
    await context.close();
  });
});
