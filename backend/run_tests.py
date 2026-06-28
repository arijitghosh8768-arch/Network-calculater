import unittest
import sys
import os

# Adjust path to import backend modules correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tests.test_engine import (
    test_parse_ipv4,
    test_cidr_to_mask,
    test_mask_to_cidr,
    test_flsm_subnets,
    test_vlsm
)
from tests.test_designer import (
    test_design_network_plan,
    test_validate_network_design_default,
    test_validate_network_design_sim_overlap,
    test_validate_network_design_sim_missing_trunk,
    test_validate_network_design_sim_missing_gateway
)

class TestSubnetEngine(unittest.TestCase):
    def test_ipv4(self):
        test_parse_ipv4()
        
    def test_cidr(self):
        test_cidr_to_mask()
        
    def test_mask(self):
        test_mask_to_cidr()
        
    def test_flsm(self):
        test_flsm_subnets()
        
    def test_vlsm(self):
        test_vlsm()

    def test_designer_plan(self):
        test_design_network_plan()

    def test_designer_validate_default(self):
        test_validate_network_design_default()

    def test_designer_validate_overlap(self):
        test_validate_network_design_sim_overlap()

    def test_designer_validate_trunk(self):
        test_validate_network_design_sim_missing_trunk()

    def test_designer_validate_gateway(self):
        test_validate_network_design_sim_missing_gateway()

    def test_architect_design(self):
        from tests.test_architect import test_design_architect_plan
        test_design_architect_plan()

    def test_architect_docs(self):
        from tests.test_architect import test_get_hld_lld_documents
        test_get_hld_lld_documents()

    def test_architect_translate(self):
        from tests.test_architect import test_translate_cisco_to_vendor
        test_translate_cisco_to_vendor()

    def test_architect_troubleshoot(self):
        from tests.test_architect import test_analyze_cli_logs
        test_analyze_cli_logs()

    def test_architect_heatmap(self):
        from tests.test_architect import test_calculate_wlan_heatmap
        test_calculate_wlan_heatmap()

    def test_architect_validate_design(self):
        from tests.test_architect import test_validate_architect_design
        test_validate_architect_design()

    def test_architect_export(self):
        from tests.test_architect import test_export_rzpkt_project
        test_export_rzpkt_project()

    def test_analyzer_parse(self):
        from tests.test_analyzer import test_parse_cisco_config_text
        test_parse_cisco_config_text()

if __name__ == "__main__":
    unittest.main()

