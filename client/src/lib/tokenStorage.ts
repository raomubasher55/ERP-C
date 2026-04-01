const STORAGE_KEY = "epr_token";

let inMemoryToken = "";

export const tokenStorage = {
  get: () => inMemoryToken || localStorage.getItem(STORAGE_KEY) || "",
  set: (token: string) => {
    inMemoryToken = token;
    localStorage.setItem(STORAGE_KEY, token);
  },
  clear: () => {
    inMemoryToken = "";
    localStorage.removeItem(STORAGE_KEY);
  },
};
