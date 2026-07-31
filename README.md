# NutriCycle

A personalized wellness and menstrual cycle tracking application built with React Native and Expo. 

> [!NOTE]
> This build includes the latest backend configuration for Clerk, Supabase, and Stripe integration (Updated 2026-05-01).

## Features
- **Cycle Tracking**: Visualize and track menstrual cycle phases.
- **Wellness Center**: Meditations, yoga, and breathing exercises tailored to your current phase.
- **Nutrition**: Personalized recipe recommendations (Eat) for every stage of your cycle.
- **Inspiration**: A native-looking video library for wellness and nutrition tips.
- **Daily Log**: Track moods, symptoms, and hydration levels.

## Tech Stack
- React Native (0.81.5)
- Expo (SDK 54)
- React Navigation
- Lucide Icons
- YouTube Iframe Player

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/mahenoorsalat/app.git
   ```

2. Install dependencies:
   ```bash
   cd nutricycle_app
   npm install
   ```

3. Build and launch the iOS dev client once (required for native modules like Stripe):
   ```bash
   npx expo run:ios
   ```

4. Start Metro for the dev client:
   ```bash
   npm start
   ```

## Useful commands
1. Build for production
   ```bash
   
   ```