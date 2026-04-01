class ClinicCreateRequest {
  ClinicCreateRequest({
    required this.name,
    required this.phone,
    required this.startTime,
    required this.endTime,
    this.email,
    this.address,
    this.city,
    this.ownerName,
    this.subscriptionPlan,
    this.workingDays,
    this.slotDuration,
    this.breakTimeStart,
    this.breakTimeEnd,
    this.whatsappReminder,
    this.onlineBooking,
    this.isActive,
  });

  final String name;
  final String phone;
  final String startTime;
  final String endTime;
  final String? email;
  final String? address;
  final String? city;
  final String? ownerName;
  final String? subscriptionPlan;
  final List<String>? workingDays;
  final int? slotDuration;
  final String? breakTimeStart;
  final String? breakTimeEnd;
  final bool? whatsappReminder;
  final bool? onlineBooking;
  final bool? isActive;

  Map<String, dynamic> toJson() {
    final body = <String, dynamic>{
      'name': name,
      'phone': phone,
      'startTime': startTime,
      'endTime': endTime,
    };

    if (email != null) body['email'] = email;
    if (address != null) body['address'] = address;
    if (city != null) body['city'] = city;
    if (ownerName != null) body['ownerName'] = ownerName;
    if (subscriptionPlan != null) body['subscriptionPlan'] = subscriptionPlan;
    if (workingDays != null) body['workingDays'] = workingDays;
    if (slotDuration != null) body['slotDuration'] = slotDuration;
    if (breakTimeStart != null || breakTimeEnd != null) {
      body['breakTime'] = {
        if (breakTimeStart != null) 'start': breakTimeStart,
        if (breakTimeEnd != null) 'end': breakTimeEnd,
      };
    }
    if (whatsappReminder != null || onlineBooking != null) {
      body['features'] = {
        if (whatsappReminder != null) 'whatsappReminder': whatsappReminder,
        if (onlineBooking != null) 'onlineBooking': onlineBooking,
      };
    }
    if (isActive != null) body['isActive'] = isActive;

    return body;
  }
}
