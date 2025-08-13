// Validation utilities with improved performance and type safety

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]+([-.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
const WEB_URL_REGEX =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&=/]*)$/;

export const isIPv4 = (ip: string): boolean => {
  if (!ip || typeof ip !== "string") return false;
  return IPV4_REGEX.test(ip);
};

export const isValidDomain = (domain: string): boolean => {
  if (!domain || typeof domain !== "string") return false;
  return DOMAIN_REGEX.test(domain);
};

export const validateServerAddressIPv4 = (address: string): boolean => {
  if (!address || typeof address !== "string") return false;

  // Check localhost first (fastest check)
  if (address === "localhost") return true;

  // Check IPv4
  if (isIPv4(address)) return true;

  // Check domain, return false if it's valid (to resolve hostname later)
  return false;
};

export const validateWebUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;

  // If URL already has protocol, test as-is
  if (/^https?:\/\//.test(url)) {
    return WEB_URL_REGEX.test(url);
  }

  // Try with https:// prefix
  const httpsUrl = `https://${url}`;
  if (WEB_URL_REGEX.test(httpsUrl)) {
    return true;
  }

  // Try with http:// prefix
  const httpUrl = `http://${url}`;
  return WEB_URL_REGEX.test(httpUrl);
};

export const validatePort = (port: number | string): boolean => {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
};

export const validateServerEndpoint = (
  ip: string,
  port: number | string
): boolean => {
  return validateServerAddressIPv4(ip) && validatePort(port);
};
