
let game = (function() {

    const
        b2Math = Box2D.Common.Math.b2Math,
        b2Vec2 = Box2D.Common.Math.b2Vec2;

    const defaultOptions = {
        six: {
            sides: 6,
            radius: 2.4
        },
        brick: {
            size: 2
        },
        flat: {
            width: 12.5,
            height: 1
        },
        cxBricks: 5
    };

    const defaultAttr = {
        endless: false,
        cntBrickPiles: null
    };

    const gameModes = {
        'level': {
            attr: {
                endless: false,
                cntBrickPiles: 6
            }
        },
        'endless': {
            attr: {
                endless: true
            }
        }
    };

    const storageKey = {
        bestScore: 'six_bestScore'
    };

    var state = 'none';
    var score, bestScore = getBestScoreFromStorage();
    var mode, modeParams, attr, options;

    var lastClickTime, comboScore;

    function getBestScoreFromStorage() {
        var x = localStorage.getItem(storageKey.bestScore);
        if (!x) return 0;
        x = +x;
        if (x < 0 || !Number.isInteger(x)) return 0;
        return x;
    }

    function makeBricks(cx, cy) {

        var fa = util.makeArray([cx, cy], null);
        var size = util.makeArray([cx, cy], 1);
        function find(x, y) {
            if (fa[x][y]) {
                var { x: x2, y: y2 } = fa[x][y];
                return fa[x][y] = find(x2, y2);
            } else {
                return { x, y };
            }
        }
        function connect(x1, y1, x2, y2) {
            var anc1 = find(x1, y1);
            var anc2 = find(x2, y2);
            if (anc1.x === anc2.x && anc1.y === anc2.y) return false;
            var size2 = size[anc1.x][anc1.y] + size[anc2.x][anc2.y];
            if (size2 > 5) return false;
            fa[anc1.x][anc1.y] = anc2;
            size[anc2.x][anc2.y] = size2;
            return true;
        }

        var count = cx * cy;
        var dest = util.randInt(count * 0.25, count * 0.45);
        for (let tryCount = 0; count > dest && tryCount < 5000; ++tryCount) {
            if (Math.random() < 0.5) { // vertical
                var x = util.randInt(cx - 1);
                var y = util.randInt(cy);
                if (connect(x, y, x + 1, y)) {
                    --count;
                }
            } else { // horizonal
                var x = util.randInt(cx);
                var y = util.randInt(cy - 1);
                if (connect(x, y, x, y + 1)) {
                    --count;
                }
            }
        }

        const dir = [
            ['top',     0, -1],
            ['right',   1,  0],
            ['bottom',  0,  1],
            ['left',   -1,  0]
        ];
        var bricks = [];
        var vis = util.makeArray([cx, cy], false);
        var hue0 = util.randInt(12) * 30;
        for (let i = 0; i < cx; ++i) {
            for (let j = 0; j < cy; ++j) {
                if (fa[i][j]) continue;
                var queue = [];
                var head = 0, tail = 0;
                queue[tail++] = { x: i, y: j };
                vis[i][j] = true;
                while (head < tail) {
                    var node = queue[head++];
                    var { x: x0, y: y0 } = node;
                    node.border = [];
                    dir.forEach(([ d, dx, dy ]) => {
                        var x1 = x0 + dx;
                        var y1 = y0 + dy;
                        var flag;
                        if (x1 < 0 || y1 < 0 || x1 >= cx || y1 >= cy) {
                            flag = true;
                        } else {
                            var anc1 = find(x1, y1);
                            flag = anc1.x !== i || anc1.y !== j;
                        }
                        if (flag) {
                            node.border.push(d);
                        } else if (!vis[x1][y1]) {
                            queue[tail++] = { x: x1, y: y1 };
                            vis[x1][y1] = true;
                        }
                    });
                    node.corner = [];
                    dir.forEach(([ d1, dx1, dy1 ], index) => {
                        var [d2, dx2, dy2] = dir[(index + 1) % 4];
                        if (node.border.includes(d1) || node.border.includes(d2)) return;
                        var x1 = x0 + dx1 + dx2;
                        var y1 = y0 + dy1 + dy2;
                        var anc1 = find(x1, y1);
                        if (anc1.x !== i || anc1.y !== j) {
                            node.corner.push([d1, d2]);
                        }
                    });
                }
                var h = hue0 + util.randInt(60) - 30;
                var s = util.randInt(85, 95);
                var l = util.randInt(55, 60);
                queue.forEach((node) => {
                    node.x -= i;
                    node.y -= j;
                });
                bricks.push({
                    x: i, y: j,
                    sub: queue,
                    data: {
                        color: {
                            background: `hsl(${h}, ${s}%, ${l}%)`,
                            border: `hsl(${h}, ${s - 15}%, ${l - 10}%)`,
                            score: `hsl(${h}, ${s - 15}%, ${l - 40}%)`
                        }
                    }
                });
            }
        }
        return bricks;
    }

    function addNewBricks(cy) {
        var bricks = makeBricks(options.cxBricks, cy);
        simulator.addBricks(bricks, cy);
    }

    function newGame(gameMode = 'endless') {

        if (!Array.isArray(gameMode)) {
            gameMode = [gameMode];
        }

        state = 'playing';
        mode = gameMode.slice(0);
        modeParams = mode.map((m) => gameModes[m] || {});
        attr = Object.assign({}, defaultAttr,
            ...modeParams.map((param) => param.attr || {}));
        options = Object.assign({}, defaultOptions,
            ...modeParams.map((param) => param.options || {}));
        
        score = 0;
        lastClickTime = 0;

        renderer.loadOptions(options);
        renderer.setTitle(null);

        simulator.initWorld(options);

        if (attr.endless) {
            addNewBricks(12);
        } else {
            for (let i = 0; i < attr.cntBrickPiles; ++i) {
                addNewBricks(12);
            }
        }

        simulator.start();
    }

    function requireBricks(cyMin) {
        var pileHeight = 12;
        var cntPiles = Math.ceil(cyMin / pileHeight);
        while (cntPiles--) {
            addNewBricks(pileHeight);
        }
    }

    function click(x, y) {
        if (state !== 'playing') return;
        var pos = renderer.toWorldPos(x, y);
        simulator.removeBrickAt(pos, (brick) => {
            var bodyData = brick.GetUserData();

            var timePassed = Date.now() - lastClickTime;
            var scoreAdd;
            if (timePassed <= 750) {
                if (timePassed <= 400) {
                    comboScore += 1;
                    scoreAdd = comboScore + 1;
                } else {
                    scoreAdd = comboScore;
                }
            } else {
                comboScore = 5;
                scoreAdd = comboScore;
            }
            if (scoreAdd > 20) scoreAdd = 20;
            score += scoreAdd;
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem(storageKey.bestScore, bestScore);
            }
            renderer.scoreAdditionAt(scoreAdd, pos, bodyData.color.score);

            var xf = brick.GetTransform();
            var vBrick = brick.GetLinearVelocity();
            var bgColor = bodyData.color.background;
            var bSize = options.brick.size;
            var hSize = bSize / 2;
            var center = brick.GetWorldCenter();
            for (let fix = brick.GetFixtureList(); fix; fix = fix.GetNext()) {
                var fixData = fix.GetUserData();
                var centerX = fixData.x * bSize;
                var centerY = fixData.y * bSize;
                var cnt = util.randInt(8, 16);
                while (cnt--) {
                    var localX = centerX + Math.random() * bSize - hSize;
                    var localY = centerY + Math.random() * bSize - hSize;
                    var { x, y } = b2Math.MulX(xf, new b2Vec2(localX, localY));
                    var v = util.randInt(5, 10) / 10;
                    renderer.addParticle({
                        pos: { x, y },
                        velocity: {
                            x: vBrick.x + v * (x - center.x + bSize * util.randInt(-5, 5) / 10),
                            y: vBrick.y + v * (y - center.y + bSize * util.randInt(-5, 5) / 10)
                        },
                        angle: Math.random() * (2 * Math.PI),
                        size: util.randInt(25, 45) / 100 * hSize,
                        color: bgColor
                    });
                }
            }

            lastClickTime = Date.now();
        });
    }

    function animateNewGame() {
        UI.$container.css('opacity', 1)
        .animate({ opacity: 0 }, 1000, () => {
            newGame();
            UI.$container.animate({ opacity: 1 }, 1000);
        });
    }

    function gameWin() {
        
        if (state !== 'playing') return;
        state = 'ended';

        renderer.setTitle('Good Job!', 500);

        setTimeout(animateNewGame, 4000);
    }

    function gameOver() {

        if (state !== 'playing') return;
        state = 'ended';

        renderer.setTitle('Game Over', 500);

        setTimeout(animateNewGame, 4000);
    }
    
    return {
        newGame, gameWin, gameOver,
        requireBricks, click,
        get state() { return state; },
        get mode() { return mode; },
        get attr() { return attr; },
        get options() { return options; },
        get score() { return score; },
        get bestScore() { return bestScore; }
    };

})();
