"""Quick end-to-end smoke test. Run with: python tests/smoke.py"""

import os
import time

import httpx

BASE = os.environ.get("DAYFLOW_API_BASE", "http://127.0.0.1:8010")


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=15) as client:
        # Give a freshly started uvicorn process a moment to finish startup.
        for _ in range(30):
            try:
                health = client.get("/api/health")
                if health.status_code == 200:
                    break
            except httpx.HTTPError:
                pass
            time.sleep(0.5)
        else:
            raise AssertionError(f"DAYFLOW API did not become ready on {BASE}")
        assert health.status_code == 200, health.text
        print("health:", health.json())

        login = client.post("/api/auth/demo")
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        print("demo login: ok")

        # Traffic beacons are public; the aggregate dashboard is owner-only.
        traffic_view = client.post("/api/traffic/view", json={
            "path": "/", "visitor_id": f"smoke-visitor-{time.time_ns()}",
            "session_id": f"smoke-session-{time.time_ns()}", "device": "desktop", "referrer_host": "",
        })
        assert traffic_view.status_code == 202, traffic_view.text
        owner_denied = client.get("/api/owner/traffic", params={"days": 7})
        assert owner_denied.status_code == 403, owner_denied.text
        print("traffic beacon: accepted; owner dashboard: denied for demo")

        google_status = client.get("/api/google/status")
        assert google_status.status_code == 200, google_status.text
        print("google calendar:", "configured" if google_status.json()["configured"] else "not configured (read-only import hidden)")

        tasks = client.get("/api/tasks", params={"status": "today"}).json()
        print("today tasks:", len(tasks))
        temp_task_id = None
        if not tasks:
            created = client.post("/api/tasks", json={"title": "Smoke check task", "status": "today"})
            assert created.status_code < 300, created.text
            tasks = client.get("/api/tasks", params={"status": "today"}).json()
            assert tasks
            temp_task_id = tasks[-1]["id"]
            print("today tasks: created one temporary task for the check")

        assist = client.get("/api/tasks/assist", params={"title": "Write the report", "difficulty_reason": "quality"}).json()
        print("assist:", assist["first_action"])

        day = __import__("datetime").date.today().isoformat()
        proposal = client.post("/api/schedule/preview", json={
            "day": day,
            "energy": "medium",
            "available_start": "09:00",
            "available_end": "18:00",
        })
        assert proposal.status_code == 200, proposal.text
        plan = proposal.json()
        print("proposal:", len(plan["blocks"]), "blocks,", len(plan["unscheduled"]), "unscheduled")

        apply = client.post("/api/schedule/apply", json={
            "generation_id": plan["generation_id"],
            "day": day,
            "blocks": plan["blocks"],
            "apply_task_times": True,
        })
        assert apply.status_code == 200, apply.text
        applied = apply.json()
        print("applied blocks:", len(applied))
        saved_blocks = client.get("/api/schedule/blocks", params={"day": day}).json()
        assert len(saved_blocks) == len(plan["blocks"]), "applying a plan must replace the day's blocks, not duplicate them"

        priorities = client.get("/api/restart/choose-priority").json()
        print("priorities:", [item["title"] for item in priorities])

        rebuild = client.post("/api/restart/rebuild", json={"day": day, "available_start": "12:00", "available_end": "17:00"})
        assert rebuild.status_code == 200, rebuild.text
        print("rebuild blocks:", len(rebuild.json()["blocks"]))

        insights = client.get("/api/insights").json()
        print("insights source:", insights["model_status"]["source"])

        prediction = client.post("/api/insights/predict-duration", json={"title": "Write report", "category": "work"}).json()
        print("prediction:", prediction["minutes"], prediction["source"])

        training = client.post("/api/insights/train").json()
        print("model training:", "trained" if training.get("trained") else "rules retained", training.get("samples"), "sample(s)")

        export = client.get("/api/auth/export")
        assert export.status_code == 200, export.text[:500]
        print("export keys:", list(export.json()["data"].keys()))

        if temp_task_id:
            client.delete(f"/api/tasks/{temp_task_id}")

    print("ALL SMOKE CHECKS PASSED")


if __name__ == "__main__":
    main()
