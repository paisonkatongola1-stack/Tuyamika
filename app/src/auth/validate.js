export const COUNTRIES = [
  { code: 'ZM', name: 'Zambia', dial: '+260', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', currency: 'USD' },
];

export const GIFT_CATEGORIES = ['Home & Living', 'Fashion', 'Beauty', 'Electronics', 'Hampers', 'Personalised', 'Jewellery', 'Kids & Toys'];

export function validateEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email) return { error: 'Enter your email address to continue.' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return { error: 'That email looks incomplete. Use a format like name@example.com.' };
  return { email };
}

export function validatePassword(raw) {
  const password = String(raw || '');
  if (password.length < 8) return { error: 'Password needs at least 8 characters.' };
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return { error: 'Mix letters and numbers so your account stays secure.' };
  return { password };
}

export function validatePhone(raw, countryCode = 'ZM') {
  const country = COUNTRIES.find((item) => item.code === countryCode);
  if (!country) return { error: 'Choose Zambia or Zimbabwe for your phone number.' };

  let digits = String(raw || '').trim().replace(/[\s-().]/g, '');
  if (!digits) return { error: 'Enter your phone number.' };
  if (!/^\+?\d+$/.test(digits)) return { error: 'Use digits and an optional leading + only.' };
  digits = digits.replace(/^\+/, '');

  const dialCode = country.dial.slice(1);
  if (digits.startsWith(dialCode)) digits = digits.slice(dialCode.length);
  if (digits.startsWith('0')) digits = digits.slice(1);

  const validNationalNumber = countryCode === 'ZM' ? /^9\d{8}$/ : /^7\d{8}$/;
  if (!validNationalNumber.test(digits)) {
    return {
      error: countryCode === 'ZM'
        ? 'Use a Zambian mobile number, like 0971234567 or +260971234567.'
        : 'Use a Zimbabwean mobile number, like 0771234567 or +263771234567.',
    };
  }
  return { phone: `${country.dial}${digits}` };
}

export function validateName(raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'Tell us your name so guests know who you are.' };
  if (name.length < 2 || name.length > 60) return { error: 'Name must be between 2 and 60 characters.' };
  if (!/^[A-Za-z\u00C0-\u024F' -]+$/.test(name)) return { error: 'Use letters, spaces, apostrophes or hyphens only.' };
  return { name };
}

export function validateOccasionDate(raw) {
  const date = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Enter the date as YYYY-MM-DD.' };
  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return { error: 'That is not a real calendar date.' };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d)
    return { error: 'That date does not exist, like 31 February.' };
  return { date };
}

export function validateBirthday(raw) {
  const value = String(raw || '').trim();
  if (!value) return { birthday: null };
  const result = validateOccasionDate(value);
  if (result.error) return { error: 'Birthday must be a real date, format YYYY-MM-DD (optional field).' };
  if (result.date > new Date().toISOString().slice(0, 10)) return { error: 'Birthday cannot be in the future.' };
  return { birthday: result.date };
}
