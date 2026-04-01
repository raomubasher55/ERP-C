class Clinic {
  Clinic({
    required this.id,
    required this.name,
    required this.phone,
    required this.city,
    required this.appointments,
  });

  final String id;
  final String name;
  final String phone;
  final String city;
  final int appointments;

  factory Clinic.fromJson(Map<String, dynamic> json) {
    return Clinic(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      appointments: (json['appointments'] as num?)?.toInt() ?? 0,
    );
  }
}
