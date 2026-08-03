# NutriCycle — Feature Analysis

**Bundle:** `com.salatmahenoor.nutricycle`  
**Framework:** Expo SDK 54 (React Native)  
**Backend:** Supabase + Clerk + Google Gemini  
**Date:** July 2026

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented & working |
| ⚠️ | Partial / needs work |
| ❌ | Not working / blocked |
| ♻️ | Legacy / to remove |

---

## Summary

| Metric | Count |
|--------|-------|
| Total Screens | 24 |
| Services | 14 |
| Implemented ✅ | 19 |
| Partial / Pending ⚠️ | 4 |
| Languages supported | 2 (ES / EN) |

---

## 1. Authentication & Onboarding

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Onboarding (3 screens) | ✅ Done | iOS + Android | Order: Tu cocina → Sana → Tu ciclo. Siguiente / Comenzar buttons correct. |
| Email / Password Login | ✅ Done | iOS + Android | Clerk. Sign in + sign up with email verification code flow. |
| Google OAuth Login | ✅ Done | iOS + Android | `startSSOFlow` + Clerk OAuth strategy. |
| Apple Sign In | ✅ Done | iOS only | Hidden on Android (correct). `usesAppleSignIn: true` in app.json. Requires EAS iOS build to test. |
| Demo Mode | ✅ Done | iOS + Android | Activated via `nutricycle_demo_mode` AsyncStorage flag. `BYPASS_CLERK` driven by `isDemoMode` state — never hardcoded. |

---

## 2. Cycle Setup

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Cycle Wizard | ✅ Done | iOS + Android | 2-step: last period date + cycle length / period length / goal. Shown once after login. Saved to Supabase. |
| Period Calculator | ✅ Done | iOS + Android | Standalone calculator. Interactive calendar picker + stepper controls. |

---

## 3. Dashboard

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Personalized Greeting | ✅ Done | iOS + Android | Time-based: morning / afternoon / evening with user's first name. |
| Hormone Chart (SVG) | ✅ Done | iOS + Android | Animated estrogen/progesterone curves across cycle. Day badge text fix applied (static `SvgText`). Days until period shown. |
| Phase Information | ✅ Done | iOS + Android | Current phase card with tips and key foods. 4 phases: menstrual, follicular, ovulation, luteal. |
| Quick-access Shortcuts | ✅ Done | iOS + Android | Buttons to Recipes, Videos, AI Chat, Daily Log, Shopping List. |

---

## 4. Cycle Calendar

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Phase Arc Calendar (SVG) | ✅ Done | iOS + Android | Circular calendar with phase arcs, fertile window, period days. Orbit dot removed per client request. Center text size reduced. |
| Weekly Strip View | ✅ Done | iOS + Android | Scrollable week row with phase-colored day dots. |
| Daily Log Integration | ✅ Done | iOS + Android | View and delete past symptom logs from calendar. Synced to Supabase. |

---

## 5. Nutrition & Recipes

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Weekly Meal Plan | ✅ Done | iOS + Android | Phase-based: breakfast / lunch / snack / dinner. Macro calculator per slot. Regenerate button. Persisted in AsyncStorage. |
| Recipe Library | ✅ Done | iOS + Android | Filter by phase and meal type. Loaded from Supabase. Bookmark (save) support. |
| Recipe Detail | ✅ Done | iOS + Android | Full ingredients, steps, macros, phase tag. |
| Saved Recipes | ✅ Done | iOS + Android | Bookmarked collection per user. IDs synced to Supabase. |
| Key Foods Guide | ✅ Done | iOS + Android | Phase-specific foods with hormone benefit tags (estrogen, progesterone, anti-inflammatory, energy). Add-to-shopping-list shortcut. |
| Shopping List | ✅ Done | iOS + Android | Auto-generated from phase foods + recipes. Custom items. Check-off. Persisted in AsyncStorage per user. |

---

## 6. Videos

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Video Library | ✅ Done | iOS + Android | YouTube + uploaded videos. Filter by phase. Search. Inline player. `videos.search_placeholder` translation bug fixed. |

---

## 7. AI Features

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| AI Chat (NutriCycle AI) | ✅ Done | iOS + Android | Conversational health advisor. Aware of current cycle phase and day. Powered by Google Gemini 2.0 Flash. |
| AI Cycle Predictor | ⚠️ Premium only | iOS + Android | Locked behind Premium subscription. Non-premium users see upgrade prompt. |

---

