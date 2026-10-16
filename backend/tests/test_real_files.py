"""
Test run_forecast against actual real-world CSV and Excel files in backend/uploads/.
"""
import os
import glob
import unittest
from backend.model import run_forecast

class TestRealWorldDatasets(unittest.TestCase):
    def test_auto_sales_csv(self):
        matches = glob.glob("backend/uploads/*Auto_Sales_data*.csv")
        if not matches:
            self.skipTest("No Auto_Sales_data.csv found")
        csv_file = matches[0]
        result = run_forecast(csv_file, options={"lead_time_days": 14, "service_level": 95.0})
        self.assertIn("selected_model", result)
        self.assertGreater(result["accuracy"], 50.0)
        self.assertGreater(len(result["products"]), 0)
        self.assertEqual(len(result["future_30days"]), 30)
        self.assertGreater(len(result["scorecard"]), 2)

    def test_excel_file_if_present(self):
        matches = glob.glob("backend/uploads/*.xlsx")
        if not matches:
            self.skipTest("No xlsx file found")
        xlsx_file = matches[0]
        try:
            result = run_forecast(xlsx_file)
            self.assertIn("selected_model", result)
            self.assertGreater(len(result["future_30days"]), 0)
        except ValueError as e:
            # If excel file doesn't have sales/date columns (e.g. empty Book.xlsx), handle gracefully
            self.assertIn("column", str(e).lower())

if __name__ == "__main__":
    unittest.main()
