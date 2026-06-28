const API_BASE = "http://127.0.0.1:8000/api";

// Fallback calculations in typescript to make the frontend 100% functional standalone/offline
export function ipv4CalcLocal(ip: string, cidr: number) {
  try {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0 || p > 255) || cidr < 0 || cidr > 32) {
      throw new Error("Invalid IP or CIDR");
    }

    const ipNum = (parts[0] << 24) >>> 0 | (parts[1] << 16) >>> 0 | (parts[2] << 8) >>> 0 | parts[3];
    
    // Mask
    const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const wildcardNum = ~maskNum >>> 0;
    
    const netNum = (ipNum & maskNum) >>> 0;
    const broadNum = (netNum | wildcardNum) >>> 0;
    
    const numAddresses = Math.pow(2, 32 - cidr);
    const usableHosts = cidr >= 31 ? numAddresses : numAddresses - 2;

    const numToIp = (num: number) => [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');

    // Binary octets
    const ipBin = ipNum.toString(2).padStart(32, '0');
    const binaryOctets = [];
    for (let i = 0; i < 4; i++) {
      const octetDetails = [];
      for (let j = 0; j < 8; j++) {
        const idx = i * 8 + j;
        octetDetails.push({
          bit: ipBin[idx],
          type: idx < cidr ? "network" : "host",
          position: idx
        });
      }
      binaryOctets.push(octetDetails);
    }

    // Class
    const firstOctet = parts[0];
    let ipClass = "Unknown";
    if (firstOctet >= 1 && firstOctet <= 126) ipClass = "A";
    else if (firstOctet === 127) ipClass = "A (Loopback)";
    else if (firstOctet >= 128 && firstOctet <= 191) ipClass = "B";
    else if (firstOctet >= 192 && firstOctet <= 223) ipClass = "C";
    else if (firstOctet >= 224 && firstOctet <= 239) ipClass = "D (Multicast)";
    else if (firstOctet >= 240 && firstOctet <= 255) ipClass = "E (Experimental)";

    // Type
    let ipType = "Public";
    if (firstOctet === 10 || (firstOctet === 172 && parts[1] >= 16 && parts[1] <= 31) || (firstOctet === 192 && parts[1] === 168)) {
      ipType = "Private";
    } else if (firstOctet === 127) {
      ipType = "Loopback";
    } else if (firstOctet === 169 && parts[1] === 254) {
      ipType = "APIPA (Link-Local)";
    } else if (firstOctet >= 224 && firstOctet <= 239) {
      ipType = "Multicast";
    }

    return {
      success: true,
      ip,
      cidr,
      network_address: numToIp(netNum),
      broadcast_address: numToIp(broadNum),
      subnet_mask: numToIp(maskNum),
      wildcard_mask: numToIp(wildcardNum),
      first_host: cidr === 32 ? "N/A" : numToIp(netNum + 1),
      last_host: cidr === 32 ? "N/A" : numToIp(broadNum - 1),
      total_hosts: numAddresses,
      usable_hosts: Math.max(0, usableHosts),
      ip_class: ipClass,
      ip_type: ipType,
      binary_octets: binaryOctets
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function requestApi(path: string, method: "GET" | "POST", body?: any) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "API Request Failed");
    }
    return await res.json();
  } catch (e: any) {
    console.warn(`API error, using local fallback where possible:`, e.message);
    throw e;
  }
}
