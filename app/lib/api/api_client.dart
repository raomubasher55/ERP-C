import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/api_config.dart';

class ApiError implements Exception {
  ApiError(this.statusCode, this.message, {this.details});

  final int statusCode;
  final String message;
  final dynamic details;

  @override
  String toString() => 'ApiError($statusCode): $message';
}

class ApiClient {
  ApiClient({required this.getToken});

  final Future<String?> Function() getToken;

  Uri _uri(String path, [Map<String, String>? query]) {
    final url = Uri.parse(baseUrl).replace(path: path, queryParameters: query);
    return url;
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    final token = await getToken();
    final response = await http.get(
      _uri(path, query),
      headers: _headers(token),
    );
    return _handle(response);
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    final token = await getToken();
    final response = await http.post(
      _uri(path),
      headers: _headers(token),
      body: jsonEncode(body ?? {}),
    );
    return _handle(response);
  }

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async {
    final token = await getToken();
    final response = await http.patch(
      _uri(path),
      headers: _headers(token),
      body: jsonEncode(body ?? {}),
    );
    return _handle(response);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final token = await getToken();
    final response = await http.delete(
      _uri(path),
      headers: _headers(token),
    );
    return _handle(response);
  }

  Map<String, String> _headers(String? token) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Map<String, dynamic> _handle(http.Response response) {
    final data = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    }

    final message = data is Map && data['message'] is String
        ? data['message'] as String
        : 'Request failed';
    throw ApiError(response.statusCode, message, details: data);
  }
}
