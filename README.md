# Limit-Balken

Ein bunter Balken für Claude Code, direkt über dem Eingabefeld. Er zeigt in einer Zeile, wie viel vom 5-Stunden-Limit und vom Wochenlimit schon verbraucht ist, und wann es wieder frei wird.

```
5 Std ██████░░ 72% (frei 19:20)  ·  Woche ███░░░░░ 38% (frei Do 09:00)
```

Die Kästchen laufen von Grün über Gelb bis Rot. Die Prozentzahl wird ab 70 % gelb und ab 90 % rot. Die Werte kommen nach der ersten Antwort einer Sitzung und aktualisieren sich danach von selbst. Ohne Abo (zum Beispiel mit API-Schlüssel) gibt es keine Limits und der Balken zeigt nur einen Hinweis.

## Installieren

In einer Claude-Code-Sitzung im Terminal:

```
/plugin install limit-balken --marketplace nk24vers-lgtm/limit-balken
```

Aus einer Shell:

```bash
claude plugin install limit-balken --marketplace nk24vers-lgtm/limit-balken
```

In der Desktop-App, wo `/plugin` nicht läuft: neben dem Eingabefeld auf + klicken, dann Plugins, „Add marketplace“ mit `nk24vers-lgtm/limit-balken`, dann „Add plugin“.

Bei der Frage „Add marketplace?“ mit `y` antworten und den Bereich „user“ wählen. Dann ist der Balken in jeder neuen Sitzung von selbst da.
