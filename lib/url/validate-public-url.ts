import "server-only";
import { isIP } from "node:net";
import { UrlValidationError, normalizeUrl, type NormalizedUrlResult } from "./normalize-url";
import { resolveHost, type HostResolver, type ResolvedAddress } from "./resolve-host";

const BLOCKED_HOSTS = new Set([
  "localhost", "localhost.localdomain", "local", "broadcasthost", "ip6-localhost",
  "metadata", "metadata.google.internal", "instance-data", "kubernetes.default.svc",
]);

function ipv4Number(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const values = parts.map(Number);
  if (values.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((values[0] * 256 + values[1]) * 256 + values[2]) * 256 + values[3]) >>> 0;
}

function inV4Cidr(value: number, base: string, bits: number) {
  const baseValue = ipv4Number(base)!;
  const blockSize = 2 ** (32 - bits);
  return Math.floor(value / blockSize) === Math.floor(baseValue / blockSize);
}

export function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const value = ipv4Number(address);
    if (value === null) return false;
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !blocked.some(([base, bits]) => inV4Cidr(value, base, bits));
  }
  if (version === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    const mapped = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    // Currently allocated public unicast IPv6 space is 2000::/3. This safely
    // excludes loopback, unspecified, ULA, link-local, multicast and reserved space.
    const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff && !normalized.startsWith("2001:db8:");
  }
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home") || host.endsWith(".lan");
}

export type ValidatedPublicUrl = NormalizedUrlResult & { addresses: ResolvedAddress[] };

export async function validatePublicUrl(input: string | URL, resolver: HostResolver = resolveHost): Promise<ValidatedPublicUrl> {
  const normalized = normalizeUrl(input instanceof URL ? input.toString() : input);
  const hostname = normalized.url.hostname.replace(/^\[|\]$/g, "");

  if (isBlockedHostname(hostname)) {
    throw new UrlValidationError("BLOCKED_TARGET", "Local and internal network addresses cannot be tested.");
  }

  let addresses: ResolvedAddress[];
  if (isIP(hostname)) {
    addresses = [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  } else {
    try {
      addresses = await resolver(hostname);
    } catch {
      throw new UrlValidationError("DNS_FAILED", "We could not find that website. Check the address and try again.");
    }
  }

  if (!addresses.length) {
    throw new UrlValidationError("DNS_FAILED", "We could not find that website. Check the address and try again.");
  }
  if (addresses.some(({ address }) => !isPublicIp(address))) {
    throw new UrlValidationError("BLOCKED_TARGET", "This address points to a private or restricted network and cannot be tested.");
  }

  return { ...normalized, addresses };
}

export async function validateRedirectTarget(location: string, currentUrl: URL, resolver: HostResolver = resolveHost) {
  let destination: URL;
  try {
    destination = new URL(location, currentUrl);
  } catch {
    throw new UrlValidationError("INVALID_URL", "The website returned an invalid redirect address.");
  }
  return validatePublicUrl(destination, resolver);
}
