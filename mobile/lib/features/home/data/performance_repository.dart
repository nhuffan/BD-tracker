import '../../../app/supabase.dart';
import '../models/master_item.dart';
import '../models/performance_record.dart';

class PerformanceRepository {
  Future<List<PerformanceRecord>> fetchRecords() async {
    final response = await supabase
        .from('records')
        .select('*')
        .order('event_date', ascending: false)
        .order('updated_at', ascending: false);

    return (response as List<dynamic>)
        .map((item) => PerformanceRecord.fromMap(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<MasterItem>> fetchMasters(String category) async {
    final response = await supabase
        .from('masters')
        .select('*')
        .eq('category', category)
        .order('sort_order', ascending: true);

    return (response as List<dynamic>)
        .map((item) => MasterItem.fromMap(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> createRecord(Map<String, dynamic> payload) async {
    await supabase.from('records').insert(payload);
  }

  Future<void> updateRecord(String id, Map<String, dynamic> payload) async {
    await supabase.from('records').update(payload).eq('id', id);
  }

  Future<void> deleteRecord(String id) async {
    await supabase.from('records').delete().eq('id', id);
  }
}
