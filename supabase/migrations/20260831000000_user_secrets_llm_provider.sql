-- Chọn nhà cung cấp LLM theo từng tài khoản (yêu cầu user 2026-08-31):
-- Gemini là mặc định (dùng key hệ thống nếu chưa đặt key riêng, như cũ).
-- OpenAI là opt-in — CHỈ kích hoạt khi user tự nhập openai_api_key của họ.
-- KHÔNG có key OpenAI mặc định/hệ thống trong bất kỳ trường hợp nào, nên
-- KHÔNG cần cột "use_own_key" song song cho OpenAI như Gemini.
--
-- THÊM cột → an toàn dán TRƯỚC khi deploy code.
--
-- Không cần policy/GRANT mới: "user_secrets_own" (for all, user_id = auth.uid())
-- đã phủ theo DÒNG, tự động áp cho 2 cột mới này.
alter table public.user_secrets
  add column if not exists provider text not null default 'gemini'
    check (provider in ('gemini', 'openai')),
  add column if not exists openai_api_key text;
