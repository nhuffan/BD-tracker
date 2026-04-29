import 'package:flutter/material.dart';

ThemeData buildAppTheme() {
  const background = Color(0xFFFFFFFF);
  const foreground = Color(0xFF171717);
  const card = Color(0xFFFFFFFF);
  const muted = Color(0xFFF5F5F5);
  const mutedForeground = Color(0xFF737373);
  const border = Color(0xFFE5E5E5);
  const primary = Color(0xFF171717);
  const primaryForeground = Color(0xFFFAFAFA);
  const secondaryForeground = Color(0xFF171717);

  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: primaryForeground,
    secondary: muted,
    onSecondary: secondaryForeground,
    error: Color(0xFFE11D48),
    onError: Colors.white,
    surface: background,
    onSurface: foreground,
  );

  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: background,
    useMaterial3: true,
    dividerColor: border,
    textTheme: const TextTheme(
      headlineSmall: TextStyle(color: foreground),
      titleLarge: TextStyle(color: foreground),
      titleMedium: TextStyle(color: foreground),
      bodyLarge: TextStyle(color: foreground),
      bodyMedium: TextStyle(color: foreground),
      bodySmall: TextStyle(color: mutedForeground),
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      backgroundColor: Colors.white,
      foregroundColor: foreground,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: border),
      ),
    ),
    tabBarTheme: const TabBarThemeData(
      labelColor: foreground,
      unselectedLabelColor: mutedForeground,
      indicatorColor: primary,
      dividerColor: border,
      labelStyle: TextStyle(fontWeight: FontWeight.w700),
      unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w600),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: card,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primary, width: 1.2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: primaryForeground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),
  );
}
