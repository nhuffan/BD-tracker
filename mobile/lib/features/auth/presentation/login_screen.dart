import 'package:flutter/material.dart';

import '../../../app/supabase.dart';
import '../widgets/login_form_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _message;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    FocusScope.of(context).unfocus();

    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      final response = await supabase.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (response.session == null) {
        setState(() {
          _message = 'Invalid email or password.';
        });
        return;
      }

      setState(() {
        _message = 'Login successful. Redirecting...';
      });
    } catch (_) {
      setState(() {
        _message = 'Invalid email or password.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFFFFF), Color(0xFFF5F5F5)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: LoginFormCard(
                emailController: _emailController,
                passwordController: _passwordController,
                isLoading: _isLoading,
                message: _message,
                onSubmit: _signIn,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