## 8. Health Tracking

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Daily Log | ✅ Done | iOS + Android | Symptoms, mood (4 levels), energy (3 levels), custom notes. History view + edit / delete. Synced to Supabase. |
| Hydration Tracker | ⚠️ Local only | iOS + Android | Water intake with glass / bottle / thermos shortcuts. State resets on app reload — not persisted to DB. Goal fixed at 2500ml. |
| Wellness Activities | ✅ Done | iOS + Android | Guided activities (yoga, meditation, breathing) with countdown timer + pause/resume. YouTube videos embedded. |

---

## 9. Content & Articles

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Article Library | ✅ Done | iOS + Android | Health and nutrition articles. Reading time + bookmark support. Auto-translated via Gemini on language change. Loaded from Supabase with static fallback. |

---

## 10. Notifications

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Smart In-App Notifications | ✅ Done | iOS + Android | Phase change alerts, recipe suggestions, log reminders, cycle milestones. Read/unread state in AsyncStorage. Built from daily logs + cycle data. |

---

## 11. Settings & Profile

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Settings Screen | ✅ Done | iOS + Android | Language toggle (ES/EN), notification switch, password change, logout, subscription info. Admin panel link for admin users only. |
| Edit Profile | ✅ Done | iOS + Android | Change name, avatar photo upload via `expo-image-picker`. Saved to Supabase. |

---

## 12. Subscription & Payment

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| RevenueCat — iOS App Store | ✅ Done | iOS only | Monthly + Annual plans. Live pricing from App Store. Restore purchase button. Entitlement: `Nutricycle Pro`. Requires EAS iOS build to test. |
| RevenueCat — Google Play | ❌ Pending | Android | Waiting for client's Google Play RevenueCat SDK key (`goog_...`) and Play Store product IDs confirmation. |
| Stripe | ♻️ Legacy | — | `stripeService.js` and `StripeWrapper` components remain but are unused. Safe to delete. |

> **Action needed:** Client must provide the RevenueCat Android SDK key and confirm Google Play subscription product IDs:
> - `com.salatmahenoor.nutricycle.monthly`
> - `com.salatmahenoor.nutricycle.annual`

---

## 13. Admin Panel

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Content Management | ✅ Done | iOS + Android | Upload / edit / delete videos and recipes. Image upload. Premium toggle per item. Accessible only to users with `role: admin` in Clerk public metadata. |

---

## 14. Localization (i18n)

| Feature | Status | Platform | Notes |
|---------|--------|----------|-------|
| Spanish / English UI | ✅ Done | iOS + Android | Spanish is default. Manual toggle in Settings. All translation keys present. |
| AI Auto-Translation | ✅ Done | iOS + Android | Dynamic content (recipes, articles, videos) auto-translated via Gemini on language change. Runs progressively. |

---

## 15. Infrastructure & Backend Services

| Service | Status | Platform | Notes |
|---------|--------|----------|-------|
| Supabase (Database) | ✅ Done | iOS + Android | Profiles, recipes, videos, articles, daily logs, subscriptions, saved recipes, key foods. Authenticated via Clerk JWT. Project: `oeylybzkyujzcbkmvenj`. |
| Clerk (Auth) | ✅ Done | iOS + Android | User management, OAuth, session tokens, admin roles. Token cached in SecureStore. Apple SSO enabled. |
| Google Gemini 2.0 Flash | ✅ Done | iOS + Android | AI chat, cycle predictions, content translation. Requires `EXPO_PUBLIC_GEMINI_API_KEY`. |
| RevenueCat SDK | ✅ iOS / ❌ Android | iOS ready | `react-native-purchases` dynamically imported. iOS API key configured. Android key pending from client. |
| Push Notifications | ⚠️ Permission only | iOS + Android | Permission requested on app launch. No push sending implemented yet. |

---

## Pending Actions

1. **Google Play billing** — Client to provide RevenueCat Android SDK key (`goog_...`) and confirm Play Store product IDs.
2. **Hydration persistence** — Water intake resets on reload; needs AsyncStorage or Supabase persistence if required.
3. **Push notification sending** — Permission is requested but no actual push messages are sent yet.
4. **Stripe cleanup** — `stripeService.js`, `StripeWrapper.js`, `StripeWrapper.native.js`, `StripeWrapper.web.js` can be deleted once Google Play billing is confirmed working.

---

## Build Commands

```bash
# Android APK (preview/testing)
eas build -p android --profile preview

# iOS (TestFlight / internal testing)
eas build --platform ios --profile preview

# iOS (App Store production)
eas build --platform ios --profile production
eas submit -p ios
```
