import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/app.dart';

void main() {
  testWidgets('renders injected mobile shell', (WidgetTester tester) async {
    await tester.pumpWidget(
      const BDTrackerApp(
        home: Scaffold(
          body: Center(child: Text('Injected Home')),
        ),
      ),
    );

    expect(find.text('Injected Home'), findsOneWidget);
  });
}
