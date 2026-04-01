import 'package:flutter/material.dart';
import '../models/clinic.dart';
import '../services/auth_service.dart';
import '../services/clinic_service.dart';
import '../storage/token_storage.dart';
import '../api/api_client.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.authService, required this.onLogout});

  final AuthService authService;
  final VoidCallback onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final ClinicService _clinicService;
  bool _loading = true;
  String? _error;
  String? _accessMessage;
  List<Clinic> _clinics = [];
  String _userName = '';
  String _userRole = '';

  @override
  void initState() {
    super.initState();
    final tokenStorage = TokenStorage();
    final apiClient = ApiClient(getToken: tokenStorage.getToken);
    _clinicService = ClinicService(apiClient);
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _accessMessage = null;
    });
    try {
      final user = await widget.authService.me();
      if (user.isPatient) {
        setState(() {
          _userName = user.name;
          _userRole = user.role;
          _clinics = [];
          _accessMessage = 'Clinic access is restricted to clinic/admin accounts.';
        });
        return;
      }

      final clinics = await _clinicService.listClinics();
      setState(() {
        _userName = user.name;
        _userRole = user.role;
        _clinics = clinics;
      });
    } catch (err) {
      setState(() {
        _error = err.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    await widget.authService.logout();
    widget.onLogout();
    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _userName.isEmpty
              ? 'Dashboard'
              : 'Welcome, $_userName${_userRole.isNotEmpty ? ' (${_userRole.toUpperCase()})' : ''}',
        ),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ],
                  )
                : _accessMessage != null
                    ? ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Text(
                            _accessMessage!,
                            style: const TextStyle(color: Colors.orange),
                          ),
                        ],
                      )
                    : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _clinics.length,
                    itemBuilder: (context, index) {
                      final clinic = _clinics[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(clinic.name),
                          subtitle: Text('${clinic.city} - ${clinic.phone}'),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text('Appointments'),
                              Text(
                                clinic.appointments.toString(),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
