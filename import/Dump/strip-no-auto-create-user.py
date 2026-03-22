# -*- coding: utf-8 -*-
"""Rimuove NO_AUTO_CREATE_USER dalle righe SET sql_mode (compatibile MySQL 8)."""
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE / "dump-gestionelogistica-202603221555-mysql8.sql"


def strip_sql_mode_line(line: str) -> tuple[str, bool]:
    if "NO_AUTO_CREATE_USER" not in line or "sql_mode" not in line.lower():
        return line, False
    s = line.replace(",NO_AUTO_CREATE_USER", "").replace("NO_AUTO_CREATE_USER,", "")
    s = s.replace("NO_AUTO_CREATE_USER", "")
    return s, s != line


def main() -> None:
    if not TARGET.exists():
        print("File non trovato:", TARGET)
        return
    tmp = TARGET.with_suffix(".sql.tmp")
    n = 0
    with TARGET.open("r", encoding="utf-8", errors="replace") as fin, tmp.open(
        "w", encoding="utf-8", newline="\n"
    ) as fout:
        for line in fin:
            new_line, chg = strip_sql_mode_line(line)
            if chg:
                n += 1
            fout.write(new_line)
    shutil.move(str(tmp), str(TARGET))
    print("Aggiornato", TARGET.name, "— righe toccate:", n)


if __name__ == "__main__":
    main()
