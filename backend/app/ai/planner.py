import re
import ipaddress
import math
import requests

def extract_numbers(text: str):
    """
    Helper to extract host counts and department counts from user queries.
    """
    numbers = [int(s) for s in re.findall(r'\b\d+\b', text)]
    return numbers

def get_network_advice(query: str, api_key: str = None):
    """
    Generates professional network planning advice based on the user's requirements.
    Can use Gemini API if a key is provided, or uses a high-fidelity local rules engine.
    """
    # If API key is provided, check format and route accordingly
    if api_key:
        if api_key.strip().startswith("nvapi-"):
            try:
                url = "https://integrate.api.nvidia.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key.strip()}",
                    "Content-Type": "application/json"
                }
                prompt = (
                    "You are an expert CCIE Network Architect AI. Give a concise, professional subnetting and network planning "
                    f"recommendation for this requirement: '{query}'. Use Markdown tables, suggest a base network CIDR, VLSM divisions, "
                    "Cisco configuration snippets, and security/future growth advice. Keep it compact and readable."
                )
                data = {
                    "model": "meta/llama-3-70b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 1024
                }
                response = requests.post(url, headers=headers, json=data, timeout=15)
                if response.status_code == 200:
                    result = response.json()
                    text = result["choices"][0]["message"]["content"]
                    return {"success": True, "source": "NVIDIA API (Llama-3)", "advice": text}
            except Exception as e:
                # Fallback to local rule-based engine on error
                pass
        else:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key.strip()}"
                headers = {"Content-Type": "application/json"}
                prompt = (
                    "You are an expert CCIE Network Architect AI. Give a concise, professional subnetting and network planning "
                    f"recommendation for this requirement: '{query}'. Use Markdown tables, suggest a base network CIDR, VLSM divisions, "
                    "Cisco configuration snippets, and security/future growth advice. Keep it compact and readable."
                )
                data = {"contents": [{"parts": [{"text": prompt}]}]}
                response = requests.post(url, headers=headers, json=data, timeout=10)
                if response.status_code == 200:
                    result = response.json()
                    text = result["candidates"][0]["content"]["parts"][0]["text"]
                    return {"success": True, "source": "Gemini API", "advice": text}
            except Exception as e:
                # Fallback to local rule-based engine on error
                pass


    # High-fidelity Local Rules Engine
    query_lower = query.lower()
    
    # Defaults
    hosts = 100
    depts = 3
    
    # Try to extract numbers
    nums = extract_numbers(query)
    if len(nums) >= 2:
        # Assume larger number is hosts, smaller is departments/subnets
        hosts = max(nums)
        depts = min(nums)
    elif len(nums) == 1:
        hosts = nums[0]
        depts = 4 # default
        
    # Calculate required base network size
    # Total hosts + growth factor (e.g. 20% growth) + overhead (network/broadcast per subnet)
    growth_hosts = int(hosts * 1.25)
    total_ips_needed = growth_hosts + (depts * 2)
    
    # Smallest power of 2
    pow2 = 2 ** math.ceil(math.log2(total_ips_needed))
    cidr = 32 - int(math.log2(pow2))
    if cidr < 8:
        cidr = 24 # fail-safe
        
    # Decide base network class
    if cidr >= 24:
        base_net = "192.168.1.0"
    elif cidr >= 16:
        base_net = "172.16.0.0"
    else:
        base_net = "10.0.0.0"
        
    # Distribute hosts using VLSM logic (uneven split to show off VLSM)
    # E.g. largest department gets 50%, second gets 25%, etc.
    allocated = []
    remaining_hosts = hosts
    dept_names = ["Engineering", "Sales", "Support", "Management", "Finance", "HR", "Guest"]
    
    current_addr = ipaddress.IPv4Address(base_net)
    
    for i in range(depts):
        dept_name = dept_names[i] if i < len(dept_names) else f"Department {i+1}"
        # Split: 50%, 25%, etc. Last department gets the rest
        if i == depts - 1:
            dept_hosts = max(2, remaining_hosts)
        else:
            dept_hosts = max(2, int(remaining_hosts * 0.5))
            remaining_hosts -= dept_hosts
            
        dept_ips = dept_hosts + 2
        dept_pow2 = 2 ** math.ceil(math.log2(dept_ips))
        dept_cidr = 32 - int(math.log2(dept_pow2))
        
        # Subnet address
        subnet = ipaddress.IPv4Network(f"{current_addr}/{dept_cidr}", strict=False)
        allocated.append({
            "name": dept_name,
            "hosts": dept_hosts,
            "network": str(subnet.network_address),
            "cidr": f"/{dept_cidr}",
            "mask": str(subnet.netmask),
            "range": f"{list(subnet.hosts())[0]} - {list(subnet.hosts())[-1]}" if len(list(subnet.hosts())) > 0 else "N/A"
        })
        current_addr = subnet.broadcast_address + 1

    # Format the advice markdown
    advice = f"""### R-Zenith NetCalc AI Architect Suggestions

Based on your query: *"{query}"*, here is a premium subnet and network planning proposal.

#### Summary of Requirements
* **Estimated Hosts Required:** {hosts} (with 25% future growth headroom: **{growth_hosts}** hosts)
* **Number of Subnets/Departments:** {depts}
* **Recommended Base Network:** `{base_net}/{cidr}` (Mask: `{ipaddress.IPv4Network(f"{base_net}/{cidr}").netmask}`)

---

#### VLSM Subnet Allocation Table
| Department | Hosts Needed | Network Address | CIDR | Subnet Mask | Usable Range |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""
    for a in allocated:
        advice += f"| **{a['name']}** | {a['hosts']} | `{a['network']}` | **{a['cidr']}** | `{a['mask']}` | `{a['range']}` |\n"
        
    advice += f"""
---

#### Cisco Configuration Statements

Here is the configuration template for your core router to establish these interfaces:

```cisco
! Core Router Interface Configuration
router ospf 100
 log-adjacency-changes
"""

    for a in allocated:
        net_str = f"{a['network']}{a['cidr']}"
        hmask = ipaddress.IPv4Network(net_str).hostmask
        advice += f" network {a['network']} {hmask} area 0\n"


    advice += f"""
interface GigabitEthernet0/0
 description Base Connection
 ip address {base_net} {ipaddress.IPv4Network(f"{base_net}/{cidr}").netmask}
 no shutdown
```

---

#### Security & Growth Best Practices
1. **APIPA Protection:** Configure your DHCP servers to avoid allocating APIPA range (`169.254.0.0/16`) to clients.
2. **Access Control lists (ACLs):** Restrict traffic between sensitive departments (e.g., Finance & HR) and the Guest subnet.
3. **IPv6 Transition:** Ensure you double-stack with IPv6 prefixes like `2001:db8:1::{a['cidr']}` to prepare for future-proof addressing.
"""

    return {"success": True, "source": "Local Rules Engine", "advice": advice}
