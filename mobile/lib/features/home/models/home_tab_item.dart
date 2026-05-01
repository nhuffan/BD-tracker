import 'package:flutter/material.dart';

class HomeTabItem {
  const HomeTabItem({
    required this.label,
    required this.icon,
    required this.title,
    required this.description,
  });

  final String label;
  final IconData icon;
  final String title;
  final String description;
}
