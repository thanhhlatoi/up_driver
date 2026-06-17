const VALID_USERS = ["User_A", "User_B"] as const;

export type ValidUserName = (typeof VALID_USERS)[number];

export function isValidUserName(userName: string): userName is ValidUserName {
  return VALID_USERS.includes(userName as ValidUserName);
}

export { VALID_USERS };
