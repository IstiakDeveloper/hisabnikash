"""Run/read the existing unsigned iOS workflow using Git's GitHub credential.

Credentials stay in memory. This helper never changes GitHub secrets or prints
tokens, and strips authorization before following artifact-storage redirects.
"""
import argparse
import io
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "IstiakDeveloper/hisabnikash"
API = f"https://api.github.com/repos/{REPOSITORY}"


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, new_url):
        if urllib.parse.urlsplit(new_url).scheme != "https":
            raise ValueError("Only HTTPS artifact redirects are supported")
        redirected = super().redirect_request(request, fp, code, msg, headers, new_url)
        if redirected and urllib.parse.urlsplit(new_url).hostname != "api.github.com":
            redirected.remove_header("Authorization")
        return redirected


def credential():
    result = subprocess.run(
        ["git", "-c", f"safe.directory={ROOT.as_posix()}", "credential", "fill"],
        input="protocol=https\nhost=github.com\nusername=IstiakDeveloper\n\n", text=True,
        env=dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="Never"),
        capture_output=True, timeout=25, cwd=ROOT, check=True,
    )
    fields = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    if not fields.get("password"):
        raise ValueError("No existing GitHub credential")
    return fields["password"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dispatch", "runs", "status", "download"])
    parser.add_argument("value", help="Branch for dispatch/runs; run ID for status/download")
    args = parser.parse_args()
    token = credential()
    opener = urllib.request.build_opener(SafeRedirect())

    def request(path, data=None, binary=False):
        body = None if data is None else json.dumps(data).encode()
        req = urllib.request.Request(API + path, data=body, headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json", "User-Agent": "HisabNikash-iOS-build",
            "Content-Type": "application/json",
        })
        with opener.open(req, timeout=60) as response:
            content = response.read(200 * 1024 * 1024)
        return content if binary else json.loads(content) if content else {}

    def summary(run):
        return {key: run.get(key) for key in ["id", "status", "conclusion", "html_url", "head_sha", "head_branch", "run_started_at", "updated_at"]}

    if args.command == "dispatch":
        request("/actions/workflows/ios-ipa.yml/dispatches", {"ref": args.value, "inputs": {"mode": "unsigned"}})
        print(json.dumps({"dispatched": True, "branch": args.value, "mode": "unsigned"}))
    elif args.command == "runs":
        query = urllib.parse.urlencode({"branch": args.value, "per_page": 5})
        print(json.dumps([summary(run) for run in request("/actions/workflows/ios-ipa.yml/runs?" + query)["workflow_runs"]]))
    elif args.command == "status":
        run_id = int(args.value)
        result = summary(request(f"/actions/runs/{run_id}"))
        jobs = request(f"/actions/runs/{run_id}/jobs")["jobs"]
        result["jobs"] = [{"name": j["name"], "status": j["status"], "conclusion": j["conclusion"],
                           "started_at": j["started_at"],
                           "steps": [{key: s.get(key) for key in ["name", "status", "conclusion", "started_at", "completed_at"]} for s in j.get("steps", [])]} for j in jobs]
        print(json.dumps(result))
    else:
        run_id = int(args.value)
        run = request(f"/actions/runs/{run_id}")
        if run["conclusion"] != "success":
            raise ValueError("Only download successful builds")
        artifacts = request(f"/actions/runs/{run_id}/artifacts")["artifacts"]
        artifact = next(a for a in artifacts if a["name"].startswith("HisabNikash-ios-unsigned-"))
        archive = request(f"/actions/artifacts/{artifact['id']}/zip", binary=True)
        target = ROOT / "mobile" / "artifacts" / "ios" / f"run-{run_id}"
        target.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
            for item in zipped.infolist():
                destination = (target / item.filename).resolve()
                if not destination.is_relative_to(target.resolve()) or (item.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError("Unsafe artifact path")
                if item.is_dir():
                    destination.mkdir(parents=True, exist_ok=True)
                else:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(zipped.read(item))
        print(json.dumps({"directory": str(target), "run": run["html_url"], "source": run["head_sha"],
                          "files": sorted(p.name for p in target.iterdir())}))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"GitHub request failed with HTTP {error.code}") from None
