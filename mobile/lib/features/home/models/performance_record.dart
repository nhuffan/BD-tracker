class PerformanceRecord {
  const PerformanceRecord({
    required this.id,
    required this.eventDate,
    required this.bdId,
    required this.bdLevelId,
    required this.customerName,
    required this.customerTypeId,
    required this.pointTypeId,
    required this.category,
    required this.points,
    required this.money,
    required this.packageAmount,
    required this.note,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String eventDate;
  final String bdId;
  final String bdLevelId;
  final String customerName;
  final String customerTypeId;
  final String pointTypeId;
  final String category;
  final int points;
  final double? money;
  final double? packageAmount;
  final String? note;
  final String? createdAt;
  final String? updatedAt;

  factory PerformanceRecord.fromMap(Map<String, dynamic> map) {
    return PerformanceRecord(
      id: map['id'] as String,
      eventDate: map['event_date'] as String,
      bdId: map['bd_id'] as String,
      bdLevelId: map['bd_level_id'] as String,
      customerName: map['customer_name'] as String,
      customerTypeId: map['customer_type_id'] as String,
      pointTypeId: map['point_type_id'] as String,
      category: map['category'] as String,
      points: (map['points'] as num?)?.toInt() ?? 0,
      money: (map['money'] as num?)?.toDouble(),
      packageAmount: (map['package_amount'] as num?)?.toDouble(),
      note: map['note'] as String?,
      createdAt: map['created_at'] as String?,
      updatedAt: map['updated_at'] as String?,
    );
  }
}
