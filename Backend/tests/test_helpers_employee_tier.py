from src.api.helpers import build_employee_tier_sql


def test_build_employee_tier_sql_single_and_range():
    clause, params = build_employee_tier_sql(["1-10", "11-50"])
    assert clause is not None
    assert "employee_count >= ? AND employee_count <= ?" in clause
    assert params == [1, 10, 11, 50]


def test_build_employee_tier_sql_upper_bound():
    clause, params = build_employee_tier_sql(["10001+"])
    assert clause is not None
    assert "employee_count >= ?" in clause
    assert params == [10001]


def test_build_employee_tier_sql_empty():
    clause, params = build_employee_tier_sql([])
    assert clause is None
    assert params == []


def test_build_employee_tier_sql_none():
    clause, params = build_employee_tier_sql(None)
    assert clause is None
    assert params == []


def test_build_employee_tier_sql_custom_column():
    clause, params = build_employee_tier_sql(["1-10"], column="org.headcount")
    assert clause is not None
    assert clause == "((org.headcount >= ? AND org.headcount <= ?))"
    assert params == [1, 10]


def test_build_employee_tier_sql_unknown_and_whitespace():
    clause, params = build_employee_tier_sql(["  1-10  ", "unknown-tier", ""])
    assert clause is not None
    assert clause == "((employee_count >= ? AND employee_count <= ?))"
    assert params == [1, 10]
