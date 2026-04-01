import '../api/api_client.dart';
import '../models/clinic.dart';
import '../models/clinic_create.dart';

class ClinicService {
  ClinicService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Clinic>> listClinics({int page = 1, int limit = 20}) async {
    final data = await _apiClient.get(
      '/api/clinics',
      query: {
        'page': page.toString(),
        'limit': limit.toString(),
      },
    );
    final items = (data['clinics'] as List<dynamic>? ?? []);
    return items.map((e) => Clinic.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Clinic> createClinic(ClinicCreateRequest request) async {
    final data = await _apiClient.post(
      '/api/clinics',
      body: request.toJson(),
    );
    final clinicJson = data['clinic'];
    if (clinicJson is Map<String, dynamic>) {
      return Clinic.fromJson(clinicJson);
    }
    throw Exception('Invalid clinic response');
  }
}
