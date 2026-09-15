#!/usr/bin/env python3
"""ZBS WIFIM API client — https://zbs.wifim.vn/docs/api

Commands:
  templates                                  List approved Zalo templates + required params
  send    --phone P --template ID [--data J] [--scheduled "HH:MM DD/MM"] [--mode 1]
  bulk    --group N --template ID [--data J] [--scheduled "HH:MM DD/MM"]

API key is read from $ZBS_API_KEY, else from the file in $ZBS_KEY_FILE
(default /root/.openclaw/secrets/zbs_api_key). Never pass the key on the CLI.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("ZBS_BASE_URL", "https://zbs.wifim.vn/api")
KEY_FILE = os.environ.get("ZBS_KEY_FILE", "/root/.openclaw/secrets/zbs_api_key")
RETRY_CODES = {429, 500, 502, 503, 504}


def api_key() -> str:
    key = os.environ.get("ZBS_API_KEY", "").strip()
    if key:
        return key
    try:
        with open(KEY_FILE, encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError as exc:
        sys.exit(f"error: no API key (env ZBS_API_KEY or {KEY_FILE}): {exc}")


def call(method: str, path: str, payload: dict | None = None, retries: int = 3):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(BASE + path, data=body, method=method)
        req.add_header("X-API-Key", api_key())
        if body is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except ValueError:
                parsed = {"raw": raw}
            if exc.code in RETRY_CODES and attempt < retries:
                time.sleep(2 * attempt)
                continue
            return exc.code, parsed
        except Exception as exc:  # noqa: BLE001 - network layer, surfaced to caller
            if attempt < retries:
                time.sleep(2 * attempt)
                continue
            return None, {"error": str(exc)}
    raise AssertionError("unreachable")


def load_data(raw: str | None) -> dict:
    if not raw:
        return {}
    if raw.strip().startswith("{"):
        return json.loads(raw)
    with open(raw, encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    ap = argparse.ArgumentParser(description="ZBS WIFIM client")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("templates")

    for name, extra in (("send", "single"), ("bulk", "group")):
        p = sub.add_parser(name)
        p.add_argument("--template", required=True)
        p.add_argument("--data", help="JSON string or path to a JSON file")
        p.add_argument("--scheduled", help='send time "HH:MM DD/MM"')
        if extra == "single":
            p.add_argument("--phone", required=True)
            p.add_argument("--mode", default="1")
        else:
            p.add_argument("--group", required=True, type=int)

    args = ap.parse_args()

    if args.cmd == "templates":
        status, resp = call("GET", "/v1/templates")
        if status == 200:
            rows = resp.get("data", [])
            print(f"{len(rows)} templates")
            for row in rows:
                params = ", ".join(p[0] for p in row.get("params", []))
                print(f"- {row['template_id']} | {row['label']} | {params}")
        else:
            print(f"HTTP {status}: {json.dumps(resp, ensure_ascii=False)}")
        return 0 if status == 200 else 1

    payload = {"template_id": args.template, "template_data": load_data(args.data)}
    if args.scheduled:
        payload["scheduled_time"] = args.scheduled
    path = "/v1/send"
    if args.cmd == "send":
        payload["phone"] = args.phone
        payload["sending_mode"] = args.mode
    else:
        payload["group_id"] = args.group
        path = "/v1/send-bulk"

    status, resp = call("POST", path, payload)
    print(f"HTTP {status}: {json.dumps(resp, ensure_ascii=False)}")
    return 0 if status == 200 and resp.get("success") else 1


if __name__ == "__main__":
    raise SystemExit(main())
