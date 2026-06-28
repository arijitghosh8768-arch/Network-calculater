import re

def translate_cisco_to_vendor(cisco_config: str, target_vendor: str):
    """
    Parses Cisco CLI configurations and maps them to Juniper, NX-OS, MikroTik or Huawei formats.
    """
    lines = cisco_config.split("\n")
    translated = []

    if target_vendor == "JunOS":
        translated.append("/* Juniper JunOS Configuration Set Commands */")
        for line in lines:
            line = line.strip()
            # Hostname
            if line.startswith("hostname "):
                name = line.split(" ")[1]
                translated.append(f"set system host-name {name}")
            # VLAN definition
            elif line.startswith("vlan "):
                vlan_id = line.split(" ")[1]
                translated.append(f"set vlans vlan-{vlan_id} vlan-id {vlan_id}")
            # IP address interface
            elif line.startswith("interface Vlan"):
                v_id = line.replace("interface Vlan", "")
                translated.append(f"/* Interface VLAN {v_id} configuration */")
            elif line.startswith("ip address "):
                parts = line.split(" ")
                ip = parts[2]
                mask = parts[3]
                # convert mask to prefix
                prefix = sum(bin(int(x)).count('1') for x in mask.split('.'))
                translated.append(f"set interfaces irb unit <vlan_unit> family inet address {ip}/{prefix}")
            # BPDU guard
            elif "bpduguard enable" in line:
                translated.append("set protocols rstp interface all bpdu-block")

    elif target_vendor == "NX-OS":
        translated.append("! Cisco NX-OS configuration")
        for line in lines:
            line = line.strip()
            if line.startswith("hostname "):
                translated.append(line)
            elif line.startswith("vlan "):
                translated.append(line)
            elif line.startswith("name "):
                translated.append(line)
            elif line.startswith("interface Vlan"):
                translated.append(line)
            elif line.startswith("ip address "):
                parts = line.split(" ")
                ip = parts[2]
                mask = parts[3]
                prefix = sum(bin(int(x)).count('1') for x in mask.split('.'))
                translated.append(f"  ip address {ip}/{prefix}")
            elif line.startswith("standby "):
                # NX-OS uses VRRP or HSRP syntax but standard NX-OS style:
                translated.append(line.replace("standby", "hsrp"))
            elif line:
                translated.append(line)

    elif target_vendor == "RouterOS":
        translated.append("# MikroTik RouterOS CLI Config Scripts")
        for line in lines:
            line = line.strip()
            if line.startswith("hostname "):
                name = line.split(" ")[1]
                translated.append(f"/system identity set name={name}")
            elif line.startswith("vlan "):
                v_id = line.split(" ")[1]
                translated.append(f"/interface vlan add name=vlan{v_id} vlan-id={v_id} interface=bridge")
            elif line.startswith("ip address "):
                parts = line.split(" ")
                ip = parts[2]
                mask = parts[3]
                prefix = sum(bin(int(x)).count('1') for x in mask.split('.'))
                translated.append(f"/ip address add address={ip}/{prefix} interface=vlan_interface")
            elif "bpduguard enable" in line:
                translated.append("/interface bridge port set [find] bpdu-guard=yes")

    elif target_vendor == "Huawei":
        translated.append("# Huawei VRP Config Script")
        for line in lines:
            line = line.strip()
            if line.startswith("hostname "):
                name = line.split(" ")[1]
                translated.append(f"sysname {name}")
            elif line.startswith("vlan "):
                v_id = line.split(" ")[1]
                translated.append(f"vlan {v_id}")
            elif line.startswith("name "):
                name = line.split(" ")[1]
                translated.append(f" description {name}")
            elif line.startswith("interface Vlan"):
                v_id = line.replace("interface Vlan", "")
                translated.append(f"interface Vlanif {v_id}")
            elif line.startswith("ip address "):
                parts = line.split(" ")
                ip = parts[2]
                mask = parts[3]
                prefix = sum(bin(int(x)).count('1') for x in mask.split('.'))
                translated.append(f" ip address {ip} {prefix}")
            elif "bpduguard enable" in line:
                translated.append("stp bpdu-protection")
    else:
        translated.append(cisco_config)

    return "\n".join(translated)
