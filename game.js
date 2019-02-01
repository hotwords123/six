
let game = (function() {

    var options = {
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

    var started = false, paused = false;

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
                            border: `hsl(${h}, ${s - 10}%, ${l - 10}%)`
                        }
                    }
                });
            }
        }
        return bricks;
    }

    function newGame() {

        started = true;
        paused = false;

        simulator.initWorld(options);

        for (let i = 0; i < 6; ++i) {
            var cy = util.randInt(3, 6);
            var bricks = makeBricks(options.cxBricks, cy);
            simulator.addBricks(bricks, cy);
        }

        simulator.start();
    }
    
    return {
        newGame,
        get options() { return options; },
        get started() { return started; },
        get paused() { return paused; }
    };

})();
