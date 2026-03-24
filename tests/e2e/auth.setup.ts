import { test as setup, expect } from '@playwright/test';
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // ログインページへ移動
  await page.goto('/login');
  
  // ユーザー指定のテスト用アカウント
  await page.fill('input[name="employee-code"]', '9800465');
  await page.fill('input[name="employee-password"]', '20021107');
  
  // ログイン実行
  await page.click('button[type="submit"]');

  // ログイン完了通知（Toast等）や遷移を待機
  // 管理者の場合は '/'、一般ユーザーは '/dashboard' に遷移するため両方許容する
  await expect(page).toHaveURL(/\/(dashboard)?$/);
  
  // ナビゲーションや状態が安定するまで少し待機
  await page.waitForLoadState('networkidle');

  // セッション状態（クッキー、ローカルストレージ）を保存
  await page.context().storageState({ path: authFile });
});
