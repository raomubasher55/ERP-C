import 'package:flutter/material.dart';
import 'api/api_client.dart';
import 'services/auth_service.dart';
import 'storage/token_storage.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final TokenStorage _tokenStorage;
  late final ApiClient _apiClient;
  late final AuthService _authService;

  @override
  void initState() {
    super.initState();
    _tokenStorage = TokenStorage();
    _apiClient = ApiClient(getToken: _tokenStorage.getToken);
    _authService = AuthService(_apiClient, _tokenStorage);
  }

  void _refreshAuth() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EPR App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: FutureBuilder<String?>(
        future: _tokenStorage.getToken(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          final token = snapshot.data;
          if (token != null && token.isNotEmpty) {
            return HomeScreen(
              authService: _authService,
              onLogout: _refreshAuth,
            );
          }
          return LoginScreen(
            authService: _authService,
            onAuthChanged: _refreshAuth,
          );
        },
      ),
    );
  }
}
