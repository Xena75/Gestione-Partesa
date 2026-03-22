# -*- coding: utf-8 -*-
"""Rende colonne GENERATED -> DEFAULT NULL nel dump per import MySQL 8 (stesso schema di viaggi_db)."""
from pathlib import Path

DUMP = Path(__file__).resolve().parent / "dump-gestionelogistica-202603221555.sql"
OUT = Path(__file__).resolve().parent / "dump-gestionelogistica-202603221555-mysql8.sql"

REPLACEMENTS = [
    (
        "  `ID_Consegna` varchar(100) GENERATED ALWAYS AS (concat(`Ordine`,'_',`Cod_Articolo`)) STORED,",
        "  `ID_Consegna` varchar(100) DEFAULT NULL,",
    ),
    (
        "  `mese` tinyint(4) GENERATED ALWAYS AS (month(`data_mov_merce`)) STORED,",
        "  `mese` tinyint(4) DEFAULT NULL,",
    ),
    (
        "  `settimana` tinyint(4) GENERATED ALWAYS AS (week(`data_mov_merce`,1)) STORED,",
        "  `settimana` tinyint(4) DEFAULT NULL,",
    ),
    (
        "  `ID_fatt` varchar(255) GENERATED ALWAYS AS (concat(ifnull(`div`,''),'-',ifnull(`classe_tariffa`,''),'-',ifnull(`classe_prod`,''))) STORED,",
        "  `ID_fatt` varchar(255) DEFAULT NULL,",
    ),
    (
        "  `anno` smallint(6) GENERATED ALWAYS AS (year(`data_mov_merce`)) STORED,",
        "  `anno` smallint(6) DEFAULT NULL,",
    ),
    (
        "  `mese` int(11) GENERATED ALWAYS AS (month(`data_viaggio`)) STORED,",
        "  `mese` int(11) DEFAULT NULL,",
    ),
    (
        "  `trimestre` int(11) GENERATED ALWAYS AS (quarter(`data_viaggio`)) STORED,",
        "  `trimestre` int(11) DEFAULT NULL,",
    ),
    (
        "  `settimana` int(11) GENERATED ALWAYS AS (week(`data_viaggio`,1)) STORED,",
        "  `settimana` int(11) DEFAULT NULL,",
    ),
    (
        "  `anno` smallint(6) GENERATED ALWAYS AS (year(`data_viaggio`)) STORED,",
        "  `anno` smallint(6) DEFAULT NULL,",
    ),
    (
        "  `travelId` varchar(191) GENERATED ALWAYS AS (concat('Viaggio - ',`Viaggio`)) STORED,",
        "  `travelId` varchar(191) DEFAULT NULL,",
    ),
]


def line_replacement(line: str) -> str:
    for old, new in REPLACEMENTS:
        if old in line:
            return new + ("\n" if not new.endswith("\n") else "")
    if "`compenso`" in line and "GENERATED ALWAYS" in line and "tariffa_terzista" in line:
        return "  `compenso` decimal(10,2) DEFAULT NULL,\n"
    if "`tot_compenso`" in line and "GENERATED ALWAYS" in line:
        return "  `tot_compenso` decimal(10,2) DEFAULT NULL,\n"
    if "`euro_rifornimento`" in line and "GENERATED ALWAYS" in line and "Litri Riforniti" in line:
        return "  `euro_rifornimento` decimal(10,2) DEFAULT NULL,\n"
    return line


def main() -> None:
    nchg = 0
    with DUMP.open("r", encoding="utf-8", errors="replace") as fin, OUT.open(
        "w", encoding="utf-8", newline="\n"
    ) as fout:
        for line in fin:
            new_line = line_replacement(line)
            if new_line != line:
                nchg += 1
            fout.write(new_line)
    print(f"Scritto {OUT} — righe modificate: {nchg}")


if __name__ == "__main__":
    main()
