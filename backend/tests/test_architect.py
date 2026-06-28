import pytest
from app.engine.architect import design_architect_plan, get_hld_lld_documents
from app.engine.vendors import translate_cisco_to_vendor
from app.engine.troubleshooter import analyze_cli_logs

def test_design_architect_plan():
    reqs = {
        "company_type": "Hospital",
        "floors": 3,
        "users": 1000,
        "branches": 2,
        "need_wifi": True,
        "need_voip": True,
        "need_cctv": True,
        "need_servers": True,
        "need_guest": True,
        "base_ip": "172.16.0.0/16",
        "architecture_style": "Three-Tier"
    }
    res = design_architect_plan(reqs)
    assert res["success"] is True
    assert res["company"] == "Hospital"
    assert res["ap_count"] > 0
    assert len(res["vlan_plans"]) > 0
    assert "vlan 10" in res["cisco_config"]

def test_get_hld_lld_documents():
    reqs = {"users": 500, "floors": 3}
    design = {
        "company": "Bank",
        "base_ip": "172.16.0.0/16",
        "vlan_plans": [{"vlan_id": 10, "vlan_name": "MGMT", "network": "172.16.1.0", "cidr": 24, "gateway": "172.16.1.1", "dhcp_range": "1.2 - 1.254"}]
    }
    docs = get_hld_lld_documents(reqs, design)
    assert "High-Level Design" in docs["hld"]
    assert "Low-Level Design" in docs["lld"]
    assert "SOP" in docs["sop"]

def test_translate_cisco_to_vendor():
    cisco = "hostname CoreSW\nvlan 10\n"
    junos = translate_cisco_to_vendor(cisco, "JunOS")
    assert "set system host-name" in junos
    assert "set vlans vlan-10" in junos

def test_analyze_cli_logs():
    log = "GigabitEthernet0/1      10.1.1.1      YES manual administratively down down"
    res = analyze_cli_logs(log)
    assert res["success"] is True
    assert "Interface GigabitEthernet0/1 is administratively disabled." in res["issues"]
    assert "no shutdown" in res["solutions"]

def test_calculate_wlan_heatmap():
    from app.engine.architect import calculate_wlan_heatmap
    res = calculate_wlan_heatmap(80, 120, 3)
    assert res["success"] is True
    assert res["total_aps"] > 0
    assert len(res["aps"]) == res["total_aps"]

def test_validate_architect_design():
    from app.engine.architect import validate_architect_design
    reqs = {}
    design = {
        "vlan_plans": [{"vlan_id": 10, "gateway": "172.16.1.1"}],
        "cisco_config": "spanning-tree mode rapid-pvst"
    }
    res = validate_architect_design(reqs, design)
    assert res["success"] is True
    assert all(c["passed"] for c in res["checks"])

def test_export_rzpkt_project():
    from app.engine.architect import export_rzpkt_project
    reqs = {"users": 100}
    design = {"company": "TestBank", "cisco_config": "hostname Test"}
    res = export_rzpkt_project(reqs, design)
    assert res["version"] == "NetArchitectX-2.0"
    assert res["project_name"] == "TestBank_Automation_Pack"

