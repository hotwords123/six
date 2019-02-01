
let renderer = (function() {

    const
        b2Math = Box2D.Common.Math.b2Math,
        b2Vec2 = Box2D.Common.Math.b2Vec2;

    var canvas = null;
    var ctx = null;

    const sxBricks = 9;
    const syBricks = 16;
    const cameraAspect = sxBricks / syBricks;

    var cameraWidth, cameraHeight;
    var cameraScale, cameraY;

    var brickSize;

    var renderFn = {};

    function setCanvas(dom) {
        canvas = dom;
        ctx = canvas.getContext('2d');
    }

    function loadOptions() {
        brickSize = game.options.brick.size;
        cameraWidth = sxBricks * brickSize;
        cameraHeight = syBricks * brickSize;
    }

    function setHeight(height, redraw = true) {
        canvas.height = height;
        canvas.width = cameraAspect * height;
        cameraScale = height / cameraHeight;
        if (redraw) render();
    }

    function setCameraY(y, redraw = false) {
        cameraY = y;
        if (redraw) render();
    }

    function setRenderFn(type, fn) {
        renderFn[type] = fn;
    }

    function callRenderFn(type, ...arg) {
        var fn = renderFn[type];
        if (typeof fn !== 'function') return;
        fn.apply(null, arg);
    }

    function orientedRect(xf, x, y, width, height) {
        var left = x - width / 2;
        var top = y - height / 2;
        var right = x + width / 2;
        var bottom = y + height / 2;
        var points = [
            new b2Vec2(left, top),
            new b2Vec2(right, top),
            new b2Vec2(right, bottom),
            new b2Vec2(left, bottom)
        ].map((v) => b2Math.MulX(xf, v));
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 4; ++i) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[0].x, points[0].y);
    }

    function initRenderFn() {
        setRenderFn('six', (body) => {
            var xf = body.GetTransform();
            var poly = body.GetFixtureList().GetShape();
            var cnt = poly.GetVertexCount();
            var vec = poly.GetVertices();
            var points = vec.map((v) => b2Math.MulX(xf, v));
            ctx.fillStyle = 'hsl(210, 80%, 70%)';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < cnt; ++i) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            ctx.fill();
        });
        const borderDir = {
            top:    [ 0, -1],
            right:  [ 1,  0],
            bottom: [ 0,  1],
            left:   [-1,  0]
        };
        setRenderFn('brick', (body, { color }) => {

            var xf = body.GetTransform();

            ctx.fillStyle = color.background;
            for (let fix = body.GetFixtureList(); fix; fix = fix.GetNext()) {
                var data = fix.GetUserData();
                var centerX = data.x * brickSize;
                var centerY = data.y * brickSize;
                
                ctx.beginPath();
                orientedRect(xf, centerX, centerY, brickSize * 1.02, brickSize * 1.02);
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = color.border;
            for (let fix = body.GetFixtureList(); fix; fix = fix.GetNext()) {
                var data = fix.GetUserData();
                var centerX = data.x * brickSize;
                var centerY = data.y * brickSize;
                var borderWidth = 0.1 * brickSize;
                var borderOffset = (brickSize - borderWidth) / 2;

                data.border.forEach((d) => {
                    var [dx, dy] = borderDir[d];
                    var x = centerX + dx * borderOffset;
                    var y = centerY + dy * borderOffset;
                    var w = dx ? borderWidth : brickSize * 1.02;
                    var h = dy ? borderWidth : brickSize * 1.02;
                    ctx.beginPath();
                    orientedRect(xf, x, y, w, h);
                    ctx.closePath();
                    ctx.fill();
                });
            }
            /*
            sub.forEach((node) => {
                var centerX = node.x * brickSize;
                var centerY = node.y * brickSize;
                var vec = [];
                var points = vec.map((v) => b2Math.MulX(xf, v));
                ctx.fillStyle = color.background;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; ++i) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                ctx.fill();
            });
            */
        });
        setRenderFn('flat', (body) => {
            var { x, y } = body.GetPosition();
            var { width, height } = game.options.flat;
            ctx.fillStyle = '#666';
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
        });
    }

    function renderBodies() {
        var world = simulator.world;
        for (var body = world.GetBodyList(); body; body = body.GetNext()) {
            if (body === world.GetGroundBody()) continue;
            var data = body.GetUserData();
            if (!data || !data.type) continue;
            callRenderFn(data.type, body, data);
        }
    }

    function render() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        ctx.scale(cameraScale, cameraScale);
        ctx.translate(cameraWidth / 2, cameraHeight / 3 - cameraY);

        renderBodies();

        ctx.restore();
    }

    function toWorldPos(x, y) {
        return {
            x: x / cameraScale - cameraWidth / 2,
            y: y / cameraScale - cameraHeight / 3 + cameraY
        };
    }
    
    return {
        setCanvas, loadOptions, setHeight,
        initRenderFn,
        setCameraY,
        render,
        toWorldPos
    };

})();
