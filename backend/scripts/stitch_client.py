"""Stitch MCP Client for ANVITRACE UI Design & Screen Prototyping."""

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any

STITCH_MCP_URL = "https://stitch.googleapis.com/mcp"
DEFAULT_API_KEY = "REDACTED"


class StitchClient:
    """Client for invoking Google Stitch MCP tools."""

    def __init__(self, api_key: str = DEFAULT_API_KEY, base_url: str = STITCH_MCP_URL):
        self.api_key = api_key
        self.base_url = base_url
        self._req_id = 0

    def call_tool(self, tool_name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        """Invoke a tool over JSON-RPC."""
        self._req_id += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self._req_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {},
            },
        }
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.base_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if "error" in data:
                    raise RuntimeError(f"Stitch RPC error: {data['error']}")
                return data.get("result", {})
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"HTTP {e.code}: {err_body}") from e

    def list_projects(self) -> list[dict[str, Any]]:
        """List all Stitch projects."""
        res = self.call_tool("list_projects")
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            parsed = json.loads(content[0]["text"])
            return parsed.get("projects", [])
        return []

    def create_project(self, title: str) -> dict[str, Any]:
        """Create a new Stitch project."""
        res = self.call_tool("create_project", {"title": title})
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            return json.loads(content[0]["text"])
        return res

    def list_screens(self, project_id: str) -> list[dict[str, Any]]:
        """List screens in a project."""
        # Project id format: projects/{id} or {id}
        name = project_id if project_id.startswith("projects/") else f"projects/{project_id}"
        res = self.call_tool("list_screens", {"name": name})
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            parsed = json.loads(content[0]["text"])
            return parsed.get("screens", [])
        return []

    def get_screen(self, screen_name: str) -> dict[str, Any]:
        """Retrieve details of a screen."""
        res = self.call_tool("get_screen", {"name": screen_name})
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            return json.loads(content[0]["text"])
        return res

    def generate_screen_from_text(
        self,
        project_id: str,
        prompt: str,
        device_type: str = "DESKTOP",
    ) -> dict[str, Any]:
        """Generate a screen design from a text description."""
        name = project_id if project_id.startswith("projects/") else f"projects/{project_id}"
        args = {
            "name": name,
            "prompt": prompt,
            "deviceType": device_type,
        }
        res = self.call_tool("generate_screen_from_text", args)
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            return json.loads(content[0]["text"])
        return res


def main():
    parser = argparse.ArgumentParser(description="Stitch MCP CLI for ANVITRACE UI")
    parser.add_argument("action", choices=["list-projects", "create-project", "list-screens", "generate-screen"])
    parser.add_argument("--title", help="Project title")
    parser.add_argument("--project-id", help="Project ID or resource name")
    parser.add_argument("--prompt", help="Prompt for screen generation")
    parser.add_argument("--device", default="DESKTOP", choices=["DESKTOP", "MOBILE", "TABLET"])

    args = parser.parse_args()
    client = StitchClient()

    if args.action == "list-projects":
        projects = client.list_projects()
        print(f"Found {len(projects)} projects:")
        for p in projects:
            print(f"- {p.get('title')} ({p.get('name')})")

    elif args.action == "create-project":
        if not args.title:
            print("Error: --title is required")
            sys.exit(1)
        p = client.create_project(args.title)
        print(f"Created project: {p.get('name')} - {p.get('title')}")

    elif args.action == "list-screens":
        if not args.project_id:
            print("Error: --project-id is required")
            sys.exit(1)
        screens = client.list_screens(args.project_id)
        print(f"Found {len(screens)} screens in {args.project_id}:")
        for s in screens:
            print(f"- {s.get('title', 'Untitled')} ({s.get('name')})")

    elif args.action == "generate-screen":
        if not args.project_id or not args.prompt:
            print("Error: --project-id and --prompt are required")
            sys.exit(1)
        print(f"Generating screen in {args.project_id}...")
        res = client.generate_screen_from_text(args.project_id, args.prompt, device_type=args.device)
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
