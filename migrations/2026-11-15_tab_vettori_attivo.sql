-- tab_vettori: flag attivo / non attivo (Extra mostra solo attivi)
ALTER TABLE tab_vettori
  ADD COLUMN Attivo TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '1=attivo, 0=non attivo'
  AFTER Id_Tariffa;
