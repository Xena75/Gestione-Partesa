# -*- coding: utf-8 -*-
"""
Trigger con nome tabella in PascalCase mentre CREATE TABLE usa snake_case minuscolo:
su MySQL Linux (DigitalOcean) i nomi sono case-sensitive → ERROR 1146.

Sostituisce nelle righe trigger: ON TabellaErrata → ON `tabella_corretta`
"""
import shutil
from pathlib import Path

TARGET = Path(__file__).resolve().parent / "dump-gestionelogistica-202603221555-mysql8.sql"

# (pattern senza backtick dopo ON, nome reale nel dump)
FIXES = [
    ("ON Tab_Classe_Zona", "ON `tab_classe_zona`"),
    ("ON Tab_Tariffe", "ON `tab_tariffe`"),
]


def main() -> None:
    tmp = TARGET.with_suffix(".sql.tmp")
    n = 0
    with TARGET.open("r", encoding="utf-8", errors="replace") as fin, tmp.open(
        "w", encoding="utf-8", newline="\n"
    ) as fout:
        for line in fin:
            orig = line
            for wrong, right in FIXES:
                line = line.replace(wrong, right)
            if line != orig:
                n += 1
            fout.write(line)
    shutil.move(str(tmp), str(TARGET))
    print("Righe modificate:", n)


if __name__ == "__main__":
    main()
