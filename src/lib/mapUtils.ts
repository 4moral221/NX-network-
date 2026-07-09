export const parseCoordinate = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const getUserObj = (usersVal: any) => {
  if (!usersVal) return null;
  if (Array.isArray(usersVal)) {
    return usersVal[0] || null;
  }
  return usersVal;
};
