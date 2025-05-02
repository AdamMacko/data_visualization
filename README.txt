# Indoor Trajectory Visualizer

Aplikácia na vizualizáciu trajektórií pohybu v interiéroch, určená pre výskum a analýzu lokalizačných dát. Umožňuje zobrazovať a porovnávať viaceré trasy nad pôdorysom budovy.

## Spustenie

1. Uisti sa, že máš nainštalovaný [Node.js](https://nodejs.org/).
2. Otvor terminál v priečinku s projektom.
3. Spusti jednoduchý webserver napríklad pomocou:

```
npx serve
```

4. Otvor aplikáciu v prehliadači na `http://localhost:3000`

## Funkcie

- Nahrávanie pôdorysu (PNG, JPG)
- Nahrávanie trás (JSON, TXT)
- Automatické škálovanie bodov podľa pôdorysu
- Viacposchodová vizualizácia
- Porovnanie 1–4 trás súčasne
- Animácia pohybu po trase
- Zmena tvaru, veľkosti a farby bodov
- Export a import projektov (JSON)
- Zobrazenie akcelerometrových grafov

## Formát JSON trasy

```json
{
  "x_positions": [123, 456, 789],
  "y_positions": [321, 654, 987],
  "floor": [0, 0, 0]
}
```

- `x_positions`, `y_positions` – zoznam pozícií bodov
- `floor` – voliteľné, ak chýba, použije sa aktuálne aktívne poschodie

## Štruktúra projektu

- `index.html` – vstupný súbor aplikácie
- `styles.css` – štýly a rozloženie
- `main.js` – logika aplikácie
- `storage.js`, `config.js` – dátový stav
- `eventListeners.js` – ovládanie UI
- `animation.js` – prehrávanie trás

## Dôležité poznámky

