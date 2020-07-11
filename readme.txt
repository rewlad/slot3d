
### Payout resolution details:
"Any combination of CHERRY and 7" -- there's line with 3 symbols, each of them is in set {CHERRY,7};
"Combination of any BAR symbols" -- there's line with 3 symbols, each of them is in set {BAR,2xBAR,3xBAR};
Balance after payout can be > 5000;
If there are multiple matching lines, rule with larger payout is applied;

### Package:
All assets are embedded into `out/main.js`, so app needs only 2 files to run.
React and three.js libs and rollup packager were used.
App was tested under chromium 81.

### Some implementation details:
App consists of 3 main parts:
- 3D reel view, that receives reel and win-line positions every frame;
- React view for other parts;
- Logic -- Redux-like state machine, rotation calculation and pay-table indexer;
Settings for parts are mostly grouped together and can be changed with some flexibility.
React and logic parts mostly operates immutable data as recommended by library authors.
There are 3 states to walk through during the game: ready, rolling and payout:
    (ready) --[spin]--> (rolling) --[finished]--> (payout) --[take]--> (ready)
Rotation can be measured in ticks, so that 1 tick is half-picture.
There's pay-table indexing on app start, where key is possible rolling result and value is rule/line.
Debug area is not visible until switching to the fixed rolling mode.
Rolling result is determined instantly on spin, and state changes only on spin and on rolling finished.
During rolling period rotation is calculated as a non-linear function of time.
UI tries to ajuct to screen size, but was not tuned for a smartphone.

### Commands that may be useful during build process:
docker-compose up -d
docker exec -itu node slot_main_1 sh -c 'cd /app && npm install'
docker exec -itu node slot_main_1 sh -c 'cd /app && ./node_modules/.bin/rollup -c'
convert 3xBAR.png BAR.png 2xBAR.png 7.png Cherry.png -gravity center -append ../out.png
convert -rotate 90 out.png out0.png
convert out0.png -background white -alpha remove -alpha off out1.png
zip sk-slot.zip index.html out/main.js
zip sk-slot.zip Reel/*.png out/main.js docker-compose.yml index.html main.js package.json rollup.config.js out1.png readme.txt rollup.config.js
