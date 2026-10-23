export function readLocal(key, fallback, isValid = () => true) {
  try {
    const value = JSON.parse(localStorage.getItem(`movimexa.${key}`));
    return value !== null && isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(`movimexa.${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
