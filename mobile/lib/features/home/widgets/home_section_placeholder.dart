import 'package:flutter/material.dart';

import '../../../core/widgets/status_placeholder.dart';
import '../models/home_tab_item.dart';

class HomeSectionPlaceholder extends StatelessWidget {
  const HomeSectionPlaceholder({
    super.key,
    required this.item,
  });

  final HomeTabItem item;

  @override
  Widget build(BuildContext context) {
    return StatusPlaceholder(
      title: item.title,
      description: item.description,
      icon: item.icon,
    );
  }
}
