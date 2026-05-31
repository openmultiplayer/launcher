// Validation utilities with improved performance and type safety

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX =
  /^(?:\[(?:[0-9A-Fa-f:]+)\]|(?:[0-9A-Fa-f:]+))$/;
const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]+([-.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
const WEB_URL_REGEX =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&=/]*)$/;

export const isIPv4 = (ip: string): boolean => {
  if (!ip || typeof ip !== "string") return false;
  return IPV4_REGEX.test(ip);
};

export const normalizeIPv6 = (ip: string): string => {
  return ip.trim().replace(/^\[/, "").replace(/\]$/, "");
};

export const isIPv6 = (ip: string): boolean => {
  if (!ip || typeof ip !== "string") return false;
  const normalized = normalizeIPv6(ip);
  return normalized.includes(":") && IPV6_REGEX.test(ip.trim());
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

export const validateServerAddress = (address: string): boolean => {
  if (!address || typeof address !== "string") return false;
  return (
    validateServerAddressIPv4(address) ||
    isIPv6(address) ||
    isValidDomain(address)
  );
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
  return validateServerAddress(ip) && validatePort(port);
};

export interface ParsedServerAddress {
  ip: string;
  port: number;
}

export const parseServerAddress = (
  address: string,
  defaultPort: number = 7777
): ParsedServerAddress | null => {
  if (!address || typeof address !== "string") return null;

  const trimmed = address.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[")) {
    const closingBracket = trimmed.indexOf("]");
    if (closingBracket === -1) return null;

    const host = trimmed.slice(1, closingBracket);
    const suffix = trimmed.slice(closingBracket + 1);
    if (!isIPv6(host)) return null;

    if (!suffix) {
      return { ip: host, port: defaultPort };
    }

    if (!suffix.startsWith(":")) return null;
    const port = parseInt(suffix.slice(1), 10);
    return validatePort(port) ? { ip: host, port } : null;
  }

  if (isIPv6(trimmed)) {
    return { ip: normalizeIPv6(trimmed), port: defaultPort };
  }

  const separatorIndex = trimmed.lastIndexOf(":");
  if (separatorIndex !== -1) {
    const host = trimmed.slice(0, separatorIndex);
    const port = parseInt(trimmed.slice(separatorIndex + 1), 10);
    if (validateServerAddress(host) && validatePort(port)) {
      return { ip: host, port };
    }
  }

  if (validateServerAddress(trimmed)) {
    return { ip: trimmed, port: defaultPort };
  }

  return null;
};
