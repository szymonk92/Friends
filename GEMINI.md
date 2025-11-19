# Friends Mobile App - GEMINI Analysis

This document provides a summary of the Friends mobile application's architecture, tools, and dependencies.

## 🎯 App Description

**Friends** is an intelligent relationship management application that helps you capture and remember meaningful details about the people in your life. By writing natural stories about your experiences, our AI automatically extracts and organizes preferences, shared memories, and connections—so you never forget that your friend Ola loves ice cream or that you've visited Italy together multiple times.

The mobile app, built with Expo (React Native), brings the power of Friends to your fingertips, with a focus on local-first data storage to ensure privacy and offline availability.

## 🏗️ Architecture: Mobile

The Friends mobile application is built using a modern, local-first architecture.

*   **Framework:** The application is built with **React Native** and the **Expo** framework, allowing for a single codebase to target both iOS and Android.
*   **Routing:** Navigation is handled by **Expo Router**, which provides a file-system-based routing solution.
*   **Database:** The app uses a local-first approach with **Drizzle ORM** and **expo-sqlite** as the database driver. This ensures that user data is stored on the device, providing offline access and enhanced privacy.
*   **State Management:** Application state is managed with a combination of **Zustand** for global state and **React Query** for managing server state and caching.
*   **Styling:** The UI is styled using **React Native Paper** for Material Design components and **React Native SVG** for custom vector graphics.
*   **Form Handling:** Forms are managed with **React Hook Form** for a flexible and performant solution.
*   **Type Checking:** The codebase is written in **TypeScript** to ensure type safety and improve developer experience.
*   **Linting & Formatting:** Code quality is maintained with **ESLint** and **Prettier**.
*   **Testing:** The application is tested using **Jest** and **React Testing Library**.

## 🛠️ Tools and Versions

Here is a list of the key tools and libraries used in the Friends mobile app, along with their versions.

### Core Dependencies

| Library                     | Version    | Description                                      |
| --------------------------- | ---------- | ------------------------------------------------ |
| `expo`                      | `~54.0.25` | Core Expo framework                              |
| `react`                     | `19.1.0`   | JavaScript library for building user interfaces  |
| `react-native`              | `0.81.5`   | Framework for building native apps with React    |
| `expo-router`               | `~6.0.15`  | File-system based router for React Native & web  |
| `drizzle-orm`               | `^0.44.7`  | TypeScript ORM for SQL databases                 |
| `expo-sqlite`               | `^16.0.9`  | SQLite database driver for Expo                  |
| `zustand`                   | `^5.0.8`   | Small, fast and scalable state-management        |
| `@tanstack/react-query`     | `^5.90.7`  | Data-fetching and caching for React              |
| `react-native-paper`        | `^5.14.5`  | Material Design components for React Native      |
| `react-hook-form`           | `^7.66.0`  | Performant, flexible and extensible forms        |
| `@anthropic-ai/sdk`         | `^0.68.0`  | Anthropic AI SDK for Node.js and browsers        |

### Development Dependencies

| Library                     | Version    | Description                                      |
| --------------------------- | ---------- | ------------------------------------------------ |
| `typescript`                | `~5.9.2`   | Typed superset of JavaScript                     |
| `jest`                      | `^30.2.0`  | JavaScript testing framework                     |
| `@testing-library/react-native` | `^13.3.3`  | Testing utilities for React Native               |
| `eslint`                    | (not specified) | Linter for identifying and fixing problems in code |
| `prettier`                  | `^3.6.2`   | Code formatter                                   |
| `drizzle-kit`               | `^0.31.6`  | CLI for Drizzle ORM                              |
