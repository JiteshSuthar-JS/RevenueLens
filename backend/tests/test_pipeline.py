"""
Unit and integration test suite for RevenueLens forecasting, inventory, data preprocessing,
and API integration.
"""
import os
import unittest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from backend.model import (
    read_file,
    detect_columns,
    clean_and_validate_data,
    run_chronological_backtest,
    generate_future_forecast,
    generate_30day_daily_curve,
    optimize_product_inventory,
    detect_anomalies,
    generate_business_intelligence,
    run_forecast,
    calculate_wape,
    calculate_mase,
)

class TestRevenueLensPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a synthetic 180-day sales dataset with products, quantities, and dates
        base_date = datetime(2025, 1, 1)
        records = []
        np.random.seed(42)
        products = ["Alpha Widget", "Beta Gadget", "Gamma Sensor"]
        for i in range(180):
            current_date = base_date + timedelta(days=i)
            # Add day-of-week seasonality (higher on weekends)
            dow_boost = 1.3 if current_date.weekday() >= 5 else 1.0
            for prod in products:
                base_qty = 10 if prod == "Alpha Widget" else (5 if prod == "Beta Gadget" else 20)
                qty = max(1, int(np.random.poisson(base_qty) * dow_boost))
                price = 25.0 if prod == "Alpha Widget" else (50.0 if prod == "Beta Gadget" else 10.0)
                records.append({
                    "Date": current_date.strftime("%Y-%m-%d"),
                    "Product": prod,
                    "Quantity": qty,
                    "Revenue": qty * price,
                    "Stock": 100 if prod == "Alpha Widget" else 30
                })
        
        # Inject duplicates and a few nulls to test data cleaning
        records.append(records[0]) # duplicate
        records.append({"Date": "2025-01-01", "Product": "Alpha Widget", "Quantity": None, "Revenue": None, "Stock": 100})
        
        cls.df = pd.DataFrame(records)
        cls.test_csv_path = "/tmp/test_revenuelens_data.csv"
        cls.df.to_csv(cls.test_csv_path, index=False)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_csv_path):
            os.remove(cls.test_csv_path)

    def test_01_read_file_and_column_detection(self):
        """Verify robust file reading and semantic column detection."""
        df_read = read_file(self.test_csv_path)
        self.assertIsNotNone(df_read)
        self.assertGreater(len(df_read), 0)

        date_col, rev_col, prod_col, units_col, stock_col, lead_time_col = detect_columns(df_read)
        self.assertEqual(date_col, "Date")
        self.assertEqual(rev_col, "Revenue")
        self.assertEqual(prod_col, "Product")
        self.assertEqual(units_col, "Quantity")
        self.assertEqual(stock_col, "Stock")

    def test_02_data_cleaning_and_validation(self):
        """Verify data cleaning, duplicate removal, date formatting, and data health audit."""
        df_read = read_file(self.test_csv_path)
        date_col, rev_col, prod_col, units_col, stock_col, _ = detect_columns(df_read)
        
        df_clean, audit = clean_and_validate_data(df_read, date_col, rev_col, units_col, stock_col)
        self.assertFalse(df_clean.empty, "Cleaned DataFrame should not be empty")
        self.assertGreaterEqual(audit.get("duplicates_removed", 0), 1)
        self.assertIsNotNone(audit.get("date_min"))
        self.assertIsNotNone(audit.get("date_max"))
        self.assertGreaterEqual(audit.get("clean_rows", 0), 100)

    def test_03_accuracy_metric_formulas(self):
        """Test accuracy metric functions (WAPE, MASE)."""
        actuals = np.array([100.0, 150.0, 120.0, 180.0, 200.0])
        preds = np.array([110.0, 140.0, 125.0, 175.0, 210.0])
        
        wape = calculate_wape(actuals, preds)
        self.assertGreater(wape, 0.0)
        self.assertLess(wape, 20.0, "WAPE for close predictions should be under 20%")
        
        mase = calculate_mase(actuals, preds, seasonality=1)
        self.assertGreater(mase, 0.0)
        self.assertLess(mase, 1.5, "MASE should be a reasonable relative error")

    def test_04_multi_model_chronological_backtesting(self):
        """Verify multi-model backtesting selects best model and generates valid scorecard."""
        df_read = read_file(self.test_csv_path)
        date_col, rev_col, _, _, _, _ = detect_columns(df_read)
        df_clean, _ = clean_and_validate_data(df_read, date_col, rev_col)
        
        df_clean["period"] = df_clean[date_col].dt.to_period("M")
        monthly_s = df_clean.groupby("period")[rev_col].sum().sort_index()
        periods_list = list(monthly_s.index)
        vals_list = [float(v) for v in monthly_s.values]

        best_model, scorecard, accuracy, residual_std, ridge_m, gbr_m = run_chronological_backtest(vals_list, periods_list)
        
        self.assertIsNotNone(best_model)
        self.assertGreaterEqual(accuracy, 40.0)
        self.assertLessEqual(accuracy, 100.0)
        self.assertGreaterEqual(len(scorecard), 4, "Scorecard should compare at least 4 models")
        
        # Verify winner flag
        winners = [item for item in scorecard if item.get("is_winner")]
        self.assertEqual(len(winners), 1, "Exactly one model should be marked as winner")
        self.assertEqual(winners[0]["model"], best_model)

        # Multi-month forecast projection
        forecast_3m, forecast_3m_lb = generate_future_forecast(vals_list, periods_list, steps=3, best_model_name=best_model, ridge_model=ridge_m, gbr_model=gbr_m)
        self.assertEqual(len(forecast_3m), 3)
        self.assertEqual(len(forecast_3m_lb), 3)
        for fv in forecast_3m:
            self.assertGreater(fv, 0, "Forecast values should be positive")

    def test_05_30day_daily_curve_with_confidence_intervals(self):
        """Verify 30-day projection has 80% and 95% confidence intervals."""
        df_read = read_file(self.test_csv_path)
        date_col, rev_col, _, _, _, _ = detect_columns(df_read)
        df_clean, _ = clean_and_validate_data(df_read, date_col, rev_col)
        
        daily_curve = generate_30day_daily_curve(
            next_month_total=50000,
            last_date=df_clean[date_col].max(),
            df=df_clean,
            date_col=date_col,
            rev_col=rev_col,
            residual_std=1500.0
        )
        self.assertEqual(len(daily_curve), 30)
        for pt in daily_curve:
            self.assertIn("date", pt)
            self.assertIn("value", pt)
            self.assertIn("lower_bound", pt)
            self.assertIn("upper_bound", pt)
            self.assertIn("lower_95", pt)
            self.assertIn("upper_95", pt)
            self.assertLessEqual(pt["lower_bound"], pt["value"])
            self.assertGreaterEqual(pt["upper_bound"], pt["value"])
            self.assertLessEqual(pt["lower_95"], pt["lower_bound"])
            self.assertGreaterEqual(pt["upper_95"], pt["upper_bound"])

    def test_06_product_inventory_optimization(self):
        """Verify safety stock, ROP, suggested order quantities, and risk classifications."""
        df_read = read_file(self.test_csv_path)
        date_col, rev_col, prod_col, units_col, stock_col, lead_time_col = detect_columns(df_read)
        df_clean, _ = clean_and_validate_data(df_read, date_col, rev_col, units_col, stock_col)
        
        products, summary = optimize_product_inventory(
            df_clean, date_col, rev_col, prod_col, units_col, stock_col, lead_time_col,
            next_month_total=50000,
            last6_labels=["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"],
            overall_accuracy=88.5,
            options={"lead_time_days": 14, "service_level": 0.95}
        )
        self.assertGreater(len(products), 0)
        self.assertIn("total_items", summary)
        self.assertIn("optimal_count", summary)
        self.assertIn("critical_count", summary)
        
        for p in products:
            self.assertIn(p["risk_level"], ["CRITICAL", "HIGH", "MEDIUM", "LOW", "WARNING"])
            self.assertIn(p["stock_status"], ["OUT_OF_STOCK", "CRITICAL", "REORDER_NOW", "OPTIMAL", "OVERSTOCK"])
            self.assertGreaterEqual(p["daily_demand"], 0.0)
            self.assertGreaterEqual(p["safety_stock"], 0.0)
            self.assertGreaterEqual(p["reorder_point"], 0.0)
            self.assertGreaterEqual(p["suggested_order_qty"], 0.0)
            self.assertIn(p["stock_source"], ["DATA_PROVIDED", "CONFIGURED_BASELINE"])

    def test_07_anomaly_detection_and_bi(self):
        """Verify anomaly detection and natural-language BI generation."""
        df_read = read_file(self.test_csv_path)
        date_col, rev_col, prod_col, units_col, stock_col, lead_time_col = detect_columns(df_read)
        df_clean, _ = clean_and_validate_data(df_read, date_col, rev_col, units_col, stock_col)
        
        anomalies = detect_anomalies(df_clean, date_col, rev_col)
        self.assertIsInstance(anomalies, list)
        
        products, _ = optimize_product_inventory(
            df_clean, date_col, rev_col, prod_col, units_col, stock_col, lead_time_col,
            next_month_total=50000,
            last6_labels=["2025-01", "2025-02"],
            overall_accuracy=88.0
        )
        
        bi = generate_business_intelligence(
            df_clean, date_col, rev_col, products,
            next_month_total=55000,
            last_actual_total=50000,
            anomalies=anomalies,
            scorecard=[]
        )
        self.assertIn("trajectory_status", bi)
        self.assertIn("mom_growth_pct", bi)
        self.assertIn("bullet_insights", bi)
        self.assertGreater(len(bi["bullet_insights"]), 0)

    def test_08_run_forecast_end_to_end(self):
        """Verify master run_forecast entrypoint produces complete contract payload."""
        result = run_forecast(
            self.test_csv_path,
            options={"lead_time_days": 14, "service_level": 0.95, "demand_shock_pct": 5.0}
        )
        self.assertIn("selected_model", result)
        self.assertIn("accuracy", result)
        self.assertIn("scorecard", result)
        self.assertIn("future_30days", result)
        self.assertIn("products", result)
        self.assertIn("inventory_summary", result)
        self.assertIn("anomalies", result)
        self.assertIn("business_intelligence", result)
        self.assertIn("metrics", result)
        self.assertEqual(len(result["future_30days"]), 30)

if __name__ == "__main__":
    unittest.main()
