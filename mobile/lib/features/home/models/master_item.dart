class MasterItem {
  const MasterItem({
    required this.id,
    required this.category,
    required this.code,
    required this.label,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String category;
  final String code;
  final String label;
  final int sortOrder;
  final bool isActive;

  factory MasterItem.fromMap(Map<String, dynamic> map) {
    return MasterItem(
      id: map['id'] as String,
      category: map['category'] as String,
      code: map['code'] as String? ?? '',
      label: map['label'] as String? ?? '',
      sortOrder: (map['sort_order'] as num?)?.toInt() ?? 0,
      isActive: map['is_active'] as bool? ?? false,
    );
  }
}
