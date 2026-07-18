from __future__ import annotations

import json
import sys
import threading
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Any

from .service import SlateService


class RpcServer:
    def __init__(self) -> None:
        self.service = SlateService()
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="slate-engine")
        self.pending: dict[str, Future[Any]] = {}
        self.write_lock = threading.Lock()

    def write(self, payload: dict[str, Any]) -> None:
        with self.write_lock:
            sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
            sys.stdout.flush()

    def dispatch(self, request_id: str, method: str, params: dict[str, Any]) -> Any:
        progress = lambda stage, percent, message: self.write(
            {
                "jsonrpc": "2.0",
                "method": "job.progress",
                "params": {
                    "requestId": request_id,
                    "stage": stage,
                    "percent": percent,
                    "message": message,
                },
            }
        )
        methods = {
            "project.create": lambda: self.service.create_project(params),
            "project.open": lambda: self.service.open_project(params),
            "project.setAnalysisPack": lambda: self.service.set_analysis_pack(params),
            "version.import": lambda: self.service.import_version(params, progress),
            "version.list": lambda: self.service.list_versions(params),
            "document.get": lambda: self.service.get_document(params),
            "document.getAssetPath": lambda: self.service.get_document_asset_path(params),
            "analysis.get": lambda: self.service.get_analysis(params),
            "comparison.create": lambda: self.service.create_comparison(params),
        }
        handler = methods.get(method)
        if handler is None:
            raise ValueError(f"Unknown method: {method}")
        return handler()

    def complete(self, request_id: str, future: Future[Any]) -> None:
        self.pending.pop(request_id, None)
        if future.cancelled():
            self.write(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32800, "message": "Request cancelled."},
                }
            )
            return
        try:
            result = future.result()
            self.write({"jsonrpc": "2.0", "id": request_id, "result": result})
        except Exception as error:
            self.write(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32000,
                        "message": str(error) or error.__class__.__name__,
                        "data": {"type": error.__class__.__name__},
                    },
                }
            )

    def handle(self, message: dict[str, Any]) -> None:
        if message.get("method") == "job.cancel":
            request_id = str((message.get("params") or {}).get("requestId", ""))
            future = self.pending.get(request_id)
            if future is not None:
                future.cancel()
            return
        request_id = str(message.get("id", ""))
        method = message.get("method")
        params = message.get("params", {})
        if not request_id or not isinstance(method, str) or not isinstance(params, dict):
            self.write(
                {
                    "jsonrpc": "2.0",
                    "id": request_id or None,
                    "error": {"code": -32600, "message": "Invalid JSON-RPC request."},
                }
            )
            return
        future = self.executor.submit(self.dispatch, request_id, method, params)
        self.pending[request_id] = future
        future.add_done_callback(lambda completed: self.complete(request_id, completed))

    def run(self) -> None:
        for line in sys.stdin:
            try:
                message = json.loads(line)
                if not isinstance(message, dict):
                    raise ValueError("Request must be a JSON object.")
                self.handle(message)
            except Exception as error:
                self.write(
                    {
                        "jsonrpc": "2.0",
                        "id": None,
                        "error": {"code": -32700, "message": str(error)},
                    }
                )
        self.executor.shutdown(wait=True, cancel_futures=True)


def main() -> None:
    RpcServer().run()


if __name__ == "__main__":
    main()
