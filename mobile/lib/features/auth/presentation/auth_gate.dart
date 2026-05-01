import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../app/supabase.dart';
import '../../home/presentation/home_screen.dart';
import 'login_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: supabase.auth.onAuthStateChange,
      initialData: AuthState(AuthChangeEvent.initialSession, supabase.auth.currentSession),
      builder: (context, snapshot) {
        final session = snapshot.data?.session ?? supabase.auth.currentSession;

        if (session == null) {
          return const LoginScreen();
        }

        return const HomeScreen();
      },
    );
  }
}
