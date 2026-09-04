-- Client feedback: AI Macros should evaluate whether a meal is good or bad
-- for the user's current state, not just report its raw macros — and that
-- evaluation should read exactly like AI Chat would (same voice/context),
-- not a separately-tuned tone. See mealAnalysisService.js's buildPrompt(),
-- which now reuses aiService.js's SYSTEM_PROMPT + buildContextBlock and asks
-- Gemini for this as one more field alongside items/phase_note, all in the
-- same multimodal call (not a second round-trip).

alter table public.meal_logs
  add column if not exists ai_evaluation text;
