# BD Tracker Mobile

A Flutter mobile application for BD tracking.

## Prerequisites

- Flutter SDK (3.11.5 or later)
- Dart SDK
- Supabase project and credentials

## Setup Instructions

### 1. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

   You can find these values in your Supabase project dashboard:
   - Go to Settings → API
   - Copy the "Project URL" and "Anon public key"

### 2. Install Dependencies

```bash
flutter pub get
```

### 3. Run the App

```bash
flutter run
```

## Debugging Database Connection

The app includes comprehensive logging for debugging:

1. **Check Dart DevTools Console** for connection logs:
   - Look for "Checking Supabase connection..."
   - Check if "Status: Connected ✓" appears

2. **Check the UI**:
   - A green status bar means the database connection is successful
   - A red status bar means there's a connection issue

3. **Common Issues**:
   - ❌ **Missing .env file**: Create `.env` with your Supabase credentials
   - ❌ **Wrong credentials**: Double-check SUPABASE_URL and SUPABASE_ANON_KEY
   - ❌ **No data in database**: The 'masters' table might be empty or have no records with category='bd'

## Project Structure

```
lib/
  main.dart          # Main app entry point with database connection
```

## Features

- ✅ Supabase integration for real-time database
- ✅ Fetches BD masters from database
- ✅ Connection status indicator
- ✅ Comprehensive error handling and logging
- ✅ Pull-to-refresh functionality

## Learn More

- [Flutter Documentation](https://docs.flutter.dev/)
- [Supabase Flutter Guide](https://supabase.com/docs/reference/dart/introduction)

