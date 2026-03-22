# -*- coding: utf-8 -*-
"""
MariaDB accetta spesso DEFAULT uuid() senza parentesi.
MySQL 8 richiede espressione tra parentesi: DEFAULT (UUID()).
"""
import shutil
from pathlib import Path

TARGET = Path(__file__).resolve().parent / "dump-gestionelogistica-202603221555-mysql8.sql"


def main() -> None:
    tmp = TARGET.with_suffix(".sql.tmp")
    n = 0
    with TARGET.open("r", encoding="utf-8", errors="replace") as fin, tmp.open(
        "w", encoding="utf-8", newline="\n"
    ) as fout:
        for line in fin:
            if "DEFAULT uuid()" in line:
                line = line.replace("DEFAULT uuid()", "DEFAULT (UUID())")
                n += 1
            fout.write(line)
    shutil.move(str(tmp), str(TARGET))
    print("Righe modificate:", n)


if __name__ == "__main__":
    main()
