import 'package:flutter/material.dart';

import '../data/performance_repository.dart';
import '../models/master_item.dart';
import '../models/performance_record.dart';

class PerformanceTab extends StatefulWidget {
  const PerformanceTab({super.key});

  @override
  State<PerformanceTab> createState() => _PerformanceTabState();
}

class _PerformanceTabState extends State<PerformanceTab> {
  final _repository = PerformanceRepository();
  final _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  String _searchQuery = '';
  List<PerformanceRecord> _rows = [];
  List<MasterItem> _bdItems = const [];
  List<MasterItem> _levelItems = const [];
  List<MasterItem> _customerTypeItems = const [];
  List<MasterItem> _pointTypeItems = const [];
  Map<String, String> _bdMap = const {};
  Map<String, String> _levelMap = const {};
  Map<String, String> _customerTypeMap = const {};
  Map<String, String> _pointTypeMap = const {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _repository.fetchRecords(),
        _repository.fetchMasters('bd'),
        _repository.fetchMasters('bd_level'),
        _repository.fetchMasters('customer_type'),
        _repository.fetchMasters('point_type'),
      ]);

      final rows = results[0] as List<PerformanceRecord>;
      final bd = results[1] as List<MasterItem>;
      final levels = results[2] as List<MasterItem>;
      final customerTypes = results[3] as List<MasterItem>;
      final pointTypes = results[4] as List<MasterItem>;

      if (!mounted) {
        return;
      }

      setState(() {
        _rows = rows;
        _bdItems = bd;
        _levelItems = levels;
        _customerTypeItems = customerTypes;
        _pointTypeItems = pointTypes;
        _bdMap = _toLookup(bd);
        _levelMap = _toLookup(levels);
        _customerTypeMap = _toLookup(customerTypes);
        _pointTypeMap = _toLookup(pointTypes);
      });
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Map<String, String> _toLookup(List<MasterItem> items) {
    return {
      for (final item in items) item.id: item.label,
    };
  }

  List<PerformanceRecord> _filteredRows() {
    final keyword = _searchQuery.trim().toLowerCase();

    return _rows.where((row) {
      if (keyword.isEmpty) {
        return true;
      }

      final categoryLabel =
          row.category == 'restaurant' ? 'restaurant' : 'entertainment';

      return row.customerName.toLowerCase().contains(keyword) ||
          categoryLabel.contains(keyword) ||
          (row.note ?? '').toLowerCase().contains(keyword) ||
          (_bdMap[row.bdId] ?? row.bdId).toLowerCase().contains(keyword) ||
          (_levelMap[row.bdLevelId] ?? row.bdLevelId).toLowerCase().contains(keyword) ||
          (_customerTypeMap[row.customerTypeId] ?? row.customerTypeId)
              .toLowerCase()
              .contains(keyword) ||
          (_pointTypeMap[row.pointTypeId] ?? row.pointTypeId)
              .toLowerCase()
              .contains(keyword);
    }).toList();
  }

  Future<void> _deleteRecord(PerformanceRecord row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete record?'),
          content: Text('This will delete "${row.customerName}".'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    try {
      await _repository.deleteRecord(row.id);
      await _loadData();
      _showMessage('Record deleted.');
    } catch (e) {
      _showMessage('Delete failed: $e');
    }
  }

  Future<void> _openRecordForm({PerformanceRecord? initialRecord}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: RecordFormSheet(
            initialRecord: initialRecord,
            bdItems: _bdItems,
            levelItems: _levelItems,
            customerTypeItems: _customerTypeItems,
            pointTypeItems: _pointTypeItems,
            onSubmit: (payload) async {
              if (initialRecord == null) {
                await _repository.createRecord(payload);
              } else {
                await _repository.updateRecord(initialRecord.id, payload);
              }
            },
          ),
        );
      },
    );

    if (saved == true) {
      await _loadData();
      _showMessage(initialRecord == null ? 'Record created.' : 'Record updated.');
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Unable to load performance data.',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF737373)),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadData,
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    final filteredRows = _filteredRows();

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Row(
            children: [
              Expanded(
                flex: 7,
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search ...',
                    hintStyle: const TextStyle(fontSize: 14),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF3F4F6),
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    suffixIcon: _searchQuery.isEmpty
                        ? null
                        : IconButton(
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                            icon: const Icon(Icons.close_rounded, size: 18),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Flexible(
                flex: 3,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 112),
                  child: SizedBox(
                    height: 44,
                    child: FilledButton.icon(
                      onPressed: () => _openRecordForm(),
                      style: FilledButton.styleFrom(
                        elevation: 0,
                        backgroundColor: const Color(0xFF1565C0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'Create',
                          maxLines: 1,
                          softWrap: false,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (filteredRows.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(
                child: Text(
                  'No records found',
                  style: TextStyle(color: Color(0xFF737373)),
                ),
              ),
            ),
          for (final row in filteredRows)
            _RecordCard(
              row: row,
              bdMap: _bdMap,
              levelMap: _levelMap,
              customerTypeMap: _customerTypeMap,
              pointTypeMap: _pointTypeMap,
              onEdit: () => _openRecordForm(initialRecord: row),
              onDelete: () => _deleteRecord(row),
            ),
        ],
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.row,
    required this.bdMap,
    required this.levelMap,
    required this.customerTypeMap,
    required this.pointTypeMap,
    required this.onEdit,
    required this.onDelete,
  });

  final PerformanceRecord row;
  final Map<String, String> bdMap;
  final Map<String, String> levelMap;
  final Map<String, String> customerTypeMap;
  final Map<String, String> pointTypeMap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final isRestaurant = row.category == 'restaurant';
    const iconColor = Color(0xFF737373);

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(
                    isRestaurant
                        ? Icons.storefront_rounded
                        : Icons.auto_awesome_rounded,
                    size: 18,
                    color: iconColor,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    row.customerName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: Color(0xFF171717),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: onEdit,
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Edit',
                  icon: const Icon(Icons.edit_outlined, size: 20),
                ),
                IconButton(
                  onPressed: onDelete,
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Delete',
                  icon: const Icon(Icons.delete_outline_rounded, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _MetaRow(label: 'Date', value: _formatDate(row.eventDate)),
            _MetaRow(label: 'BD Name', value: bdMap[row.bdId] ?? row.bdId),
            _MetaRow(label: 'BD Level', value: levelMap[row.bdLevelId] ?? row.bdLevelId),
            _MetaRow(
              label: 'Customer Type',
              value: customerTypeMap[row.customerTypeId] ?? row.customerTypeId,
            ),
            _MetaRow(
              label: 'Point Type',
              value: pointTypeMap[row.pointTypeId] ?? row.pointTypeId,
            ),
            _MetaRow(label: 'Category', value: isRestaurant ? 'Restaurant' : 'Entertainment'),
            _MetaRow(
              label: 'Package Amount',
              value: row.packageAmount == null ? '—' : _formatNumber(row.packageAmount!),
            ),
            _MetaRow(label: 'Points', value: _formatNumber(row.points.toDouble())),
            _MetaRow(
              label: 'Bonus',
              value: row.money == null ? '—' : _formatNumber(row.money!),
            ),
            _MetaRow(label: 'Note', value: (row.note ?? '').trim().isEmpty ? '—' : row.note!.trim()),
          ],
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 122,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.clip,
              style: const TextStyle(
                color: Color(0xFF737373),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Text(
              value,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF171717),
                fontWeight: FontWeight.w600,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class RecordFormSheet extends StatefulWidget {
  const RecordFormSheet({
    super.key,
    required this.bdItems,
    required this.levelItems,
    required this.customerTypeItems,
    required this.pointTypeItems,
    required this.onSubmit,
    this.initialRecord,
  });

  final PerformanceRecord? initialRecord;
  final List<MasterItem> bdItems;
  final List<MasterItem> levelItems;
  final List<MasterItem> customerTypeItems;
  final List<MasterItem> pointTypeItems;
  final Future<void> Function(Map<String, dynamic> payload) onSubmit;

  @override
  State<RecordFormSheet> createState() => _RecordFormSheetState();
}

class _RecordFormSheetState extends State<RecordFormSheet> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _dateController;
  late final TextEditingController _customerNameController;
  late final TextEditingController _packageAmountController;
  late final TextEditingController _pointsController;
  late final TextEditingController _moneyController;
  late final TextEditingController _noteController;

  late String _bdId;
  late String _bdLevelId;
  late String _customerTypeId;
  late String _pointTypeId;
  late String _category;
  bool _saving = false;

  @override
  void initState() {
    super.initState();

    final record = widget.initialRecord;
    _dateController = TextEditingController(
      text: record?.eventDate ?? DateTime.now().toIso8601String().split('T').first,
    );
    _customerNameController = TextEditingController(text: record?.customerName ?? '');
    _packageAmountController = TextEditingController(
      text: record?.packageAmount?.toStringAsFixed(0) ?? '',
    );
    _pointsController = TextEditingController(text: '${record?.points ?? 0}');
    _moneyController = TextEditingController(
      text: record?.money?.toStringAsFixed(0) ?? '',
    );
    _noteController = TextEditingController(text: record?.note ?? '');

    _bdId = record?.bdId ?? (widget.bdItems.isNotEmpty ? widget.bdItems.first.id : '');
    _bdLevelId =
        record?.bdLevelId ?? (widget.levelItems.isNotEmpty ? widget.levelItems.first.id : '');
    _customerTypeId = record?.customerTypeId ??
        (widget.customerTypeItems.isNotEmpty ? widget.customerTypeItems.first.id : '');
    _pointTypeId = record?.pointTypeId ??
        (widget.pointTypeItems.isNotEmpty ? widget.pointTypeItems.first.id : '');
    _category = record?.category ?? 'entertainment';
  }

  @override
  void dispose() {
    _dateController.dispose();
    _customerNameController.dispose();
    _packageAmountController.dispose();
    _pointsController.dispose();
    _moneyController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      await widget.onSubmit({
        'event_date': _dateController.text.trim(),
        'bd_id': _bdId,
        'bd_level_id': _bdLevelId,
        'customer_name': _customerNameController.text.trim(),
        'customer_type_id': _customerTypeId,
        'point_type_id': _pointTypeId,
        'category': _category,
        'points': int.tryParse(_pointsController.text.trim()) ?? 0,
        'money': _nullableNumber(_moneyController.text),
        'package_amount': _nullableNumber(_packageAmountController.text),
        'note': _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
      });

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Save failed: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.initialRecord == null ? 'Create record' : 'Edit record',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF171717),
                  ),
                ),
                const SizedBox(height: 16),
                _LabeledField(
                  label: 'Date',
                  child: TextFormField(
                    controller: _dateController,
                    decoration: const InputDecoration(hintText: 'YYYY-MM-DD'),
                    validator: (value) =>
                        (value == null || value.trim().isEmpty) ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'Customer Name',
                  child: TextFormField(
                    controller: _customerNameController,
                    validator: (value) =>
                        (value == null || value.trim().isEmpty) ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'BD Name',
                  child: DropdownButtonFormField<String>(
                    initialValue: _bdId.isEmpty ? null : _bdId,
                    items: [
                      for (final item in widget.bdItems)
                        DropdownMenuItem(
                          value: item.id,
                          child: Text(item.label),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _bdId = value;
                        });
                      }
                    },
                    validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'BD Level',
                  child: DropdownButtonFormField<String>(
                    initialValue: _bdLevelId.isEmpty ? null : _bdLevelId,
                    items: [
                      for (final item in widget.levelItems)
                        DropdownMenuItem(
                          value: item.id,
                          child: Text(item.label),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _bdLevelId = value;
                        });
                      }
                    },
                    validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'Customer Type',
                  child: DropdownButtonFormField<String>(
                    initialValue: _customerTypeId.isEmpty ? null : _customerTypeId,
                    items: [
                      for (final item in widget.customerTypeItems)
                        DropdownMenuItem(
                          value: item.id,
                          child: Text(item.label),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _customerTypeId = value;
                        });
                      }
                    },
                    validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'Point Type',
                  child: DropdownButtonFormField<String>(
                    initialValue: _pointTypeId.isEmpty ? null : _pointTypeId,
                    items: [
                      for (final item in widget.pointTypeItems)
                        DropdownMenuItem(
                          value: item.id,
                          child: Text(item.label),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _pointTypeId = value;
                        });
                      }
                    },
                    validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                  ),
                ),
                _LabeledField(
                  label: 'Category',
                  child: DropdownButtonFormField<String>(
                    initialValue: _category,
                    items: const [
                      DropdownMenuItem(
                        value: 'entertainment',
                        child: Text('Entertainment'),
                      ),
                      DropdownMenuItem(
                        value: 'restaurant',
                        child: Text('Restaurant'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _category = value;
                        });
                      }
                    },
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: _LabeledField(
                        label: 'Points',
                        child: TextFormField(
                          controller: _pointsController,
                          keyboardType: TextInputType.number,
                          validator: (value) => (value == null || value.trim().isEmpty)
                              ? 'Required'
                              : null,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _LabeledField(
                        label: 'Bonus',
                        child: TextFormField(
                          controller: _moneyController,
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                  ],
                ),
                _LabeledField(
                  label: 'Package Amount',
                  child: TextFormField(
                    controller: _packageAmountController,
                    keyboardType: TextInputType.number,
                  ),
                ),
                _LabeledField(
                  label: 'Note',
                  child: TextFormField(
                    controller: _noteController,
                    maxLines: 3,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(widget.initialRecord == null ? 'Create' : 'Save'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF737373),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

double? _nullableNumber(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return null;
  }

  return double.tryParse(trimmed);
}

String _formatDate(String raw) {
  final parts = raw.split('-');
  if (parts.length != 3) {
    return raw;
  }

  return '${parts[2]}/${parts[1]}/${parts[0]}';
}

String _formatNumber(double value) {
  final fixed = value.toStringAsFixed(0);
  final chars = fixed.split('').reversed.toList();
  final buffer = StringBuffer();

  for (var i = 0; i < chars.length; i++) {
    if (i > 0 && i % 3 == 0) {
      buffer.write(',');
    }
    buffer.write(chars[i]);
  }

  return buffer.toString().split('').reversed.join();
}
