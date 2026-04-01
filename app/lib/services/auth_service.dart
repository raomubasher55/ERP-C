import '../api/api_client.dart';
import '../models/user.dart';
import '../storage/token_storage.dart';

class AuthService {
  AuthService(this._apiClient, this._tokenStorage);

  final ApiClient _apiClient;
  final TokenStorage _tokenStorage;

  Future<User> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final data = await _apiClient.post('/api/auth/register', body: {
      'name': name,
      'email': email,
      'password': password,
    });
    final token = data['token']?.toString() ?? '';
    if (token.isNotEmpty) {
      await _tokenStorage.setToken(token);
    }
    return User.fromJson((data['user'] as Map<String, dynamic>?) ?? {});
  }

  Future<User> login({
    required String email,
    required String password,
  }) async {
    final data = await _apiClient.post('/api/auth/login', body: {
      'email': email,
      'password': password,
    });
    final token = data['token']?.toString() ?? '';
    if (token.isNotEmpty) {
      await _tokenStorage.setToken(token);
    }
    return User.fromJson((data['user'] as Map<String, dynamic>?) ?? {});
  }

  Future<User> me() async {
    final data = await _apiClient.get('/api/auth/me');
    return User.fromJson((data['user'] as Map<String, dynamic>?) ?? {});
  }

  Future<void> logout() async {
    await _tokenStorage.clearToken();
  }
}
