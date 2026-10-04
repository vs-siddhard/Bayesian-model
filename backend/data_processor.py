"""
Data Processing Module for Bayesian Medical Analysis
Handles dataset loading, inspection, cleaning, discretization, and train/test splitting.
"""

import io
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

try:
    from sklearn.model_selection import train_test_split
except ImportError:
    def train_test_split(df, test_size=0.2, random_state=42, stratify=None):
        shuffled = df.sample(frac=1.0, random_state=random_state)
        n_test = int(len(df) * test_size)
        return shuffled.iloc[n_test:].copy(), shuffled.iloc[:n_test].copy()


class MedicalDataProcessor:
    def __init__(self):
        self.df_raw: Optional[pd.DataFrame] = None
        self.df_processed: Optional[pd.DataFrame] = None
        self.target_column: Optional[str] = None
        self.selected_features: List[str] = []
        self.discretization_bins: Dict[str, Any] = {}
        self.train_df: Optional[pd.DataFrame] = None
        self.test_df: Optional[pd.DataFrame] = None

    def load_csv_from_string_or_buffer(self, content: str) -> pd.DataFrame:
        """Loads CSV content from string buffer."""
        self.df_raw = pd.read_csv(io.StringIO(content))
        return self.df_raw

    def load_csv_file(self, file_path: str) -> pd.DataFrame:
        """Loads CSV directly from file path."""
        self.df_raw = pd.read_csv(file_path)
        return self.df_raw

    def get_dataset_summary(self) -> Dict[str, Any]:
        """Returns comprehensive summary of current dataset."""
        if self.df_raw is None:
            raise ValueError("No dataset loaded.")

        df = self.df_raw
        total_rows, total_cols = df.shape
        missing_counts = df.isnull().sum().to_dict()
        data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = [c for c in df.columns if c not in numeric_cols]

        column_details = []
        for col in df.columns:
            unique_vals = df[col].dropna().unique()
            is_num = col in numeric_cols
            detail = {
                "name": col,
                "type": "numeric" if is_num else "categorical",
                "dtype": data_types[col],
                "missingCount": int(missing_counts.get(col, 0)),
                "uniqueCount": int(len(unique_vals)),
                "sampleValues": [str(v) for v in unique_vals[:5]],
            }
            if is_num:
                detail["min"] = float(df[col].min()) if not df[col].empty else 0.0
                detail["max"] = float(df[col].max()) if not df[col].empty else 0.0
                detail["mean"] = float(df[col].mean()) if not df[col].empty else 0.0
                detail["std"] = float(df[col].std()) if not df[col].empty else 0.0
            column_details.append(detail)

        # First 10 rows for preview
        preview_rows = df.head(10).replace({np.nan: None}).to_dict(orient="records")

        return {
            "totalRows": int(total_rows),
            "totalColumns": int(total_cols),
            "numericColumns": numeric_cols,
            "categoricalColumns": categorical_cols,
            "columns": column_details,
            "preview": preview_rows,
            "missingSummary": {k: int(v) for k, v in missing_counts.items() if v > 0},
        }

    def preprocess_for_bayesian(
        self,
        target_column: str,
        feature_columns: List[str],
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Prepares discrete dataset for Bayesian Network training.
        Discretizes continuous numerical variables and splits into train/test sets.
        """
        if self.df_raw is None:
            raise ValueError("No dataset loaded.")

        cols_to_keep = [c for c in feature_columns if c in self.df_raw.columns]
        if target_column not in self.df_raw.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset.")

        if target_column not in cols_to_keep:
            cols_to_keep.append(target_column)

        df = self.df_raw[cols_to_keep].copy()

        # Handle missing values: mode for categorical, median for numeric
        for col in df.columns:
            if df[col].isnull().any():
                if np.issubdtype(df[col].dtype, np.number):
                    median_val = df[col].median()
                    df[col] = df[col].fillna(median_val)
                else:
                    mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else "Unknown"
                    df[col] = df[col].fillna(mode_val)

        # Discretize numeric columns
        for col in df.columns:
            if np.issubdtype(df[col].dtype, np.number):
                unique_cnt = df[col].nunique()
                if unique_cnt > 5:
                    # Discretize using 3 clinically interpretable quantile / range bins
                    try:
                        labels = ["Low", "Normal", "High"]
                        # qcut with duplicates='drop'
                        df[col] = pd.qcut(df[col], q=3, labels=labels, duplicates="drop").astype(str)
                    except Exception:
                        df[col] = pd.cut(df[col], bins=3, labels=["Low", "Medium", "High"]).astype(str)
                else:
                    df[col] = df[col].astype(str)
            else:
                df[col] = df[col].astype(str)

        self.df_processed = df
        self.target_column = target_column
        self.selected_features = [c for c in feature_columns if c != target_column]

        # Train/test split with reproducible seed
        train_df, test_df = train_test_split(
            df,
            test_size=test_size,
            random_state=random_state,
            stratify=df[target_column] if df[target_column].nunique() > 1 else None,
        )

        self.train_df = train_df.reset_index(drop=True)
        self.test_df = test_df.reset_index(drop=True)

        return self.train_df, self.test_df
