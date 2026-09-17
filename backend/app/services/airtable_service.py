import requests
from typing import Any, Dict, List, Optional
from app.core.config import settings

class AirtableService:
    def __init__(self):
        self.api_key = settings.AIRTABLE_API_KEY
        self.base_id = settings.AIRTABLE_BASE_ID
        self.base_url = f"https://api.airtable.com/v0/{self.base_id}"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def _get_url(self, table_name: str) -> str:
        return f"{self.base_url}/{requests.utils.quote(table_name)}"

    def list_records(self, table_name: str, filter_formula: Optional[str] = None, max_records: Optional[int] = None) -> List[Dict[str, Any]]:
        url = self._get_url(table_name)
        params = {}
        if filter_formula:
            params["filterByFormula"] = filter_formula
        if max_records:
            params["maxRecords"] = max_records

        all_records = []
        while True:
            res = requests.get(url, headers=self.headers, params=params, timeout=15)
            if res.status_code != 200:
                print(f"[Airtable Error] list_records {table_name}: {res.text}")
                break
            data = res.json()
            all_records.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset or (max_records and len(all_records) >= max_records):
                break
            params["offset"] = offset

        return all_records

    def get_record(self, table_name: str, record_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self._get_url(table_name)}/{record_id}"
        res = requests.get(url, headers=self.headers, timeout=10)
        if res.status_code == 200:
            return res.json()
        return None

    def create_record(self, table_name: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = self._get_url(table_name)
        try:
            res = requests.post(url, headers=self.headers, json={"fields": fields}, timeout=15)
            if res.status_code in (200, 201):
                return res.json()
            err_msg = res.text.encode('ascii', errors='replace').decode('ascii')
            print(f"[Airtable Error] create_record {table_name}: {err_msg}")
            return None
        except Exception as e:
            print(f"[Airtable Exception] create_record {table_name}: {e}")
            return None

    def create_records(self, table_name: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        url = self._get_url(table_name)
        created = []
        # Airtable max 10 records per batch
        for i in range(0, len(records), 10):
            batch = records[i:i+10]
            payload = {"records": [{"fields": r} for r in batch]}
            try:
                res = requests.post(url, headers=self.headers, json=payload, timeout=15)
                if res.status_code in (200, 201):
                    created.extend(res.json().get("records", []))
                else:
                    err_msg = res.text.encode('ascii', errors='replace').decode('ascii')
                    print(f"[Airtable Error] create_records batch {table_name}: {err_msg}")
            except Exception as e:
                print(f"[Airtable Exception] create_records batch {table_name}: {e}")
        return created

    def update_record(self, table_name: str, record_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = f"{self._get_url(table_name)}/{record_id}"
        res = requests.patch(url, headers=self.headers, json={"fields": fields}, timeout=15)
        if res.status_code == 200:
            return res.json()
        print(f"[Airtable Error] update_record {table_name}: {res.text}")
        return None

    # Helper queries
    def find_customer_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        p = phone.strip()
        formula = f"{{So dien thoai}} = '{p}'"
        records = self.list_records("Khach hang", filter_formula=formula, max_records=1)
        return records[0] if records else None

    def find_customer_by_mst(self, mst: str) -> Optional[Dict[str, Any]]:
        m = mst.strip().replace(" ", "").replace("-", "")
        formula = f"{{Ma so thue MST}} = '{m}'"
        records = self.list_records("Khach hang", filter_formula=formula, max_records=1)
        return records[0] if records else None

    def list_products(self) -> List[Dict[str, Any]]:
        return self.list_records("San pham & Bang gia")

    def list_staff(self) -> List[Dict[str, Any]]:
        return self.list_records("Nhan vien")

airtable_client = AirtableService()
