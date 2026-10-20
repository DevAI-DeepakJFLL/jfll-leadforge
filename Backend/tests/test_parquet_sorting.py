
import duckdb

from scripts.sort_contacts_parquet import sort_parquet_dataset


def test_parquet_sorting_pipeline(tmp_path):
    input_file = tmp_path / "test_input.parquet"
    output_file = tmp_path / "test_sorted.parquet"
    
    con = duckdb.connect()
    con.execute(f"""
        COPY (
            SELECT 'org_b' as organization_id, 'p1' as person_id, true as is_decision_maker
            UNION ALL
            SELECT 'org_a' as organization_id, 'p2' as person_id, false as is_decision_maker
            UNION ALL
            SELECT 'org_a' as organization_id, 'p3' as person_id, true as is_decision_maker
        ) TO '{input_file}' (FORMAT PARQUET);
    """)
    
    sort_parquet_dataset(str(input_file), str(output_file), row_group_size=2)
    
    # Verify sorted order
    rows = con.execute(f"SELECT organization_id, person_id, is_decision_maker FROM '{output_file}'").fetchall()
    assert rows[0][0] == "org_a"
    assert rows[0][1] == "p3"  # is_decision_maker true comes first
    assert rows[0][2] is True
    assert rows[1][0] == "org_a"
    assert rows[1][1] == "p2"
    assert rows[1][2] is False
    assert rows[2][0] == "org_b"
    assert rows[2][1] == "p1"
    assert rows[2][2] is True


def test_parquet_sorting_compression_and_row_groups(tmp_path):
    input_file = tmp_path / "test_large_input.parquet"
    output_file = tmp_path / "test_large_sorted.parquet"

    con = duckdb.connect()
    con.execute(f"""
        COPY (
            SELECT 
                'org_' || (range % 5) as organization_id,
                'p_' || range as person_id,
                (range % 2 = 0) as is_decision_maker
            FROM range(6000)
        ) TO '{input_file}' (FORMAT PARQUET);
    """)

    sort_parquet_dataset(str(input_file), str(output_file), row_group_size=3000)

    # Verify compression is ZSTD across all columns/row groups
    metadata = con.execute(f"""
        SELECT DISTINCT compression 
        FROM parquet_metadata('{output_file}')
    """).fetchall()
    assert [m[0] for m in metadata] == ["ZSTD"]

    # Verify multiple row groups were created
    row_groups = con.execute(f"""
        SELECT DISTINCT row_group_id, row_group_num_rows 
        FROM parquet_metadata('{output_file}') 
        ORDER BY row_group_id
    """).fetchall()
    assert len(row_groups) >= 2
    total_rows = sum(rg[1] for rg in row_groups)
    assert total_rows == 6000
