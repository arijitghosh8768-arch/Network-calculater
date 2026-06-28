import pytest
from app.engine.designer import design_network_plan, validate_network_design

def test_design_network_plan():
    requirements = {
        "network_type": "School",
        "labs_count": 2,
        "server_room": True,
        "admin_office": True,
        "student_count": 100,
        "teacher_count": 20,
        "need_wifi": True,
        "need_cctv": True,
        "base_ip": "192.168.0.0/16"
    }
    result = design_network_plan(requirements)
    assert result["success"] is True
    assert len(result["devices"]) > 0
    assert len(result["vlan_plans"]) > 0
    assert "SW-Core" in [d["name"] for d in result["devices"]]
    assert "R1" in [d["name"] for d in result["devices"]]

def test_validate_network_design_default():
    requirements = {
        "network_type": "School",
        "labs_count": 2,
        "server_room": True,
        "admin_office": True,
        "student_count": 100,
        "teacher_count": 20,
        "need_wifi": True,
        "need_cctv": True,
        "base_ip": "192.168.0.0/16"
    }
    res = validate_network_design(requirements)
    assert res["success"] is True
    for check in res["checks"]:
        assert check["passed"] is True

def test_validate_network_design_sim_overlap():
    requirements = {
        "network_type": "School",
        "labs_count": 2,
        "server_room": True,
        "admin_office": True,
        "student_count": 100,
        "teacher_count": 20,
        "need_wifi": True,
        "need_cctv": True,
        "base_ip": "192.168.0.0/16",
        "simulate_overlap": True
    }
    res = validate_network_design(requirements)
    assert res["success"] is True
    overlap_check = next(c for c in res["checks"] if c["check"] == "IP Subnet Overlap")
    assert overlap_check["passed"] is False

def test_validate_network_design_sim_missing_trunk():
    requirements = {
        "network_type": "School",
        "labs_count": 2,
        "server_room": True,
        "admin_office": True,
        "student_count": 100,
        "teacher_count": 20,
        "need_wifi": True,
        "need_cctv": True,
        "base_ip": "192.168.0.0/16",
        "simulate_missing_trunk": True
    }
    res = validate_network_design(requirements)
    assert res["success"] is True
    trunk_check = next(c for c in res["checks"] if c["check"] == "Trunk Port Matching")
    assert trunk_check["passed"] is False

def test_validate_network_design_sim_missing_gateway():
    requirements = {
        "network_type": "School",
        "labs_count": 2,
        "server_room": True,
        "admin_office": True,
        "student_count": 100,
        "teacher_count": 20,
        "need_wifi": True,
        "need_cctv": True,
        "base_ip": "192.168.0.0/16",
        "simulate_missing_gateway": True
    }
    res = validate_network_design(requirements)
    assert res["success"] is True
    gateway_check = next(c for c in res["checks"] if c["check"] == "Default Gateway Assignment")
    assert gateway_check["passed"] is False
