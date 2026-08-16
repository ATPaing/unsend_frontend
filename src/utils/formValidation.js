export function isRequired(value) {
  return Boolean(value && String(value).trim())
}

export function isSixDigitPin(value) {
  return /^\d{6}$/.test(String(value).trim())
}

export function validateLogin({ username, password }) {
  const errors = {}

  if (!isRequired(username)) {
    errors.username = 'Username is required.'
  }

  if (!isRequired(password)) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateUnlock({ pin }) {
  const errors = {}

  if (!isRequired(pin)) {
    errors.pin = 'Security PIN is required.'
  } else if (!isSixDigitPin(pin)) {
    errors.pin = 'PIN must be exactly 6 digits.'
  }

  return errors
}

export function validateRegister({
  username,
  password,
  confirmPassword,
  pin,
  confirmPin,
}) {
  const errors = {}

  if (!isRequired(username)) {
    errors.username = 'Username is required.'
  }

  if (!isRequired(password)) {
    errors.password = 'Password is required.'
  }

  if (!isRequired(confirmPassword)) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  if (!isRequired(pin)) {
    errors.pin = 'Security PIN is required.'
  } else if (!isSixDigitPin(pin)) {
    errors.pin = 'PIN must be exactly 6 digits.'
  }

  if (!isRequired(confirmPin)) {
    errors.confirmPin = 'Please confirm your PIN.'
  } else if (pin !== confirmPin) {
    errors.confirmPin = 'PINs do not match.'
  }

  return errors
}

export function validateChangePassword({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  const errors = {}

  if (!isRequired(currentPassword)) {
    errors.currentPassword = 'Current password is required.'
  }

  if (!isRequired(newPassword)) {
    errors.newPassword = 'New password is required.'
  }

  if (!isRequired(confirmPassword)) {
    errors.confirmPassword = 'Please confirm your new password.'
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  } else if (newPassword && currentPassword && newPassword === currentPassword) {
    errors.newPassword = 'New password must be different.'
  }

  return errors
}

export function validateChangePin({ currentPin, newPin, confirmPin }) {
  // Used by Settings → Change PIN
  const errors = {}

  if (!isRequired(currentPin)) {
    errors.currentPin = 'Current PIN is required.'
  } else if (!isSixDigitPin(currentPin)) {
    errors.currentPin = 'PIN must be exactly 6 digits.'
  }

  if (!isRequired(newPin)) {
    errors.newPin = 'New PIN is required.'
  } else if (!isSixDigitPin(newPin)) {
    errors.newPin = 'PIN must be exactly 6 digits.'
  }

  if (!isRequired(confirmPin)) {
    errors.confirmPin = 'Please confirm your new PIN.'
  } else if (newPin !== confirmPin) {
    errors.confirmPin = 'PINs do not match.'
  } else if (newPin && currentPin && newPin === currentPin) {
    errors.newPin = 'New PIN must be different.'
  }

  return errors
}
