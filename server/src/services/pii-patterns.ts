import { PiiPattern } from '../types.js';

const VARCHAR_TEXT = /varchar|text|char|string|blob/i;
const NUMERIC = /int|decimal|numeric|float|double|number/i;
const DATE_TIME = /date|time|timestamp/i;
const BOOL_FLAG = /tinyint|bool|bit/i;
const LARGE_TEXT = /text|mediumtext|longtext|blob|json/i;

export const PII_PATTERNS: PiiPattern[] = [
  // ===== CRITICAL: Government IDs & regulated identifiers =====
  { regex: /\bssn\b/i, tier: 'critical', category: 'identity', label: 'Social Security Number' },
  { regex: /\bsocial_security/i, tier: 'critical', category: 'identity', label: 'Social Security Number' },
  { regex: /\bpassport(?:_?(?:num|number|no|id))?\b/i, tier: 'critical', category: 'identity', label: 'Passport Number', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bdriver_?(?:s_?)?licen[cs]e/i, tier: 'critical', category: 'identity', label: 'Driver License', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\btax_?(?:id|number|num|identification)/i, tier: 'critical', category: 'identity', label: 'Tax ID' },
  { regex: /\bnational_?id/i, tier: 'critical', category: 'identity', label: 'National ID' },
  { regex: /\bsin\b/i, tier: 'critical', category: 'identity', label: 'Social Insurance Number (SIN)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\baadh[a]?r/i, tier: 'critical', category: 'identity', label: 'Aadhaar Number' },
  { regex: /\bcedula/i, tier: 'critical', category: 'identity', label: 'Cedula (National ID)' },
  { regex: /\bcpf\b/i, tier: 'critical', category: 'identity', label: 'CPF (Brazil Tax ID)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bcurp\b/i, tier: 'critical', category: 'identity', label: 'CURP (Mexico ID)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bein\b/i, tier: 'critical', category: 'identity', label: 'Employer Identification Number', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bitin\b/i, tier: 'critical', category: 'identity', label: 'Individual Taxpayer ID', dataTypeRequire: VARCHAR_TEXT },

  // ===== HIGH: Direct personal identifiers =====
  // Contact — email/phone use dataTypeExclude to skip boolean flags (email_enabled TINYINT(1))
  { regex: /\bemail/i, tier: 'high', category: 'contact', label: 'Email Address', dataTypeExclude: BOOL_FLAG },
  { regex: /\be_?mail_?addr/i, tier: 'high', category: 'contact', label: 'Email Address' },
  { regex: /\bphone/i, tier: 'high', category: 'contact', label: 'Phone Number', dataTypeExclude: BOOL_FLAG },
  { regex: /\bmobile/i, tier: 'high', category: 'contact', label: 'Mobile Number', dataTypeExclude: BOOL_FLAG },
  { regex: /\bcell_?(?:phone|number|num)/i, tier: 'high', category: 'contact', label: 'Cell Phone' },
  { regex: /\btelephone/i, tier: 'high', category: 'contact', label: 'Telephone' },
  { regex: /\bfax(?:_?(?:num|number))?\b/i, tier: 'high', category: 'contact', label: 'Fax Number', dataTypeRequire: VARCHAR_TEXT },

  // Name (full)
  { regex: /\bfull_?name\b/i, tier: 'high', category: 'identity', label: 'Full Name' },
  { regex: /\blegal_?name/i, tier: 'high', category: 'identity', label: 'Legal Name' },
  { regex: /\bname_?(?:full|complete)/i, tier: 'high', category: 'identity', label: 'Full Name' },

  // Date of birth
  { regex: /\bdate_?of_?birth/i, tier: 'high', category: 'personal', label: 'Date of Birth' },
  { regex: /\bdob\b/i, tier: 'high', category: 'personal', label: 'Date of Birth' },
  { regex: /\bbirthday/i, tier: 'high', category: 'personal', label: 'Birthday' },
  { regex: /\bbirth_?date/i, tier: 'high', category: 'personal', label: 'Birth Date' },

  // Address
  { regex: /\baddress_?line/i, tier: 'high', category: 'contact', label: 'Address Line' },
  { regex: /\bstreet_?address/i, tier: 'high', category: 'contact', label: 'Street Address' },
  { regex: /\bstreet_?name/i, tier: 'high', category: 'contact', label: 'Street Name' },
  { regex: /\bhome_?address/i, tier: 'high', category: 'contact', label: 'Home Address' },
  { regex: /\bmailing_?address/i, tier: 'high', category: 'contact', label: 'Mailing Address' },
  { regex: /\bship(?:ping)?_?address/i, tier: 'high', category: 'contact', label: 'Shipping Address' },
  { regex: /\bbilling_?address/i, tier: 'high', category: 'contact', label: 'Billing Address' },
  { regex: /\baddress[12]\b/i, tier: 'high', category: 'contact', label: 'Address' },
  { regex: /\baddress\b/i, tier: 'high', category: 'contact', label: 'Address', dataTypeRequire: VARCHAR_TEXT },

  // IP address
  { regex: /\bip_?addr/i, tier: 'high', category: 'digital', label: 'IP Address' },
  { regex: /\bip_?address/i, tier: 'high', category: 'digital', label: 'IP Address' },
  { regex: /\bip\b/i, tier: 'high', category: 'digital', label: 'IP Address', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bipv[46]/i, tier: 'high', category: 'digital', label: 'IP Address' },
  { regex: /\bsign_?in_?ip/i, tier: 'high', category: 'digital', label: 'Sign-in IP' },
  { regex: /\blast_?(?:sign_?in_?)?ip/i, tier: 'high', category: 'digital', label: 'Last IP' },
  { regex: /\bcurrent_?sign_?in_?ip/i, tier: 'high', category: 'digital', label: 'Current Sign-in IP' },
  { regex: /\bclient_?ip/i, tier: 'high', category: 'digital', label: 'Client IP' },
  { regex: /\bremote_?ip/i, tier: 'high', category: 'digital', label: 'Remote IP' },

  // Financial (card/bank)
  { regex: /\bcredit_?card/i, tier: 'high', category: 'financial', label: 'Credit Card' },
  { regex: /\bcard_?number/i, tier: 'high', category: 'financial', label: 'Card Number' },
  { regex: /\bcard_?num\b/i, tier: 'high', category: 'financial', label: 'Card Number' },
  { regex: /\bcvv\b/i, tier: 'high', category: 'financial', label: 'CVV' },
  { regex: /\bcvc\b/i, tier: 'high', category: 'financial', label: 'CVC', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bbank_?account/i, tier: 'high', category: 'financial', label: 'Bank Account' },
  { regex: /\baccount_?number/i, tier: 'high', category: 'financial', label: 'Account Number' },
  { regex: /\biban\b/i, tier: 'high', category: 'financial', label: 'IBAN' },
  { regex: /\brouting_?number/i, tier: 'high', category: 'financial', label: 'Routing Number' },
  { regex: /\bswift_?code/i, tier: 'high', category: 'financial', label: 'SWIFT Code' },
  { regex: /\bpan\b/i, tier: 'high', category: 'financial', label: 'Primary Account Number', dataTypeRequire: VARCHAR_TEXT },

  // Medical
  { regex: /\bmedical_?record/i, tier: 'high', category: 'medical', label: 'Medical Record' },
  { regex: /\bhealth_?(?:id|number|card)/i, tier: 'high', category: 'medical', label: 'Health ID' },
  { regex: /\bpatient_?id/i, tier: 'high', category: 'medical', label: 'Patient ID' },
  { regex: /\bdiagnosis/i, tier: 'high', category: 'medical', label: 'Diagnosis' },
  { regex: /\bmedication/i, tier: 'high', category: 'medical', label: 'Medication' },
  { regex: /\bprescription/i, tier: 'high', category: 'medical', label: 'Prescription' },

  // Biometric
  { regex: /\bfingerprint/i, tier: 'high', category: 'biometric', label: 'Fingerprint' },
  { regex: /\bface_?(?:id|data|encoding|template)/i, tier: 'high', category: 'biometric', label: 'Face Data' },
  { regex: /\bbiometric/i, tier: 'high', category: 'biometric', label: 'Biometric Data' },
  { regex: /\bretina/i, tier: 'high', category: 'biometric', label: 'Retina Scan' },
  { regex: /\bvoice_?print/i, tier: 'high', category: 'biometric', label: 'Voice Print' },

  // Password (bare — may be cleartext)
  { regex: /\bpassword\b/i, tier: 'high', category: 'authentication', label: 'Password' },

  // ===== MEDIUM: Partial identifiers =====
  // Name parts
  { regex: /\bfirst_?name\b/i, tier: 'medium', category: 'identity', label: 'First Name' },
  { regex: /\blast_?name\b/i, tier: 'medium', category: 'identity', label: 'Last Name' },
  { regex: /\bmiddle_?name\b/i, tier: 'medium', category: 'identity', label: 'Middle Name' },
  { regex: /\bmaiden_?name/i, tier: 'medium', category: 'identity', label: 'Maiden Name' },
  { regex: /\bfname\b/i, tier: 'medium', category: 'identity', label: 'First Name' },
  { regex: /\blname\b/i, tier: 'medium', category: 'identity', label: 'Last Name' },
  { regex: /\bgiven_?name/i, tier: 'medium', category: 'identity', label: 'Given Name' },
  { regex: /\bsurname/i, tier: 'medium', category: 'identity', label: 'Surname' },
  { regex: /\bpreferred_?name/i, tier: 'medium', category: 'identity', label: 'Preferred Name' },
  { regex: /\bdisplay_?name/i, tier: 'medium', category: 'identity', label: 'Display Name' },
  { regex: /\bemp(?:loyee)?_?name/i, tier: 'medium', category: 'identity', label: 'Employee Name' },
  { regex: /^name$/i, tier: 'medium', category: 'identity', label: 'Name' },

  // Demographics
  { regex: /\bgender\b/i, tier: 'medium', category: 'personal', label: 'Gender' },
  { regex: /\bsex\b/i, tier: 'medium', category: 'personal', label: 'Sex', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bage\b/i, tier: 'medium', category: 'personal', label: 'Age', dataTypeExclude: DATE_TIME },
  { regex: /\bethnicity/i, tier: 'medium', category: 'personal', label: 'Ethnicity' },
  { regex: /\brace\b/i, tier: 'medium', category: 'personal', label: 'Race', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bnationality/i, tier: 'medium', category: 'personal', label: 'Nationality' },
  { regex: /\bmarital_?status/i, tier: 'medium', category: 'personal', label: 'Marital Status' },
  { regex: /\breligion/i, tier: 'medium', category: 'personal', label: 'Religion' },
  { regex: /\bsexual_?orient/i, tier: 'medium', category: 'personal', label: 'Sexual Orientation' },

  // User profile fields (upf0-upf24 convention)
  { regex: /\bupf\d+\b/i, tier: 'medium', category: 'personal', label: 'User Profile Field' },

  // Verification
  { regex: /\bverification_?(?:number|code|num)/i, tier: 'medium', category: 'identity', label: 'Verification Number' },

  // Location
  { regex: /\bcity\b/i, tier: 'medium', category: 'contact', label: 'City' },
  { regex: /\bstate\b/i, tier: 'medium', category: 'contact', label: 'State', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bprovince/i, tier: 'medium', category: 'contact', label: 'Province' },
  { regex: /\bzip_?code/i, tier: 'medium', category: 'contact', label: 'Zip Code' },
  { regex: /\bpostal_?code/i, tier: 'medium', category: 'contact', label: 'Postal Code' },
  { regex: /\bcountry\b/i, tier: 'medium', category: 'contact', label: 'Country' },
  { regex: /\blatitude/i, tier: 'medium', category: 'contact', label: 'Latitude' },
  { regex: /\blongitude/i, tier: 'medium', category: 'contact', label: 'Longitude' },
  { regex: /\blat\b/i, tier: 'medium', category: 'contact', label: 'Latitude', dataTypeRequire: /decimal|float|double|numeric/i },
  { regex: /\blng\b/i, tier: 'medium', category: 'contact', label: 'Longitude', dataTypeRequire: /decimal|float|double|numeric/i },
  { regex: /\bgeo_?loc/i, tier: 'medium', category: 'contact', label: 'Geolocation' },

  // Financial
  { regex: /\bsalary/i, tier: 'medium', category: 'financial', label: 'Salary' },
  { regex: /\bincome/i, tier: 'medium', category: 'financial', label: 'Income' },
  { regex: /\bwage/i, tier: 'medium', category: 'financial', label: 'Wage' },
  { regex: /\bcompensation/i, tier: 'medium', category: 'financial', label: 'Compensation' },
  { regex: /\bssn_?last_?4/i, tier: 'medium', category: 'identity', label: 'SSN Last 4' },
  { regex: /\blast_?four/i, tier: 'medium', category: 'financial', label: 'Card Last Four' },
  { regex: /\bcard_?(?:exp|expir)/i, tier: 'medium', category: 'financial', label: 'Card Expiration' },

  // ===== LOW: Indirect identifiers & quasi-identifiers =====

  // Free text / blobs that may contain PII
  { regex: /\bnotes?\b/i, tier: 'low', category: 'personal', label: 'Notes (may contain PII)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bdescription\b/i, tier: 'low', category: 'personal', label: 'Description (may contain PII)', dataTypeRequire: /text|blob/i },
  { regex: /\bcomments?\b/i, tier: 'low', category: 'personal', label: 'Comments (may contain PII)', dataTypeRequire: /text|blob/i },
  { regex: /\buser_?details/i, tier: 'low', category: 'personal', label: 'User Details' },
  { regex: /\bprofile_?data/i, tier: 'low', category: 'personal', label: 'Profile Data' },
  { regex: /\bmetadata\b/i, tier: 'low', category: 'personal', label: 'Metadata (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bother_?details/i, tier: 'low', category: 'personal', label: 'Other Details (may contain PII)' },
  { regex: /\breply\b/i, tier: 'low', category: 'personal', label: 'Reply (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bresponse\b/i, tier: 'low', category: 'personal', label: 'Response (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\berror_?message/i, tier: 'low', category: 'personal', label: 'Error Message (may contain PII)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\breference_?row/i, tier: 'low', category: 'personal', label: 'Reference Row (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bexpire_?message/i, tier: 'low', category: 'personal', label: 'Expire Message (may contain PII)' },

  // Serialized data blobs
  { regex: /\bobject\b/i, tier: 'low', category: 'personal', label: 'Serialized Object (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bobject_changes/i, tier: 'low', category: 'personal', label: 'Object Changes (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\brequest_?params/i, tier: 'low', category: 'personal', label: 'Request Params (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bredemption_?params/i, tier: 'low', category: 'personal', label: 'Redemption Params (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bpreferences\b/i, tier: 'low', category: 'personal', label: 'Preferences (may contain PII)', dataTypeRequire: LARGE_TEXT },
  { regex: /\bproperties\b/i, tier: 'low', category: 'personal', label: 'Properties (may contain PII)', dataTypeRequire: LARGE_TEXT },

  // Digital identifiers
  { regex: /\buser_?agent/i, tier: 'low', category: 'digital', label: 'User Agent' },
  { regex: /\breferral_?code/i, tier: 'low', category: 'digital', label: 'Referral Code' },
  { regex: /\bavatar/i, tier: 'low', category: 'digital', label: 'Avatar URL' },
  { regex: /\btimezone/i, tier: 'low', category: 'digital', label: 'Timezone' },
  { regex: /\blocale\b/i, tier: 'low', category: 'digital', label: 'Locale' },
  { regex: /\bsignup_?channel/i, tier: 'low', category: 'digital', label: 'Signup Channel' },
  { regex: /\busername/i, tier: 'low', category: 'digital', label: 'Username' },
  { regex: /\bnickname/i, tier: 'low', category: 'identity', label: 'Nickname' },
  { regex: /\bbio\b/i, tier: 'low', category: 'personal', label: 'Bio', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bfb_?(?:uid|id)/i, tier: 'low', category: 'digital', label: 'Facebook UID' },
  { regex: /\bgoogle_?(?:uid|id)/i, tier: 'low', category: 'digital', label: 'Google UID' },
  { regex: /\bapple_?(?:uid|id)/i, tier: 'low', category: 'digital', label: 'Apple UID' },
  { regex: /\bsocial_?(?:uid|id)/i, tier: 'low', category: 'digital', label: 'Social Login ID' },
  { regex: /\bdevice_?id/i, tier: 'low', category: 'digital', label: 'Device ID' },
  { regex: /\bapp_?device_?id/i, tier: 'low', category: 'digital', label: 'App Device ID' },
  { regex: /\bmac_?address/i, tier: 'low', category: 'digital', label: 'MAC Address' },
  { regex: /\bclient_?mac/i, tier: 'low', category: 'digital', label: 'Client MAC Address' },
  { regex: /\bimei\b/i, tier: 'low', category: 'digital', label: 'IMEI' },
  { regex: /\bcookie\b/i, tier: 'low', category: 'digital', label: 'Cookie', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bsession_?id/i, tier: 'low', category: 'digital', label: 'Session ID' },
  { regex: /\btracking_?id/i, tier: 'low', category: 'digital', label: 'Tracking ID' },
  { regex: /\badvertising_?id/i, tier: 'low', category: 'digital', label: 'Advertising ID' },
  { regex: /\bsource_?id/i, tier: 'low', category: 'digital', label: 'Source Identifier', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\buid\b/i, tier: 'low', category: 'digital', label: 'User ID', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bwhodunnit/i, tier: 'low', category: 'identity', label: 'Actor Identifier' },
  { regex: /\bidentifier\b/i, tier: 'low', category: 'identity', label: 'Identifier', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bserial_?number/i, tier: 'low', category: 'identity', label: 'Serial Number' },
  { regex: /\bbar_?code/i, tier: 'low', category: 'identity', label: 'Barcode' },
  { regex: /\bqr_/i, tier: 'low', category: 'digital', label: 'QR Data' },
  { regex: /\bpush_?token/i, tier: 'low', category: 'digital', label: 'Push Token' },
  { regex: /\bsurvey_?url/i, tier: 'low', category: 'digital', label: 'Survey URL (may contain PII)' },
  { regex: /\bpage_?url/i, tier: 'low', category: 'digital', label: 'Page URL (may contain PII)', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bpage_?id\b/i, tier: 'low', category: 'digital', label: 'Page ID' },
  { regex: /\binvited_?to/i, tier: 'low', category: 'contact', label: 'Invitation Target' },
  { regex: /\bpass_?type_?identifier/i, tier: 'low', category: 'identity', label: 'Pass Type Identifier' },
  { regex: /\bhost\b/i, tier: 'low', category: 'digital', label: 'Host', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bissuer_?id/i, tier: 'low', category: 'authentication', label: 'Issuer ID' },
  { regex: /\bservice_?account/i, tier: 'low', category: 'authentication', label: 'Service Account' },
  { regex: /\bmagic_?word/i, tier: 'low', category: 'authentication', label: 'Magic Word (secret)' },

  // Authentication — specific patterns first
  { regex: /\bencrypted_?password/i, tier: 'low', category: 'authentication', label: 'Encrypted Password' },
  { regex: /\bencrypted_?passcode/i, tier: 'low', category: 'authentication', label: 'Encrypted Passcode' },
  { regex: /\bpassword_?hash/i, tier: 'low', category: 'authentication', label: 'Password Hash' },
  { regex: /\bpassword_?digest/i, tier: 'low', category: 'authentication', label: 'Password Digest' },
  { regex: /\bpassword_?salt/i, tier: 'low', category: 'authentication', label: 'Password Salt' },
  { regex: /\bpasscode/i, tier: 'low', category: 'authentication', label: 'Passcode' },
  { regex: /\breset_?password_?token/i, tier: 'low', category: 'authentication', label: 'Reset Password Token' },
  { regex: /\breset_?passcode_?token/i, tier: 'low', category: 'authentication', label: 'Reset Passcode Token' },
  { regex: /\bauth_?token/i, tier: 'low', category: 'authentication', label: 'Auth Token' },
  { regex: /\baccess_?token/i, tier: 'low', category: 'authentication', label: 'Access Token' },
  { regex: /\brefresh_?token/i, tier: 'low', category: 'authentication', label: 'Refresh Token' },
  { regex: /\bauthentication_?token/i, tier: 'low', category: 'authentication', label: 'Authentication Token' },
  { regex: /\bconfirmation_?token/i, tier: 'low', category: 'authentication', label: 'Confirmation Token' },
  { regex: /\binvitation_?token/i, tier: 'low', category: 'authentication', label: 'Invitation Token' },
  { regex: /\bremember_?token/i, tier: 'low', category: 'authentication', label: 'Remember Token' },
  { regex: /\bverify_?token/i, tier: 'low', category: 'authentication', label: 'Verify Token' },
  { regex: /\bclaim_?token/i, tier: 'low', category: 'authentication', label: 'Claim Token' },
  { regex: /\bcorrelation_?token/i, tier: 'low', category: 'authentication', label: 'Correlation Token' },
  { regex: /\bprovider_?token/i, tier: 'low', category: 'authentication', label: 'Provider Token' },
  { regex: /\bapi_?key/i, tier: 'low', category: 'authentication', label: 'API Key' },
  { regex: /\bsecret_?key/i, tier: 'low', category: 'authentication', label: 'Secret Key' },
  { regex: /\bprivate_?key/i, tier: 'low', category: 'authentication', label: 'Private Key' },
  { regex: /\bpublic_?key/i, tier: 'low', category: 'authentication', label: 'Public Key' },
  { regex: /\bclient_?key/i, tier: 'low', category: 'authentication', label: 'Client Key' },
  { regex: /\bsecurity_?question/i, tier: 'low', category: 'authentication', label: 'Security Question' },
  { regex: /\bsecurity_?answer/i, tier: 'low', category: 'authentication', label: 'Security Answer' },
  { regex: /\bpin\b/i, tier: 'low', category: 'authentication', label: 'PIN', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\botp/i, tier: 'low', category: 'authentication', label: 'OTP / One-Time Password' },
  { regex: /\b2fa_?secret/i, tier: 'low', category: 'authentication', label: '2FA Secret' },
  { regex: /\btotp_?secret/i, tier: 'low', category: 'authentication', label: 'TOTP Secret' },
  { regex: /\bcertificate/i, tier: 'low', category: 'authentication', label: 'Certificate Data' },

  // Broad catch-all patterns — these fire on suffix matches via testColumnName
  // e.g. "zoho_auth_token" suffix "auth_token" → \btoken\b matches "token" suffix
  { regex: /\btoken\b/i, tier: 'low', category: 'authentication', label: 'Token', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bsecret\b/i, tier: 'low', category: 'authentication', label: 'Secret', dataTypeRequire: VARCHAR_TEXT },
  { regex: /\bkey\b/i, tier: 'low', category: 'authentication', label: 'Key', dataTypeRequire: VARCHAR_TEXT },
];
