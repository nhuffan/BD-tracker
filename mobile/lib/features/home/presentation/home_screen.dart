import 'package:flutter/material.dart';

import '../models/home_tab_item.dart';
import '../widgets/home_header.dart';
import '../widgets/home_section_placeholder.dart';
import 'performance_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _tabs = [
    HomeTabItem(
      label: 'Performance',
      icon: Icons.bar_chart_rounded,
      title: 'Performance',
      description: 'Track records, points, customer activity, and recent BD performance.',
    ),
    HomeTabItem(
      label: 'Customers',
      icon: Icons.people_alt_rounded,
      title: 'Customers',
      description: 'Customer relationship tracking and follow-up visibility for the team.',
    ),
    HomeTabItem(
      label: 'Management',
      icon: Icons.verified_user_rounded,
      title: 'Management',
      description: 'System administration and personnel logistics.',
    ),
    HomeTabItem(
      label: 'Q&A',
      icon: Icons.forum_rounded,
      title: 'Q&A',
      description: 'Questions, tickets, and issue collaboration for the operations flow.',
    ),
    HomeTabItem(
      label: 'Approvals',
      icon: Icons.fact_check_rounded,
      title: 'Approvals',
      description: 'Approval requests and decision workflows for managers and admins.',
    ),
    HomeTabItem(
      label: 'Ads Tracking',
      icon: Icons.campaign_rounded,
      title: 'Ads Tracking',
      description: 'Campaign results and ad performance tracking from the web workspace.',
    ),
  ];

  int _currentIndex = 0;
  bool _isExpanded = false;

  void _selectTab(int index) {
    setState(() {
      _currentIndex = index;
      _isExpanded = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeTab = _tabs[_currentIndex];
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          Column(
            children: [
              Container(
                color: Colors.white,
                child: SafeArea(
                  bottom: false,
                  child: HomeHeader(
                    title: activeTab.title,
                    description: activeTab.description,
                  ),
                ),
              ),
              const Divider(height: 1, color: Color(0xFFE5E7EB)),
              Expanded(
                child: IndexedStack(
                  index: _currentIndex,
                  children: [
                    const PerformanceTab(),
                    for (final item in _tabs)
                      if (item != _tabs.first) HomeSectionPlaceholder(item: item),
                  ],
                ),
              ),
              const SizedBox(height: 92),
            ],
          ),
          Positioned(
            right: 24,
            bottom: 92,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (_isExpanded) ...[
                  _ExpandMenuItem(
                    label: _tabs[4].label,
                    icon: _tabs[4].icon,
                    selected: _currentIndex == 4,
                    onTap: () => _selectTab(4),
                  ),
                  const SizedBox(height: 10),
                  _ExpandMenuItem(
                    label: _tabs[5].label,
                    icon: _tabs[5].icon,
                    selected: _currentIndex == 5,
                    onTap: () => _selectTab(5),
                  ),
                  const SizedBox(height: 12),
                ],
                FloatingActionButton(
                  heroTag: 'home-more-fab',
                  onPressed: () {
                    setState(() {
                      _isExpanded = !_isExpanded;
                    });
                  },
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: theme.colorScheme.onPrimary,
                  elevation: 6,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(_isExpanded ? Icons.close_rounded : Icons.add_rounded, size: 34),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _HomeBottomBar(
              tabs: _tabs,
              currentIndex: _currentIndex,
              onPrimaryTap: _selectTab,
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeBottomBar extends StatelessWidget {
  const _HomeBottomBar({
    required this.tabs,
    required this.currentIndex,
    required this.onPrimaryTap,
  });

  final List<HomeTabItem> tabs;
  final int currentIndex;
  final ValueChanged<int> onPrimaryTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 84,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFE5E7EB)),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 18,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          for (final entry in [0, 1, 2, 3])
            Expanded(
              child: _PrimaryNavItem(
                icon: tabs[entry].icon,
                label: tabs[entry].label,
                selected: currentIndex == entry,
                onTap: () => onPrimaryTap(entry),
              ),
            ),
        ],
      ),
    );
  }
}

class _PrimaryNavItem extends StatelessWidget {
  const _PrimaryNavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconColor = selected
        ? theme.colorScheme.primary
        : const Color(0xFF9CA3AF);

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 28, color: iconColor),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
              color: iconColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExpandMenuItem extends StatelessWidget {
  const _ExpandMenuItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minWidth: 168),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x12000000),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: selected ? theme.colorScheme.primary : const Color(0xFF111827),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: selected ? theme.colorScheme.primary : const Color(0xFF111827),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
