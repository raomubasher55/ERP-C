import 'dart:io';
import 'package:flutter/foundation.dart';

String get baseUrl {
  if (kIsWeb) {
    return 'http://192.168.0.103:4000';
  }
  if (Platform.isAndroid) {
    return 'http://192.168.0.103:4000';
  }
  return 'http://192.168.0.103:4000';
}
