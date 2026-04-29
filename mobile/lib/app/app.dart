import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../features/auth/presentation/auth_gate.dart';

class BDTrackerApp extends StatelessWidget {
  const BDTrackerApp({super.key, this.home});

  final Widget? home;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BD Tracker',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: home ?? const AuthGate(),
    );
  }
}
