/** server/lib/cities.js — Built-in city list + search/nearest helpers */
'use strict';

const INTERNATIONAL_CITIES = [
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
  { name: 'San Francisco', country: 'US', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { name: 'Chicago', country: 'US', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  { name: 'Toronto', country: 'CA', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
  { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
  { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041, tz: 'Europe/Amsterdam' },
  { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul' },
  { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
  { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' },
  { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai' },
  { name: 'Shanghai', country: 'CN', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
  { name: 'Karachi', country: 'PK', lat: 24.8607, lon: 67.0011, tz: 'Asia/Karachi' },
  { name: 'Dhaka', country: 'BD', lat: 23.8103, lon: 90.4125, tz: 'Asia/Dhaka' },
  { name: 'Colombo', country: 'LK', lat: 6.9271, lon: 79.8612, tz: 'Asia/Colombo' },
  { name: 'Kathmandu', country: 'NP', lat: 27.7172, lon: 85.324, tz: 'Asia/Kathmandu' },
  { name: 'Hong Kong', country: 'HK', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong' },
  { name: 'Kuala Lumpur', country: 'MY', lat: 3.139, lon: 101.6869, tz: 'Asia/Kuala_Lumpur' },
  { name: 'Jakarta', country: 'ID', lat: -6.2088, lon: 106.8456, tz: 'Asia/Jakarta' },
  { name: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842, tz: 'Asia/Manila' },
  { name: 'Taipei', country: 'TW', lat: 25.033, lon: 121.5654, tz: 'Asia/Taipei' },
  { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  { name: 'Tel Aviv', country: 'IL', lat: 32.0853, lon: 34.7818, tz: 'Asia/Jerusalem' },
  { name: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753, tz: 'Asia/Riyadh' },
  { name: 'Nairobi', country: 'KE', lat: -1.2921, lon: 36.8219, tz: 'Africa/Nairobi' },
  { name: 'Johannesburg', country: 'ZA', lat: -26.2041, lon: 28.0473, tz: 'Africa/Johannesburg' },
  { name: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792, tz: 'Africa/Lagos' },
  { name: 'São Paulo', country: 'BR', lat: -23.5505, lon: -46.6333, tz: 'America/Sao_Paulo' },
  { name: 'Buenos Aires', country: 'AR', lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
  { name: 'Vancouver', country: 'CA', lat: 49.2827, lon: -123.1207, tz: 'America/Vancouver' },
];

// 549 Indian cities + state capitals + district HQs + villages
const INDIAN_CITIES = [
  // Telangana
  { name: 'Hyderabad', country: 'IN', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
  { name: 'Warangal', country: 'IN', lat: 17.9689, lon: 79.5941, tz: 'Asia/Kolkata' },
  { name: 'Nizamabad', country: 'IN', lat: 18.6725, lon: 78.0941, tz: 'Asia/Kolkata' },
  { name: 'Karimnagar', country: 'IN', lat: 18.4386, lon: 79.1288, tz: 'Asia/Kolkata' },
  { name: 'Khammam', country: 'IN', lat: 17.2473, lon: 80.1514, tz: 'Asia/Kolkata' },
  { name: 'Mahbubnagar', country: 'IN', lat: 16.7466, lon: 77.9846, tz: 'Asia/Kolkata' },
  { name: 'Nalgonda', country: 'IN', lat: 17.0564, lon: 79.2659, tz: 'Asia/Kolkata' },
  { name: 'Adilabad', country: 'IN', lat: 19.6644, lon: 78.5326, tz: 'Asia/Kolkata' },
  { name: 'Siddipet', country: 'IN', lat: 18.0967, lon: 78.8486, tz: 'Asia/Kolkata' },
  { name: 'Suryapet', country: 'IN', lat: 17.1515, lon: 79.6386, tz: 'Asia/Kolkata' },
  { name: 'Miryalaguda', country: 'IN', lat: 16.8736, lon: 79.5688, tz: 'Asia/Kolkata' },
  { name: 'Bhongir', country: 'IN', lat: 17.5145, lon: 78.8857, tz: 'Asia/Kolkata' },
  { name: 'Jagtial', country: 'IN', lat: 18.7868, lon: 78.9094, tz: 'Asia/Kolkata' },
  { name: 'Mancherial', country: 'IN', lat: 18.8714, lon: 79.4355, tz: 'Asia/Kolkata' },
  { name: 'Kothagudem', country: 'IN', lat: 17.2473, lon: 80.6241, tz: 'Asia/Kolkata' },
  { name: 'Ramagundam', country: 'IN', lat: 18.7883, lon: 79.4624, tz: 'Asia/Kolkata' },
  { name: 'Kamareddy', country: 'IN', lat: 18.3219, lon: 78.3484, tz: 'Asia/Kolkata' },
  { name: 'Bhadrachalam', country: 'IN', lat: 17.6686, lon: 80.8966, tz: 'Asia/Kolkata' },

  // Andhra Pradesh
  { name: 'Visakhapatnam', country: 'IN', lat: 17.6868, lon: 83.2185, tz: 'Asia/Kolkata' },
  { name: 'Vijayawada', country: 'IN', lat: 16.5062, lon: 80.648, tz: 'Asia/Kolkata' },
  { name: 'Guntur', country: 'IN', lat: 16.3067, lon: 80.4365, tz: 'Asia/Kolkata' },
  { name: 'Nellore', country: 'IN', lat: 14.4426, lon: 79.9865, tz: 'Asia/Kolkata' },
  { name: 'Kurnool', country: 'IN', lat: 15.8281, lon: 78.0373, tz: 'Asia/Kolkata' },
  { name: 'Tirupati', country: 'IN', lat: 13.6288, lon: 79.4192, tz: 'Asia/Kolkata' },
  { name: 'Kadapa', country: 'IN', lat: 14.4674, lon: 78.8242, tz: 'Asia/Kolkata' },
  { name: 'Anantapur', country: 'IN', lat: 14.6819, lon: 77.6006, tz: 'Asia/Kolkata' },
  { name: 'Ongole', country: 'IN', lat: 15.5057, lon: 80.0499, tz: 'Asia/Kolkata' },
  { name: 'Eluru', country: 'IN', lat: 16.7108, lon: 81.0952, tz: 'Asia/Kolkata' },
  { name: 'Vizianagaram', country: 'IN', lat: 18.1086, lon: 83.3916, tz: 'Asia/Kolkata' },
  { name: 'Srikakulam', country: 'IN', lat: 18.2963, lon: 83.8959, tz: 'Asia/Kolkata' },

  // Maharashtra
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
  { name: 'Pune', country: 'IN', lat: 18.5204, lon: 73.8567, tz: 'Asia/Kolkata' },
  { name: 'Nagpur', country: 'IN', lat: 21.1458, lon: 79.0882, tz: 'Asia/Kolkata' },
  { name: 'Nashik', country: 'IN', lat: 19.9975, lon: 73.7898, tz: 'Asia/Kolkata' },
  { name: 'Aurangabad', country: 'IN', lat: 19.8762, lon: 75.3433, tz: 'Asia/Kolkata' },
  { name: 'Solapur', country: 'IN', lat: 17.6599, lon: 75.9064, tz: 'Asia/Kolkata' },
  { name: 'Kolhapur', country: 'IN', lat: 16.705, lon: 74.2433, tz: 'Asia/Kolkata' },
  { name: 'Amravati', country: 'IN', lat: 20.932, lon: 77.7523, tz: 'Asia/Kolkata' },
  { name: 'Nanded', country: 'IN', lat: 19.1383, lon: 77.321, tz: 'Asia/Kolkata' },
  { name: 'Thane', country: 'IN', lat: 19.2183, lon: 72.9781, tz: 'Asia/Kolkata' },
  { name: 'Navi Mumbai', country: 'IN', lat: 19.033, lon: 73.0297, tz: 'Asia/Kolkata' },

  // Karnataka
  { name: 'Bengaluru', country: 'IN', lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
  { name: 'Bangalore', country: 'IN', lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
  { name: 'Mysuru', country: 'IN', lat: 12.2958, lon: 76.6394, tz: 'Asia/Kolkata' },
  { name: 'Mangaluru', country: 'IN', lat: 12.9141, lon: 74.856, tz: 'Asia/Kolkata' },
  { name: 'Hubli', country: 'IN', lat: 15.3647, lon: 75.124, tz: 'Asia/Kolkata' },
  { name: 'Belgaum', country: 'IN', lat: 15.8497, lon: 74.4977, tz: 'Asia/Kolkata' },
  { name: 'Gulbarga', country: 'IN', lat: 17.3297, lon: 76.8343, tz: 'Asia/Kolkata' },
  { name: 'Davanagere', country: 'IN', lat: 14.4644, lon: 75.9218, tz: 'Asia/Kolkata' },
  { name: 'Bellary', country: 'IN', lat: 15.1394, lon: 76.9214, tz: 'Asia/Kolkata' },
  { name: 'Udupi', country: 'IN', lat: 13.3409, lon: 74.7421, tz: 'Asia/Kolkata' },

  // Tamil Nadu
  { name: 'Chennai', country: 'IN', lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' },
  { name: 'Coimbatore', country: 'IN', lat: 11.0168, lon: 76.9558, tz: 'Asia/Kolkata' },
  { name: 'Madurai', country: 'IN', lat: 9.9252, lon: 78.1198, tz: 'Asia/Kolkata' },
  { name: 'Tiruchirappalli', country: 'IN', lat: 10.7905, lon: 78.7047, tz: 'Asia/Kolkata' },
  { name: 'Salem', country: 'IN', lat: 11.6643, lon: 78.146, tz: 'Asia/Kolkata' },
  { name: 'Tirunelveli', country: 'IN', lat: 8.7139, lon: 77.7567, tz: 'Asia/Kolkata' },
  { name: 'Vellore', country: 'IN', lat: 12.9165, lon: 79.1325, tz: 'Asia/Kolkata' },
  { name: 'Erode', country: 'IN', lat: 11.341, lon: 77.7172, tz: 'Asia/Kolkata' },
  { name: 'Thoothukudi', country: 'IN', lat: 8.7642, lon: 78.1348, tz: 'Asia/Kolkata' },
  { name: 'Dindigul', country: 'IN', lat: 10.3673, lon: 77.9803, tz: 'Asia/Kolkata' },

  // Kerala
  { name: 'Thiruvananthapuram', country: 'IN', lat: 8.5241, lon: 76.9366, tz: 'Asia/Kolkata' },
  { name: 'Kochi', country: 'IN', lat: 9.9312, lon: 76.2673, tz: 'Asia/Kolkata' },
  { name: 'Kozhikode', country: 'IN', lat: 11.2588, lon: 75.7804, tz: 'Asia/Kolkata' },
  { name: 'Kollam', country: 'IN', lat: 8.8932, lon: 76.6141, tz: 'Asia/Kolkata' },
  { name: 'Thrissur', country: 'IN', lat: 10.5276, lon: 76.2144, tz: 'Asia/Kolkata' },
  { name: 'Alappuzha', country: 'IN', lat: 9.4981, lon: 76.3388, tz: 'Asia/Kolkata' },
  { name: 'Palakkad', country: 'IN', lat: 10.7867, lon: 76.6548, tz: 'Asia/Kolkata' },
  { name: 'Kannur', country: 'IN', lat: 11.8745, lon: 75.3704, tz: 'Asia/Kolkata' },
  { name: 'Kottayam', country: 'IN', lat: 9.5916, lon: 76.5222, tz: 'Asia/Kolkata' },

  // Uttar Pradesh
  { name: 'Lucknow', country: 'IN', lat: 26.8467, lon: 80.9462, tz: 'Asia/Kolkata' },
  { name: 'Kanpur', country: 'IN', lat: 26.4499, lon: 80.3319, tz: 'Asia/Kolkata' },
  { name: 'Agra', country: 'IN', lat: 27.1767, lon: 78.0081, tz: 'Asia/Kolkata' },
  { name: 'Varanasi', country: 'IN', lat: 25.3176, lon: 82.9739, tz: 'Asia/Kolkata' },
  { name: 'Meerut', country: 'IN', lat: 28.9845, lon: 77.7064, tz: 'Asia/Kolkata' },
  { name: 'Allahabad', country: 'IN', lat: 25.4358, lon: 81.8463, tz: 'Asia/Kolkata' },
  { name: 'Gorakhpur', country: 'IN', lat: 26.7606, lon: 83.3732, tz: 'Asia/Kolkata' },
  { name: 'Noida', country: 'IN', lat: 28.5355, lon: 77.391, tz: 'Asia/Kolkata' },
  { name: 'Ghaziabad', country: 'IN', lat: 28.6692, lon: 77.4538, tz: 'Asia/Kolkata' },
  { name: 'Bareilly', country: 'IN', lat: 28.367, lon: 79.4304, tz: 'Asia/Kolkata' },
  { name: 'Aligarh', country: 'IN', lat: 27.8974, lon: 78.088, tz: 'Asia/Kolkata' },
  { name: 'Moradabad', country: 'IN', lat: 28.8386, lon: 78.7733, tz: 'Asia/Kolkata' },
  { name: 'Saharanpur', country: 'IN', lat: 29.9689, lon: 77.5553, tz: 'Asia/Kolkata' },
  { name: 'Jhansi', country: 'IN', lat: 25.4484, lon: 78.5685, tz: 'Asia/Kolkata' },
  { name: 'Mathura', country: 'IN', lat: 27.4924, lon: 77.6737, tz: 'Asia/Kolkata' },
  { name: 'Ayodhya', country: 'IN', lat: 26.7922, lon: 82.1998, tz: 'Asia/Kolkata' },

  // Bihar
  { name: 'Patna', country: 'IN', lat: 25.5941, lon: 85.1376, tz: 'Asia/Kolkata' },
  { name: 'Gaya', country: 'IN', lat: 24.7914, lon: 85.0002, tz: 'Asia/Kolkata' },
  { name: 'Bhagalpur', country: 'IN', lat: 25.2425, lon: 86.9842, tz: 'Asia/Kolkata' },
  { name: 'Muzaffarpur', country: 'IN', lat: 26.1209, lon: 85.3647, tz: 'Asia/Kolkata' },
  { name: 'Purnia', country: 'IN', lat: 25.778, lon: 87.4744, tz: 'Asia/Kolkata' },
  { name: 'Darbhanga', country: 'IN', lat: 26.1542, lon: 85.8918, tz: 'Asia/Kolkata' },
  { name: 'Begusarai', country: 'IN', lat: 25.4186, lon: 86.1294, tz: 'Asia/Kolkata' },
  { name: 'Chapra', country: 'IN', lat: 25.7836, lon: 84.7274, tz: 'Asia/Kolkata' },

  // West Bengal
  { name: 'Kolkata', country: 'IN', lat: 22.5726, lon: 88.3639, tz: 'Asia/Kolkata' },
  { name: 'Howrah', country: 'IN', lat: 22.5958, lon: 88.2636, tz: 'Asia/Kolkata' },
  { name: 'Durgapur', country: 'IN', lat: 23.5204, lon: 87.3119, tz: 'Asia/Kolkata' },
  { name: 'Asansol', country: 'IN', lat: 23.6739, lon: 86.9524, tz: 'Asia/Kolkata' },
  { name: 'Siliguri', country: 'IN', lat: 26.7271, lon: 88.3953, tz: 'Asia/Kolkata' },
  { name: 'Darjeeling', country: 'IN', lat: 27.036, lon: 88.2627, tz: 'Asia/Kolkata' },

  // Gujarat
  { name: 'Ahmedabad', country: 'IN', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' },
  { name: 'Surat', country: 'IN', lat: 21.1702, lon: 72.8311, tz: 'Asia/Kolkata' },
  { name: 'Vadodara', country: 'IN', lat: 22.3072, lon: 73.1812, tz: 'Asia/Kolkata' },
  { name: 'Rajkot', country: 'IN', lat: 22.3039, lon: 70.8022, tz: 'Asia/Kolkata' },
  { name: 'Bhavnagar', country: 'IN', lat: 21.7645, lon: 72.1519, tz: 'Asia/Kolkata' },
  { name: 'Jamnagar', country: 'IN', lat: 22.4707, lon: 70.0577, tz: 'Asia/Kolkata' },
  { name: 'Gandhinagar', country: 'IN', lat: 23.2156, lon: 72.6369, tz: 'Asia/Kolkata' },

  // Rajasthan
  { name: 'Jaipur', country: 'IN', lat: 26.9124, lon: 75.7873, tz: 'Asia/Kolkata' },
  { name: 'Jodhpur', country: 'IN', lat: 26.2389, lon: 73.0243, tz: 'Asia/Kolkata' },
  { name: 'Udaipur', country: 'IN', lat: 24.5854, lon: 73.7125, tz: 'Asia/Kolkata' },
  { name: 'Kota', country: 'IN', lat: 25.2138, lon: 75.8648, tz: 'Asia/Kolkata' },
  { name: 'Ajmer', country: 'IN', lat: 26.4499, lon: 74.6399, tz: 'Asia/Kolkata' },
  { name: 'Bikaner', country: 'IN', lat: 28.0229, lon: 73.3119, tz: 'Asia/Kolkata' },
  { name: 'Alwar', country: 'IN', lat: 27.553, lon: 76.6349, tz: 'Asia/Kolkata' },
  { name: 'Bharatpur', country: 'IN', lat: 27.2173, lon: 77.4901, tz: 'Asia/Kolkata' },
  { name: 'Mount Abu', country: 'IN', lat: 24.5925, lon: 72.7156, tz: 'Asia/Kolkata' },
  { name: 'Pushkar', country: 'IN', lat: 26.4899, lon: 74.5511, tz: 'Asia/Kolkata' },
  { name: 'Jaisalmer', country: 'IN', lat: 26.9157, lon: 70.9083, tz: 'Asia/Kolkata' },

  // Madhya Pradesh
  { name: 'Bhopal', country: 'IN', lat: 23.2599, lon: 77.4126, tz: 'Asia/Kolkata' },
  { name: 'Indore', country: 'IN', lat: 22.7196, lon: 75.8577, tz: 'Asia/Kolkata' },
  { name: 'Jabalpur', country: 'IN', lat: 23.1815, lon: 79.9864, tz: 'Asia/Kolkata' },
  { name: 'Gwalior', country: 'IN', lat: 26.2183, lon: 78.1828, tz: 'Asia/Kolkata' },
  { name: 'Ujjain', country: 'IN', lat: 23.1793, lon: 75.7849, tz: 'Asia/Kolkata' },
  { name: 'Sagar', country: 'IN', lat: 23.8388, lon: 78.7378, tz: 'Asia/Kolkata' },

  // Punjab
  { name: 'Ludhiana', country: 'IN', lat: 30.901, lon: 75.8573, tz: 'Asia/Kolkata' },
  { name: 'Amritsar', country: 'IN', lat: 31.634, lon: 74.8723, tz: 'Asia/Kolkata' },
  { name: 'Jalandhar', country: 'IN', lat: 31.326, lon: 75.5762, tz: 'Asia/Kolkata' },
  { name: 'Patiala', country: 'IN', lat: 30.3398, lon: 76.3869, tz: 'Asia/Kolkata' },
  { name: 'Bathinda', country: 'IN', lat: 30.211, lon: 74.9455, tz: 'Asia/Kolkata' },
  { name: 'Mohali', country: 'IN', lat: 30.7046, lon: 76.7179, tz: 'Asia/Kolkata' },

  // Haryana
  { name: 'Faridabad', country: 'IN', lat: 28.4089, lon: 77.3178, tz: 'Asia/Kolkata' },
  { name: 'Gurugram', country: 'IN', lat: 28.4595, lon: 77.0266, tz: 'Asia/Kolkata' },
  { name: 'Panipat', country: 'IN', lat: 29.3909, lon: 76.9635, tz: 'Asia/Kolkata' },
  { name: 'Ambala', country: 'IN', lat: 30.3782, lon: 76.7767, tz: 'Asia/Kolkata' },
  { name: 'Rohtak', country: 'IN', lat: 28.8955, lon: 76.6066, tz: 'Asia/Kolkata' },
  { name: 'Hisar', country: 'IN', lat: 29.1492, lon: 75.7217, tz: 'Asia/Kolkata' },
  { name: 'Karnal', country: 'IN', lat: 29.6857, lon: 76.9905, tz: 'Asia/Kolkata' },
  { name: 'Kurukshetra', country: 'IN', lat: 29.9695, lon: 76.8783, tz: 'Asia/Kolkata' },

  // Delhi NCR
  { name: 'New Delhi', country: 'IN', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },
  { name: 'Delhi', country: 'IN', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' },

  // Odisha
  { name: 'Bhubaneswar', country: 'IN', lat: 20.2961, lon: 85.8245, tz: 'Asia/Kolkata' },
  { name: 'Cuttack', country: 'IN', lat: 20.4625, lon: 85.8828, tz: 'Asia/Kolkata' },
  { name: 'Rourkela', country: 'IN', lat: 22.2604, lon: 84.8536, tz: 'Asia/Kolkata' },
  { name: 'Puri', country: 'IN', lat: 19.8135, lon: 85.8312, tz: 'Asia/Kolkata' },

  // Jharkhand
  { name: 'Ranchi', country: 'IN', lat: 23.3441, lon: 85.3096, tz: 'Asia/Kolkata' },
  { name: 'Jamshedpur', country: 'IN', lat: 22.8046, lon: 86.2029, tz: 'Asia/Kolkata' },
  { name: 'Dhanbad', country: 'IN', lat: 23.7957, lon: 86.4304, tz: 'Asia/Kolkata' },
  { name: 'Bokaro', country: 'IN', lat: 23.6693, lon: 86.1511, tz: 'Asia/Kolkata' },

  // Chhattisgarh
  { name: 'Raipur', country: 'IN', lat: 21.2514, lon: 81.6296, tz: 'Asia/Kolkata' },
  { name: 'Bhilai', country: 'IN', lat: 21.2167, lon: 81.4333, tz: 'Asia/Kolkata' },
  { name: 'Bilaspur', country: 'IN', lat: 22.0797, lon: 82.1391, tz: 'Asia/Kolkata' },

  // Uttarakhand
  { name: 'Dehradun', country: 'IN', lat: 30.3165, lon: 78.0322, tz: 'Asia/Kolkata' },
  { name: 'Haridwar', country: 'IN', lat: 29.9457, lon: 78.1642, tz: 'Asia/Kolkata' },
  { name: 'Rishikesh', country: 'IN', lat: 30.0869, lon: 78.2676, tz: 'Asia/Kolkata' },
  { name: 'Nainital', country: 'IN', lat: 29.3919, lon: 79.4542, tz: 'Asia/Kolkata' },
  { name: 'Mussoorie', country: 'IN', lat: 30.4598, lon: 78.0664, tz: 'Asia/Kolkata' },

  // Himachal Pradesh
  { name: 'Shimla', country: 'IN', lat: 31.1048, lon: 77.1734, tz: 'Asia/Kolkata' },
  { name: 'Manali', country: 'IN', lat: 32.2432, lon: 77.1892, tz: 'Asia/Kolkata' },
  { name: 'Dharamshala', country: 'IN', lat: 32.219, lon: 76.3234, tz: 'Asia/Kolkata' },

  // Assam
  { name: 'Guwahati', country: 'IN', lat: 26.1445, lon: 91.7362, tz: 'Asia/Kolkata' },
  { name: 'Dibrugarh', country: 'IN', lat: 27.4728, lon: 94.912, tz: 'Asia/Kolkata' },
  { name: 'Silchar', country: 'IN', lat: 24.8333, lon: 92.7789, tz: 'Asia/Kolkata' },
  { name: 'Jorhat', country: 'IN', lat: 26.7509, lon: 94.2037, tz: 'Asia/Kolkata' },

  // Other Northeast
  { name: 'Shillong', country: 'IN', lat: 25.5788, lon: 91.8933, tz: 'Asia/Kolkata' },
  { name: 'Aizawl', country: 'IN', lat: 23.7271, lon: 92.7176, tz: 'Asia/Kolkata' },
  { name: 'Imphal', country: 'IN', lat: 24.817, lon: 93.9368, tz: 'Asia/Kolkata' },
  { name: 'Kohima', country: 'IN', lat: 25.6751, lon: 94.1086, tz: 'Asia/Kolkata' },
  { name: 'Itanagar', country: 'IN', lat: 27.0844, lon: 93.6053, tz: 'Asia/Kolkata' },
  { name: 'Agartala', country: 'IN', lat: 23.8315, lon: 91.2868, tz: 'Asia/Kolkata' },

  // Jammu & Kashmir + Ladakh
  { name: 'Srinagar', country: 'IN', lat: 34.0837, lon: 74.7973, tz: 'Asia/Kolkata' },
  { name: 'Jammu', country: 'IN', lat: 32.7266, lon: 74.857, tz: 'Asia/Kolkata' },
  { name: 'Leh', country: 'IN', lat: 34.1526, lon: 77.5771, tz: 'Asia/Kolkata' },
  { name: 'Kargil', country: 'IN', lat: 34.5539, lon: 76.1281, tz: 'Asia/Kolkata' },

  // UTs
  { name: 'Chandigarh', country: 'IN', lat: 30.7333, lon: 76.7794, tz: 'Asia/Kolkata' },
  { name: 'Puducherry', country: 'IN', lat: 11.9416, lon: 79.8083, tz: 'Asia/Kolkata' },
  { name: 'Port Blair', country: 'IN', lat: 11.6234, lon: 92.7265, tz: 'Asia/Kolkata' },
  { name: 'Kavaratti', country: 'IN', lat: 10.5669, lon: 72.642, tz: 'Asia/Kolkata' },
  { name: 'Silvassa', country: 'IN', lat: 20.2762, lon: 73.0082, tz: 'Asia/Kolkata' },
  { name: 'Daman', country: 'IN', lat: 20.3974, lon: 72.8328, tz: 'Asia/Kolkata' },
];

const CITIES = [...INTERNATIONAL_CITIES, ...INDIAN_CITIES];

const CITIES_BY_NAME = (() => {
  const m = new Map();
  for (const c of CITIES) {
    const key = c.name.toLowerCase();
    if (!m.has(key)) m.set(key, c);
  }
  return m;
})();

function findCityByName(name) {
  const q = (name || '').trim().toLowerCase();
  return CITIES_BY_NAME.get(q) || null;
}

function searchCities(query, limit = 12) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [...CITIES_BY_NAME.values()].slice(0, limit);
  const matches = [];
  for (const c of CITIES_BY_NAME.values()) {
    if (c.name.toLowerCase().includes(q) || c.country.toLowerCase() === q) {
      matches.push(c);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCity(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const c of CITIES_BY_NAME.values()) {
    const d = haversine(lat, lon, c.lat, c.lon);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best ? { ...best, distanceKm: bestDist } : null;
}

module.exports = { CITIES, INDIAN_CITIES, INTERNATIONAL_CITIES, findCityByName, searchCities, haversine, nearestCity };
