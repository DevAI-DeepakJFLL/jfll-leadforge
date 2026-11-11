import asyncio
from unittest.mock import patch
from fastapi.testclient import TestClient
from starlette.background import BackgroundTasks

from src.api.approach_routes import _build_empty_store, save_approach_data
from src.api.auth import create_token
from src.api.main import app


def test_save_approach_data_uses_background_tasks():
    data = _build_empty_store()
    bg = BackgroundTasks()

    with patch("src.api.approach_routes._backup_to_s3") as mock_backup:
        save_approach_data(data, background_tasks=bg, force_s3=True)
        # S3 backup should NOT have been called synchronously
        mock_backup.assert_not_called()
        assert len(bg.tasks) == 1

        # Execute the background task
        for task in bg.tasks:
            res = task()
            if asyncio.iscoroutine(res):
                asyncio.run(res)
        mock_backup.assert_called_once()


def test_save_approach_data_synchronous_when_no_background_tasks():
    data = _build_empty_store()

    with patch("src.api.approach_routes._backup_to_s3") as mock_backup:
        save_approach_data(data, background_tasks=None, force_s3=True)
        # S3 backup should have been called synchronously
        mock_backup.assert_called_once()


def test_approach_log_route_offloads_s3_to_background(tmp_path, monkeypatch):
    test_store = tmp_path / "test_approach_logs.json"
    monkeypatch.setenv("APPROACH_LOGS_PATH", str(test_store))
    # Pre-create store so load_approach_data doesn't trigger initial file creation backup
    save_approach_data(_build_empty_store())

    monkeypatch.setenv("ENABLE_S3_APPROACH_BACKUP", "1")

    token, _ = create_token({"sub": "deepak@jfll.com", "name": "Deepak Naidu", "role": "Tech Lead"})
    headers = {"Authorization": f"Bearer {token}"}

    client = TestClient(app)
    with patch("src.api.approach_routes._backup_to_s3") as mock_backup:
        res = client.post(
            "/api/v1/approach-logs/jfll_customer/cust_bg_1",
            json={"action": "Called customer", "status": "Contacted"},
            headers=headers,
        )
        assert res.status_code == 200
        # TestClient automatically executes BackgroundTasks after response is produced
        mock_backup.assert_called_once()


def test_convert_to_active_route_offloads_s3_to_background(tmp_path, monkeypatch):
    test_store = tmp_path / "test_approach_logs.json"
    monkeypatch.setenv("APPROACH_LOGS_PATH", str(test_store))
    save_approach_data(_build_empty_store())

    monkeypatch.setenv("ENABLE_S3_APPROACH_BACKUP", "1")

    token, _ = create_token({"sub": "deepak@jfll.com", "name": "Deepak Naidu", "role": "Commercial Lead"})
    headers = {"Authorization": f"Bearer {token}"}

    client = TestClient(app)
    with patch("src.api.approach_routes._backup_to_s3") as mock_backup:
        res = client.post(
            "/api/v1/approach-logs/jfll_customer/cust_bg_2/convert-to-active",
            json={"start_date": "2026-11-15", "note": "Signed contract"},
            headers=headers,
        )
        assert res.status_code == 200
        mock_backup.assert_called_once()


def test_canonical_alias_approaches_log_route_offloads_s3_to_background(tmp_path, monkeypatch):
    test_store = tmp_path / "test_approach_logs.json"
    monkeypatch.setenv("APPROACH_LOGS_PATH", str(test_store))
    save_approach_data(_build_empty_store())

    monkeypatch.setenv("ENABLE_S3_APPROACH_BACKUP", "1")

    token, _ = create_token({"sub": "deepak@jfll.com", "name": "Deepak Naidu", "role": "Tech Lead"})
    headers = {"Authorization": f"Bearer {token}"}

    client = TestClient(app)
    with patch("src.api.approach_routes._backup_to_s3") as mock_backup:
        res = client.post(
            "/api/v1/approaches/log",
            json={"entity_type": "jfll_customer", "entity_id": "cust_bg_3", "action": "Called customer", "status": "Contacted"},
            headers=headers,
        )
        assert res.status_code == 200
        mock_backup.assert_called_once()

